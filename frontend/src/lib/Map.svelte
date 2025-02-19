<script lang="ts">
	import { onMount } from 'svelte';
	import maplibre from 'maplibre-gl';
	import { geojson } from 'flatgeobuf';
	import { tileToBBOX, type Tile } from '@mapbox/tilebelt';
	import { Bounds, Coordinates, getTileCoordsInBounds, TileXYZ } from './tilecoords';
	import { PointFeature, pointFeaturesFromGeoJson } from './model';
	export let center = [138.727, 38.362];
	export let mapId;

	let map: maplibre.Map;
	const meshsize = 6;
	const feature_margin01 = 0.25;
	const zoom_level_detailed = 7;

	async function loadFeatures(
		urls: string[],
		tile_xyzs: TileXYZ[],
		bounds: Bounds,
		existing_names: Set<string>,
		existing_coordinates: Coordinates[]
	) {
		const features_all = Promise.all(
			urls.map(async (url, i) => {
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
					const valid_name_features = features.flat().filter((feature) => {
						return !existing_names.has(feature.name);
					});
					return {
						features: valid_name_features,
						index: i
					};
				});
			})
		).then((result) => {
			let feature_layers = result
				.sort((a, b) => {
					return a.index - b.index;
				})
				.map((result) => result.features);

			let name_set = new Set();
			let meshID_set = new Set();

			let coordinates: Coordinates[] = existing_coordinates;

			for (let i = 0; i < feature_layers.length; i++) {
				// avoid duplicate names
				const unique_name_features = feature_layers[i].filter((feature) => {
					if (name_set.has(feature.name)) {
						return false;
					} else {
						name_set.add(feature.name);
						return true;
					}
				});

				// avoid duplicate meshIDs
				const unique_meshID_features = unique_name_features.filter((feature) => {
					const meshID = bounds.meshID(feature.coordinates, meshsize);
					if (meshID_set.has(meshID)) {
						return false;
					} else {
						meshID_set.add(meshID);
						return true;
					}
				});

				// keep margins between features
				const margined_features = unique_meshID_features.filter((feature) => {
					const meshWidth = bounds.meshNormalWidth(meshsize);
					const meshHeight = bounds.meshNormalHeight(meshsize);

					for (let coord of coordinates) {
						if (
							Math.abs(coord.lng - feature.coordinates.lng) < meshWidth * feature_margin01 &&
							Math.abs(coord.lat - feature.coordinates.lat) < meshHeight * feature_margin01
						) {
							return false;
						}
					}

					coordinates.push(feature.coordinates);
					return true;
				});

				feature_layers[i] = margined_features;
			}

			return feature_layers;
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

	// returns features as cities, features as towns
	async function loadPlaces(
		tile_xyzs: TileXYZ[],
		num_C: number,
		num_T: number,
		extract_margin_scale: number,
		bounds: Bounds,
		currentZoom: number
	): Promise<[PointFeature[], PointFeature[]]> {
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

		let features: PointFeature[] = [];

		for (let i = 0; i < 3; i++) {
			let feature_layers: PointFeature[][] = [];
			const existing_names = new Set(features_C.map((feature) => feature.name));
			const existing_coordinates = features_C.map((feature) => feature.coordinates);
			if (i == 0) {
				feature_layers = await loadFeatures(
					urls.slice(0, 3),
					tile_xyzs,
					bounds,
					existing_names,
					existing_coordinates
				);
			} else if (i == 1) {
				feature_layers = await loadFeatures(
					[urls[3]],
					tile_xyzs,
					bounds,
					existing_names,
					existing_coordinates
				);
			} else if (i == 2 && currentZoom >= zoom_level_detailed) {
				feature_layers = await loadFeatures(
					[urls[4]],
					tile_xyzs,
					bounds,
					existing_names,
					existing_coordinates
				);
			}

			for (let layer = 0; layer < feature_layers.length; layer++) {
				features = features.concat(feature_layers[layer]);
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
			zoom: 5,
			minZoom: 4
		});

		map.on('click', async () => {
			const bounds_maplibre = map.getBounds();
			const bounds = new Bounds(
				bounds_maplibre.getWest(),
				bounds_maplibre.getSouth(),
				bounds_maplibre.getEast(),
				bounds_maplibre.getNorth()
			).shrink(0.1);
			const currentZoom = Math.floor(map.getZoom());

			const tiles = getTileCoordsInBounds(bounds, currentZoom);
			const [features_C, features_T] = await loadPlaces(
				tiles,
				meshsize,
				meshsize,
				1,
				bounds,
				currentZoom
			);
			console.log(
				'names_C',
				features_C.map((feature) => feature.name)
			);
			console.log(
				'names_T',
				features_T.map((feature) => feature.name)
			);

			features_C.forEach((feature) => {
				new maplibre.Marker({
					color: 'red'
				})
					.setLngLat([feature.coordinates.lng, feature.coordinates.lat] as [number, number])
					.addTo(map);
			});

			features_T.forEach((feature) => {
				new maplibre.Marker({
					color: 'blue'
				})
					.setLngLat([feature.coordinates.lng, feature.coordinates.lat] as [number, number])
					.addTo(map);
			});
		});
	});
</script>

<svelte:head>
	<link href="https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css" rel="stylesheet" />
</svelte:head>

<div id={mapId}></div>
