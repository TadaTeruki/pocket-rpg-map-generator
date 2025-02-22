<script lang="ts">
	import { onMount } from 'svelte';
	import maplibre from 'maplibre-gl';
	import { getTileCoordsInBounds } from './tilecoords';
	import { createNetwork, createPathsFromNetwork } from './model';
	import { loadDefaultConfig, meshFromConfig } from './config';
	import { loadPlaces } from './features';
	import { createMarker } from './marker';
	import { loadMapStyle } from './style';
	import { Bounds } from './geometry/bounds';
	import { Coordinates } from './geometry/coordinates';

	export let center = [138.727, 38.362];
	export let mapId;

	let map: maplibre.Map;

	const default_config = loadDefaultConfig();
	let cursor_bounds = new Bounds(0, 0, 0, 0);

	async function onClick() {
		const mesh = meshFromConfig(default_config, cursor_bounds);

		const currentZoom = Math.floor(map.getZoom());

		const tiles = getTileCoordsInBounds(cursor_bounds, currentZoom);
		const places = await loadPlaces(tiles, default_config, mesh, currentZoom);

		places.forEach((place) => {
			if (place.category == 'dummy') {
				return;
			}
			// add marker to map
			new maplibre.Marker({ element: createMarker(place) })
				.setLngLat([place.coordinates.lng, place.coordinates.lat] as [number, number])
				.addTo(map);
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

	onMount(() => {
		map = new maplibre.Map({
			container: mapId,
			style: loadMapStyle(),
			center: [center[0], center[1]],
			zoom: 5,
			minZoom: 4
		});
		map.on('click', onClick);
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
			map.addLayer({
				id: 'bound-layer',
				// stroke line
				type: 'line',
				source: 'bound-source',
				paint: {
					'line-color': '#ff0000',
					'line-width': 5
				}
			});
		});
	});
</script>

<svelte:head>
	<link href="https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css" rel="stylesheet" />
</svelte:head>

<div id={mapId}></div>
