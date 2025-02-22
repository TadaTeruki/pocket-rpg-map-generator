<script lang="ts">
	import { onMount } from 'svelte';
	import maplibre from 'maplibre-gl';
	import { Bounds } from './geometry/bounds';
	import { Coordinates } from './geometry/coordinates';
	import { type Place } from './mapcontent/features';
	import { loadMapStyle } from './mapcontent/style';
	import { loadDefaultConfig } from './config';
	import {
		generate,
		setIconCallback,
		toggleGenerationResult,
		togglePlaceNameVisibility,
		type GenerationResult
	} from './logic/generation';
	import { generation_history } from '../store';
	import { createMarkerOwnerTable } from './mapcontent/markerowner';

	export let center = [138.727, 38.362];
	export let mapId;
	export let mode: 'view' | 'edit';
	export let place_chosen: Place | undefined;
	export let show_place_name = true;
	export let error_message: string | undefined;

	let map: maplibre.Map;

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

	$: if (loaded) {
		if (mode === 'edit') {
			if (!map.getLayer('bound-layer')) {
				map.addLayer({
					id: 'bound-layer',
					type: 'line',
					source: 'bound-source',
					paint: {
						'line-color': '#ff5577',
						'line-width': 6
					}
				});
			}
		} else {
			if (map.getLayer('bound-layer')) {
				map.removeLayer('bound-layer');
			}
		}
	}

	generation_history.subscribe((history) => {
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

	onMount(() => {
		map = new maplibre.Map({
			container: mapId,
			style: loadMapStyle(),
			center: [center[0], center[1]],
			zoom: 5,
			minZoom: 4
		});
		map.on('click', async () => {
			error_message = undefined;
			place_chosen = undefined;
			if (mode === 'edit') {
				mode = 'view';
				const result = await generate(cursor_bounds, map.getZoom(), default_config);
				if (result.result === 'error') {
					error_message = result.error_message;
				} else {
					generation_result_map.set(result.id, result);
					setIconCallback(result, (place) => {
						place_chosen = place;
					});
					generation_history.update((history) => {
						history.future_ids().forEach((id) => {
							generation_result_map.delete(id);
						});
						history.push(result.id);
						return history;
					});
				}
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
		});
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
