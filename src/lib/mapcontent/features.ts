import { tileToBBOX, type Tile } from '@mapbox/tilebelt';
import { Mesh } from '../geometry/bounds';
import { Coordinates } from '../geometry/coordinates';
import { TileXYZ } from '../geometry/tilecoords';
import { geojson } from 'flatgeobuf';
import type { Config } from '../config';
import { SeedableRng } from '$lib/logic/seedablelng';

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

function hiragana2katakana(str: string): string {
	return str.replace(/[\u3041-\u3096]/g, function (match) {
		var chr = match.charCodeAt(0) + 0x60;
		return String.fromCharCode(chr);
	});
}

export class Place {
	coordinates: Coordinates;
	id: string;
	name: string;
	name_display: string;
	category: 'city' | 'town' | 'dummy';
	position: number;

	constructor(
		coordinates: Coordinates,
		name: string,
		category: 'city' | 'town' | 'dummy',
		position: number
	) {
		this.coordinates = coordinates;
		this.name = name;
		this.id = name + coordinates.simplify().toString();
		this.category = category;
		this.position = position;
		this.name_display = hiragana2katakana(name) + (category == 'city' ? 'シティ' : 'タウン');
	}

	nameHash(): number {
		let hash = 0;
		for (let i = 0; i < this.name.length; i++) {
			hash = (hash << 5) - hash + this.name.charCodeAt(i);
			hash |= 0;
		}
		return hash;
	}
}

export async function loadFeatures(
	urls: string[],
	tile_xyzs: TileXYZ[],
	mesh: Mesh,
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
			}).catch((e) => {
				console.log(e);
				return {
					features: [],
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
				const meshID = mesh.meshID(feature.coordinates);
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

			let margined_features = [];

			for (let feature of unique_meshID_features) {
				const mesh_width_lng = mesh.meshNormalLng();
				const mesh_width_lat = mesh.meshNormalLat();

				let is_margin = true;
				for (let coord of existing_coordinates) {
					if (
						Math.abs(coord.lng - feature.coordinates.lng) <
							mesh_width_lng * config.feature_margin01 &&
						Math.abs(coord.lat - feature.coordinates.lat) < mesh_width_lat * config.feature_margin01
					) {
						is_margin = false;
						break;
					}
				}

				if (is_margin) {
					existing_coordinates.push(feature.coordinates);
					margined_features.push(feature);
				}
			}

			feature_layers[i] = margined_features;
		}

		return feature_layers;
	}).catch((e) => {
		console.log(e);
		return [];
	});

	return features_all;
}

function shuffle(array: number[], rng: SeedableRng): number[] {
	let currentIndex = array.length,
		randomIndex;

	while (currentIndex != 0) {
		randomIndex = Math.floor(rng.next() * currentIndex);
		currentIndex--;

		[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
	}

	return array;
}

// returns features as cities, features as towns
export async function loadPlaces(
	tile_xyzs: TileXYZ[],
	config: Config,
	mesh: Mesh,
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

	let rng = new SeedableRng(mesh.bounds.toHash());

	for (let i = 0; i < 3; i++) {
		let feature_layers: PointFeature[][] = [];
		const existing_names = new Set(
			features_C.map((feature) => feature.name).concat(features_T.map((feature) => feature.name))
		);
		const existing_coordinates = features_C
			.map((feature) => feature.coordinates)
			.concat(features_T.map((feature) => feature.coordinates));
		if (i == 0) {
			feature_layers = await loadFeatures(
				urls.slice(0, 3),
				tile_xyzs,
				mesh,
				existing_names,
				existing_coordinates,
				config
			);
		} else if (i == 1) {
			feature_layers = await loadFeatures(
				[urls[3]],
				tile_xyzs,
				mesh,
				existing_names,
				existing_coordinates,
				config
			);
		} else if (i == 2 && currentZoom >= config.zoom_level_detailed) {
			feature_layers = await loadFeatures(
				[urls[4]],
				tile_xyzs,
				mesh,
				existing_names,
				existing_coordinates,
				config
			);
		} else {
			break;
		}

		for (let layer = 0; layer < feature_layers.length; layer++) {
			features = features.concat(feature_layers[layer]);
			if (features_C.length == 0 && features.length >= config.num_C * config.extract_margin_scale) {
				let indices = Array.from({ length: features.length }, (_, i) => i);
				indices = shuffle(indices, rng);
				let indices_apply = indices.slice(0, config.num_C);
				for (let index of indices_apply) {
					features_C.push(features[index]);
				}
				features = features.filter((_, i) => !indices_apply.includes(i));
			}

			if (
				features_C.length > 0 &&
				features_T.length == 0 &&
				features.length >= config.num_T * config.extract_margin_scale
			) {
				let indices = Array.from({ length: features.length }, (_, i) => i);
				indices = shuffle(indices, rng);
				let indices_apply = indices.slice(0, config.num_T);
				for (let index of indices_apply) {
					features_T.push(features[index]);
				}
				features = features.filter((_, i) => !indices_apply.includes(i));
			}

			if (
				features_T.length > 0 &&
				features_D.length == 0 &&
				features.length >= config.num_D * config.extract_margin_scale
			) {
				let indices = Array.from({ length: features.length }, (_, i) => i);
				indices = shuffle(indices, rng);
				let indices_apply = indices.slice(0, config.num_D);
				for (let index of indices_apply) {
					features_D.push(features[index]);
				}
				features = features.filter((_, i) => !indices_apply.includes(i));
			}

			if (features_D.length > 0) {
				break;
			}
		}
		if (features_D.length > 0) {
			break;
		}
	}

	// if features_T is empty, fill it with features from features_C
	if (features_T.length == 0) {
		let indices = Array.from({ length: features_C.length }, (_, i) => i);
		indices = shuffle(indices, rng);
		let indices_apply = indices.slice(0, config.num_C / 2);
		for (let index of indices_apply) {
			features_T.push(features_C[index]);
		}
		features_C = features_C.filter((_, i) => !indices_apply.includes(i));
	}

	const places_C = features_C.map((feature, i) => {
		return new Place(feature.coordinates, feature.name, 'city', i / config.num_C);
	});

	const places_T = features_T.map((feature, i) => {
		return new Place(feature.coordinates, feature.name, 'town', i / config.num_T);
	});

	const places_D = features_D.map((feature, i) => {
		return new Place(feature.coordinates, feature.name, 'dummy', i / config.num_D);
	});

	return places_C.concat(places_T).concat(places_D);
}
