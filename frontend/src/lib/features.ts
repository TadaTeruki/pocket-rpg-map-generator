import { tileToBBOX, type Tile } from '@mapbox/tilebelt';
import { Bounds } from './geometry/bounds';
import { Coordinates } from './geometry/coordinates';
import { TileXYZ } from './tilecoords';
import { geojson } from 'flatgeobuf';
import type { Config } from './config';

export class PointFeature {
	coordinates: Coordinates;
	name: string;

	constructor(coordinates: Coordinates, name: string) {
		this.coordinates = coordinates;
		this.name = name;
	}
}

export function pointFeaturesFromGeoJson(features: Object[]): PointFeature[] {
	return features.map((feature: any) => {
		return new PointFeature(
			new Coordinates(feature.geometry.coordinates[1], feature.geometry.coordinates[0]),
			feature.properties.name
		);
	});
}

export class Place {
	coordinates: Coordinates;
	name: string;
	category: 'city' | 'town' | 'dummy';

	constructor(coordinates: Coordinates, name: string, category: 'city' | 'town' | 'dummy') {
		this.coordinates = coordinates;
		this.name = name;
		this.category = category;
	}
}

export async function loadFeatures(
	urls: string[],
	tile_xyzs: TileXYZ[],
	bounds: Bounds,
	existing_names: Set<string>,
	existing_coordinates: Coordinates[],
	config: Config
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
				const meshID = bounds.meshID(feature.coordinates);
				if (meshID === undefined) {
					return false;
				}
				if (meshID_set.has(meshID)) {
					return false;
				} else {
					meshID_set.add(meshID);
					return true;
				}
			});

			// keep margins between features
			const margined_features = unique_meshID_features.filter((feature) => {
				const mesh_width_lng = bounds.meshNormalLng();
				const mesh_width_lat = bounds.meshNormalLat();

				for (let coord of coordinates) {
					if (
						Math.abs(coord.lng - feature.coordinates.lng) <
							mesh_width_lng * config.feature_margin01 &&
						Math.abs(coord.lat - feature.coordinates.lat) < mesh_width_lat * config.feature_margin01
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
export async function loadPlaces(
	tile_xyzs: TileXYZ[],
	config: Config,
	bounds: Bounds,
	currentZoom: number
): Promise<Place[]> {
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
	let features_D: PointFeature[] = [];

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
				existing_coordinates,
				config
			);
		} else if (i == 1) {
			feature_layers = await loadFeatures(
				[urls[3]],
				tile_xyzs,
				bounds,
				existing_names,
				existing_coordinates,
				config
			);
		} else if (i == 2 && currentZoom >= config.zoom_level_detailed) {
			feature_layers = await loadFeatures(
				[urls[4]],
				tile_xyzs,
				bounds,
				existing_names,
				existing_coordinates,
				config
			);
		}

		for (let layer = 0; layer < feature_layers.length; layer++) {
			features = features.concat(feature_layers[layer]);
			if (features_C.length == 0 && features.length >= config.num_C * config.extract_margin_scale) {
				let indices = Array.from({ length: features.length }, (_, i) => i);
				indices = shuffle(indices);
				let new_features: PointFeature[] = [];

				for (let i = 0; i < features.length; i++) {
					if (i < config.num_C) {
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
				features.length >= config.num_T * config.extract_margin_scale
			) {
				let indices = Array.from({ length: features.length }, (_, i) => i);
				indices = shuffle(indices);
				let new_features: PointFeature[] = [];
				for (let i = 0; i < features.length; i++) {
					if (i < config.num_T) {
						features_T.push(features[indices[i]]);
					} else {
						new_features.push(features[indices[i]]);
					}
				}

				features = new_features;
			}

			if (
				features_T.length > 0 &&
				features_D.length == 0 &&
				features.length >= config.num_D * config.extract_margin_scale
			) {
				let indices = Array.from({ length: features.length }, (_, i) => i);
				indices = shuffle(indices);
				let indices_apply = indices.slice(0, config.num_D);
				for (let index of indices_apply) {
					features_D.push(features[index]);
				}
			}

			if (features_D.length > 0) {
				break;
			}
		}
		if (features_D.length > 0) {
			break;
		}
	}

	const places_C = features_C.map((feature) => {
		return new Place(feature.coordinates, feature.name, 'city');
	});

	const places_T = features_T.map((feature) => {
		return new Place(feature.coordinates, feature.name, 'town');
	});

	const places_D = features_D.map((feature) => {
		return new Place(feature.coordinates, feature.name, 'dummy');
	});

	return places_C.concat(places_T).concat(places_D);
}
