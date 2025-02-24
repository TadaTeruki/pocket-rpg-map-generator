<script lang="ts">
	import { onMount } from 'svelte';
	import maplibre from 'maplibre-gl';
	import { Bounds } from './geometry/bounds';
	import { Coordinates } from './geometry/coordinates';
	import { loadMapStyle } from './mapcontent/style';
	import { loadDefaultConfig } from './config';
	import {
		generateFromID,
		getGenerationID,
		parseGenerationID,
		setIconCallback,
		toggleGenerationResult,
		togglePlaceNameVisibility,
		type GenerationResult
	} from './logic/generation';
	import { generation_history, place_chosen } from '../store';
	import { createMarkerOwnerTable } from './mapcontent/markerowner';

	export let center = [139.75, 35.77];
	export let mapId;
	export let mode: 'view' | 'edit';
	export let show_place_name = true;
	export let current_url = '';
	export let map: maplibre.Map;

	const default_config = loadDefaultConfig();
	let cursor_bounds = new Bounds(0, 0, 0, 0);

	// generation_id -> GenerationResult
	let generation_result_map: Map<string, GenerationResult> = new Map();

	let bound_feature = {
		type: 'Feature',
		geometry: {
			type: 'Polygon',
			coordinates: [
				[
					[0, 0],
					[0, 0],
					[0, 0],
					[0, 0]
				]
			]
		}
	};

	let loaded = false;

	$: if (loaded && mode === 'view') {
		if (map.getLayer('bound-layer')) {
			map.removeLayer('bound-layer');
		}
	}

	generation_history.subscribe((history) => {
		// history にない generation_result_map の要素を削除
		const keys = Array.from(generation_result_map.keys());
		const all_ids_as_set = new Set(history.all_ids());
		keys.forEach((id) => {
			if (!all_ids_as_set.has(id)) {
				const result = generation_result_map.get(id);
				if (result) {
					toggleGenerationResult(map, result, new Map(), false);
				}
				generation_result_map.delete(id);
			}
		});

		let past_and_present_maps = new Map();
		history.past_and_present_ids().forEach((generation_id) => {
			const result = generation_result_map.get(generation_id);
			if (result) {
				past_and_present_maps.set(generation_id, result);
			}
		});
		const marker_owner_table = createMarkerOwnerTable(past_and_present_maps);

		history.future_ids().forEach((generation_id) => {
			const result = generation_result_map.get(generation_id);
			if (result) {
				toggleGenerationResult(map, result, marker_owner_table, false);
			}
		});

		history.past_and_present_ids().forEach((generation_id) => {
			const result = generation_result_map.get(generation_id);
			if (result) {
				toggleGenerationResult(map, result, marker_owner_table, true);
			}
		});
	});

	$: if (show_place_name !== undefined) {
		generation_history.subscribe((history) => {
			history.all_ids().forEach((id) => {
				const result = generation_result_map.get(id);
				if (result) {
					togglePlaceNameVisibility(result, show_place_name);
				}
			});
		});
	}

	async function register(generation_ids: string[]) {
		const results = Promise.all(
			generation_ids.map((id) => {
				return generateFromID(id, default_config);
			})
		);

		place_chosen.set('生成中...');

		results.then((results) => {
			place_chosen.set('');
			let new_ids: string[] = [];
			results.forEach((result) => {
				if (result.result === 'error') {
					place_chosen.set(result.error_message);
				} else {
					generation_result_map.set(result.id, result);
					setIconCallback(result, (place) => {
						place_chosen.set(place);
					});
					new_ids.push(result.id);
				}
			});

			generation_history.update((history) => {
				history.future_ids().forEach((id) => {
					generation_result_map.delete(id);
				});
				new_ids.forEach((id) => {
					history.push(id);
				});
				return history;
			});

			generation_history.subscribe((history) => {
				const result_id_str = history.serialize();
				const base_url = window.location.href.split('?')[0];
				let url = '';
				if (result_id_str === '') {
					url = base_url;
				} else {
					url = `${base_url}?history=${result_id_str}`;
				}
				current_url = url;
				window.history.replaceState({}, '', url);
			});
		});
	}

	onMount(() => {
		map = new maplibre.Map({
			container: mapId,
			style: loadMapStyle(),
			center: [center[0], center[1]],
			zoom: 7,
			minZoom: 4
		});
		map.on('click', async () => {
			if (mode === 'edit') {
				mode = 'view';
				register([getGenerationID(cursor_bounds, map.getZoom())]);
			}
		});
		map.on('mousemove', (e) => {
			const bounds = map.getBounds();
			const pointer = new Coordinates(e.lngLat.lat, e.lngLat.lng);
			cursor_bounds = new Bounds(
				bounds.getWest(),
				bounds.getSouth(),
				bounds.getEast(),
				bounds.getNorth()
			)
				.moveCenter(pointer)
				.shrink(0.2);

			// update bound feature
			bound_feature.geometry.coordinates = [
				[
					[cursor_bounds.ne.lng, cursor_bounds.ne.lat],
					[cursor_bounds.ne.lng, cursor_bounds.sw.lat],
					[cursor_bounds.sw.lng, cursor_bounds.sw.lat],
					[cursor_bounds.sw.lng, cursor_bounds.ne.lat],
					[cursor_bounds.ne.lng, cursor_bounds.ne.lat]
				]
			];

			let source = map.getSource('bound-source');
			if (source) {
				source.setData(bound_feature as any);
			}

			if (source && mode === 'edit') {
				if (map.getLayer('bound-layer')) {
					map.removeLayer('bound-layer');
				}
				map.addLayer({
					id: 'bound-layer',
					type: 'line',
					source: 'bound-source',
					layout: {},
					paint: {
						'line-color': '#fe4a49',
						'line-width': 5
					}
				});
			}
		});

		// read history from query parameter
		const url = new URL(window.location.href);
		const history_str = url.searchParams.get('history');
		if (history_str) {
			const history = Array.from(new Set(history_str.split(',')));

			let new_bounds: Bounds[] = [];
			let new_zoom = Infinity;
			history.forEach((id) => {
				const [bounds, zoom] = parseGenerationID(id);
				new_bounds.push(bounds);
				new_zoom = Math.min(new_zoom, zoom);
			});
			let new_bound = new_bounds[0];
			for (let i = 1; i < new_bounds.length; i++) {
				new_bound = new_bound.merge(new_bounds[i]);
			}

			if (new_zoom !== Infinity) {
				map.setZoom(new_zoom);
			}
			const center = new_bound.center();
			map.setCenter([center.lng, center.lat]);
			register(history);
			mode = 'view';
		} else {
			mode = 'edit';
		}
		map.on('load', () => {
			map.addSource('bound-source', {
				type: 'geojson',
				data: bound_feature as any
			});

			loaded = true;
		});
	});
</script>

<svelte:head>
	<link href="https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css" rel="stylesheet" />
</svelte:head>

<div id={mapId}></div>
