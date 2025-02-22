<script lang="ts">
	import { onMount } from 'svelte';
	import maplibre from 'maplibre-gl';
	import { getTileCoordsInBounds } from './tilecoords';
	import { createNetwork, createPathsFromNetwork } from './model';
	import { loadDefaultConfig, meshFromConfig } from './config';
	import { loadPlaces, Place } from './features';
	import { createMarker } from './marker';
	import { loadMapStyle } from './style';
	import { Bounds } from './geometry/bounds';
	import { Coordinates } from './geometry/coordinates';

	export let center = [138.727, 38.362];
	export let mapId;
	export let mode: 'view' | 'edit';
	export let place_chosen: Place | undefined;
	export let show_place_name = true;
	export let error_message: string | undefined;

	let map: maplibre.Map;

	const default_config = loadDefaultConfig();
	let cursor_bounds = new Bounds(0, 0, 0, 0);

	let placeArchives = new Map<string, [maplibre.Marker[], Place]>();

	$: if (show_place_name) {
		for (const [markers, _] of placeArchives.values()) {
			markers[1].getElement().style.display = 'block';
		}
	} else {
		for (const [markers, _] of placeArchives.values()) {
			markers[1].getElement().style.display = 'none';
		}
	}

	async function createNew(bounds: Bounds, zoom: number) {
		error_message = undefined;
		place_chosen = undefined;
		const mesh = meshFromConfig(default_config, bounds);

		const currentZoom = Math.floor(zoom);

		const tiles = getTileCoordsInBounds(bounds, currentZoom);
		const places = await loadPlaces(tiles, default_config, mesh, currentZoom);

		if (places.length === 0) {
			error_message = '対応していない地域です';
			return;
		}

		places.forEach((place) => {
			if (place.category == 'dummy') {
				return;
			}

			if (placeArchives.has(place.id)) {
				const archive = placeArchives.get(place.id);
				if (archive) {
					const prev_place = archive[1];
					if (place.position < prev_place.position) {
						// apply place
						archive[0].forEach((marker) => {
							marker.remove();
						});
						placeArchives.delete(place.id);
					} else {
						return;
					}
				}
			}

			let markers = createMarker(place);
			markers.icon.addEventListener('mousemove', () => {
				place_chosen = place;
			});

			const marker_icon = new maplibre.Marker({ element: markers.icon })
				.setLngLat([place.coordinates.lng, place.coordinates.lat] as [number, number])
				.addTo(map);

			const marker_name = new maplibre.Marker({ element: markers.name })
				.setLngLat([place.coordinates.lng, place.coordinates.lat] as [number, number])
				.addTo(map);

			marker_name.getElement().style.display = show_place_name ? 'block' : 'none';

			placeArchives.set(place.id, [[marker_icon, marker_name], place]);
		});

		const network = createNetwork(places, mesh, default_config);
		const paths = createPathsFromNetwork(places, network);
		const unique_str = Math.random().toString(36).slice(-8);

		paths.forEach((path, i) => {
			const from_coords = path.line.start;
			const to_coords = path.line.end;
			const from = path.segment[0];
			const to = path.segment[1];

			// create geojson object for line
			const line = {
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: [
						[from_coords.lng, from_coords.lat] as [number, number],
						[to_coords.lng, to_coords.lat] as [number, number]
					]
				},
				properties: {}
			};

			// add line to map
			map.addSource(`line-source-${unique_str}-${from}-${to}-${i}`, {
				type: 'geojson',
				data: line as any
			});

			map.addLayer({
				id: `line-${unique_str}-${from}-${to}-${i}`,
				type: 'line',
				source: `line-source-${unique_str}-${from}-${to}-${i}`,
				layout: {
					'line-join': 'round',
					'line-cap': 'round'
				},
				paint: {
					'line-color': '#fecc60',
					'line-width': 10
				}
			});
		});
	}

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

	onMount(() => {
		map = new maplibre.Map({
			container: mapId,
			style: loadMapStyle(),
			center: [center[0], center[1]],
			zoom: 5,
			minZoom: 4
		});
		map.on('click', () => {
			if (mode === 'edit') {
				createNew(cursor_bounds, map.getZoom());
				mode = 'view';
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
