<script lang="ts">
	import { onMount } from 'svelte';
	import { PMTiles } from 'pmtiles';
	import maplibre from 'maplibre-gl';
	import { geojson } from 'flatgeobuf';
	import { bboxToTile, tileToBBOX, type Tile } from '@mapbox/tilebelt';
	import { getTileCoordsInBounds, TileXYZ } from './tilecoords';
	import { PointFeature, pointFeaturesFromGeoJson } from './model';
	export let zoom = 3.5;
	export let center = [138.727, 38.362];
	export let mapId;

	let map: maplibre.Map;
	let meshsize = 16;

	async function loadFeatures(urls: string[], tile_xyzs: TileXYZ[], except_names: Set<string>) {
		const features_all = Promise.all(
			urls.map(async (url) => {
				return Promise.all(
					tile_xyzs.map(async (tile_xyz) => {
						const tile = [tile_xyz.x, tile_xyz.y, tile_xyz.z] as Tile;
						const tileBbox = tileToBBOX(tile);
						const rect = {
							minX: tileBbox[0],
							minY: tileBbox[1],
							maxX: tileBbox[2],
							maxY: tileBbox[3]
						};

						const iter = geojson.deserialize(url, rect);

						let features = [];

						for await (const feature of iter) {
							features.push(feature);
						}

						return pointFeaturesFromGeoJson(features);
					})
				).then((features) => {
					const flatten = features.flat();
					let name_set = new Set();
					let unique_features = flatten.filter((feature) => {
						if (except_names.has(feature.name)) {
							return false;
						} else if (name_set.has(feature.name)) {
							return false;
						} else {
							name_set.add(feature.name);
							return true;
						}
					});

					return unique_features;
				});
			})
		).then((features) => {
			return features;
		});

		return features_all;
	}

	function shuffle(array: number[]) {
		let currentIndex = array.length,
			randomIndex;

		while (currentIndex != 0) {
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex--;

			[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
		}

		return array;
	}

	async function loadPlaces(
		tile_xyzs: TileXYZ[],
		num_C: number,
		num_T: number,
		extract_margin_scale: number
	) {
		const base_url = window.location.origin;
		const urls = [
			`${base_url}/places_1.fgb`,
			`${base_url}/places_2.fgb`,
			`${base_url}/places_3.fgb`,
			`${base_url}/places_4.fgb`,
			`${base_url}/places_5.fgb`
		];

		let features_C: PointFeature[] = [];
		let features_T: PointFeature[] = [];

		for (let i = 0; i < 3; i++) {
			let feature_layers: PointFeature[][] = [];
			const except_names = new Set(features_C.map((feature) => feature.name));
			if (i == 0) {
				feature_layers = await loadFeatures(urls.slice(0, 3), tile_xyzs, except_names);
			} else if (i == 1) {
				feature_layers = await loadFeatures([urls[3]], tile_xyzs, except_names);
			} else if (i == 2) {
				feature_layers = await loadFeatures([urls[4]], tile_xyzs, except_names);
			}

			for (let layer = 0; layer < feature_layers.length; layer++) {
				let features = feature_layers[layer];
				if (features_C.length == 0 && features.length >= num_C * extract_margin_scale) {
					let indices = Array.from({ length: features.length }, (_, i) => i);
					indices = shuffle(indices);
					let new_features: PointFeature[] = [];

					for (let i = 0; i < features.length; i++) {
						if (i < num_C) {
							features_C.push(features[indices[i]]);
						} else {
							new_features.push(features[indices[i]]);
						}
					}

					features = new_features;
				}

				if (
					features_C.length > 0 &&
					features_T.length == 0 &&
					features.length >= num_T * extract_margin_scale
				) {
					let indices = Array.from({ length: features.length }, (_, i) => i);
					indices = shuffle(indices);
					let indices_apply = indices.slice(0, num_T);
					for (let index of indices_apply) {
						features_T.push(features[index]);
					}
				}

				if (features_T.length > 0) {
					break;
				}
			}
			if (features_T.length > 0) {
				break;
			}
		}

		return [features_C, features_T];
	}

	onMount(() => {
		let style = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
		map = new maplibre.Map({
			container: mapId,
			style: style,
			center: [center[0], center[1]],
			zoom: zoom
		});

		map.on('click', async () => {
			const bounds = map.getBounds();
			const currentZoom = Math.floor(map.getZoom());
			const tiles = getTileCoordsInBounds(bounds, currentZoom);
			const [features_C, features_T] = await loadPlaces(tiles, 3, 10, 1);
			features_C.forEach((feature) => {
				new maplibre.Marker({
					color: 'red'
				})
					.setLngLat([feature.lng, feature.lat] as [number, number])
					.addTo(map);
			});

			features_T.forEach((feature) => {
				new maplibre.Marker({
					color: 'blue'
				})
					.setLngLat([feature.lng, feature.lat] as [number, number])
					.addTo(map);
			});
		});
	});
</script>

<svelte:head>
	<link href="https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css" rel="stylesheet" />
</svelte:head>

<div id={mapId}></div>
