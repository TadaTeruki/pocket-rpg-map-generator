<script lang="ts">
	import { onMount } from 'svelte';
	import maplibre from 'maplibre-gl';
	import { getTileCoordsInBounds } from './tilecoords';
	import { createNetwork, createPathsFromNetwork } from './model';
	import { boundsFromConfig } from './config';
	import { loadPlaces } from './features';

	export let center = [138.727, 38.362];
	export let mapId;

	let map: maplibre.Map;

	const default_config = {
		feature_margin01: 0.2,
		zoom_level_detailed: 6,
		extract_margin_scale: 1.0,
		connection_scale: 1.0,
		num_C: 8,
		num_T: 8,
		num_D: 3
	};

	async function onClick() {
		const bounds_maplibre = map.getBounds();
		const bounds = boundsFromConfig(
			default_config,
			bounds_maplibre.getWest(),
			bounds_maplibre.getSouth(),
			bounds_maplibre.getEast(),
			bounds_maplibre.getNorth()
		);
		const currentZoom = Math.floor(map.getZoom());

		const tiles = getTileCoordsInBounds(bounds, currentZoom);
		const places = await loadPlaces(tiles, default_config, bounds, currentZoom);

		places.forEach((place) => {
			if (place.category == 'dummy') {
				return;
			}
			const el = document.createElement('div');
			el.className = 'marker';
			el.style.backgroundColor = place.category == 'city' ? 'red' : 'blue';
			el.style.width = `25px`;
			el.style.height = `25px`;
			el.style.borderRadius = '20%';

			// add marker to map
			new maplibre.Marker({ element: el })
				.setLngLat([place.coordinates.lng, place.coordinates.lat] as [number, number])
				.addTo(map);
		});

		const network = createNetwork(places, bounds, default_config);
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

	onMount(() => {
		let style = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
		map = new maplibre.Map({
			container: mapId,
			style: style,
			center: [center[0], center[1]],
			zoom: 5,
			minZoom: 4
		});

		map.on('click', onClick);
	});
</script>

<svelte:head>
	<link href="https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css" rel="stylesheet" />
</svelte:head>

<div id={mapId}></div>
