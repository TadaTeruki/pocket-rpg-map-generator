import { meshFromConfig, type Config } from '$lib/config';
import type { Bounds } from '$lib/geometry/bounds';
import { getTileCoordsInBounds } from '$lib/geometry/tilecoords';
import { loadPlaces, Place } from '$lib/mapcontent/features';
import { createMarker } from '$lib/mapcontent/marker';
import maplibre from 'maplibre-gl';
import { createNetwork, createPathsFromNetwork, type Path } from './network';

export type GenerationResult = {
	id: string;
	result: 'success' | 'error';
	error_message: string;
	places: Place[];
	paths: Path[];
	markers_icon: maplibre.Marker[];
	markers_name: maplibre.Marker[];
	lines_geojson: Object[];
};

function unique_ID_from_bounds_and_zoom(bounds: Bounds, zoom: number): string {
	return `${bounds.sw.lng}-${bounds.sw.lat}-${bounds.ne.lng}-${bounds.ne.lat}-${zoom}`;
}

export async function generate(
	bounds: Bounds,
	zoom: number,
	config: Config
): Promise<GenerationResult> {
	const id = unique_ID_from_bounds_and_zoom(bounds, zoom);

	const mesh = meshFromConfig(config, bounds);

	const currentZoom = Math.floor(zoom);

	const tiles = getTileCoordsInBounds(bounds, currentZoom);
	const places = await loadPlaces(tiles, config, mesh, currentZoom);

	if (places.length === 0) {
		return {
			id: id,
			result: 'error',
			error_message: '対応していない地域です',
			places: [],
			paths: [],
			markers_icon: [],
			markers_name: [],
			lines_geojson: []
		};
	}

	let markers_icon: maplibre.Marker[] = [];
	let markers_name: maplibre.Marker[] = [];

	places.forEach((place) => {
		if (place.category == 'dummy') {
			return;
		}

		// if (placeArchives.has(place.id)) {
		//     const archive = placeArchives.get(place.id);
		//     if (archive) {
		//         const prev_place = archive[1];
		//         if (place.position < prev_place.position) {
		//             // apply place
		//             archive[0].forEach((marker) => {
		//                 marker.remove();
		//             });
		//             placeArchives.delete(place.id);
		//         } else {
		//             return;
		//         }
		//     }
		// }

		let markers = createMarker(place);
		// markers.icon.addEventListener('mousemove', () => {
		//     place_chosen = place;
		// });

		const marker_icon = new maplibre.Marker({ element: markers.icon }).setLngLat([
			place.coordinates.lng,
			place.coordinates.lat
		] as [number, number]);

		const marker_name = new maplibre.Marker({ element: markers.name }).setLngLat([
			place.coordinates.lng,
			place.coordinates.lat
		] as [number, number]);

		//placeArchives.set(place.id, [[marker_icon, marker_name], place]);
		markers_icon.push(marker_icon);
		markers_name.push(marker_name);
	});

	const network = createNetwork(places, mesh, config);
	const paths = createPathsFromNetwork(places, network);

	let lines_geojson: Object[] = [];

	paths.forEach((path) => {
		const from_coords = path.line.start;
		const to_coords = path.line.end;

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

		lines_geojson.push(line);

		// add line to map
		// map.addSource(`line-source-${unique_str}-${from}-${to}-${i}`, {
		//     type: 'geojson',
		//     data: line as any
		// });

		// map.addLayer({
		//     id: `line-${unique_str}-${from}-${to}-${i}`,
		//     type: 'line',
		//     source: `line-source-${unique_str}-${from}-${to}-${i}`,
		//     layout: {
		//         'line-join': 'round',
		//         'line-cap': 'round'
		//     },
		//     paint: {
		//         'line-color': '#fecc60',
		//         'line-width': 10
		//     }
		// });
	});

	return {
		id: id,
		result: 'success',
		error_message: '',
		places: places,
		paths: paths,
		markers_icon: markers_icon,
		markers_name: markers_name,
		lines_geojson: lines_geojson
	};
}

export function setIconCallback(result: GenerationResult, icon_callback: (place: Place) => void) {
	result.markers_icon.forEach((marker, i) => {
		marker.getElement().addEventListener('mousemove', () => {
			icon_callback(result.places[i]);
		});
	});
}

export function toggleGenerationResult(
	map: maplibre.Map,
	result: GenerationResult,
	active: boolean
) {
	if (result.result !== 'success') {
		return;
	}
	result.markers_icon.forEach((marker, i) => {
		if (active && !marker._map) {
			marker.addTo(map);
		}

		if (!active && marker._map) {
			marker.remove();
		}
	});

	result.markers_name.forEach((marker) => {
		if (active && !marker._map) {
			marker.addTo(map);
		}

		if (!active && marker._map) {
			marker.remove();
		}
	});

	result.lines_geojson.forEach((line, i) => {
		if (active && !map.getLayer(`line-${result.id}-${i}`)) {
			map.addSource(`line-source-${result.id}-${i}`, {
				type: 'geojson',
				data: line as any
			});

			map.addLayer({
				id: `line-${result.id}-${i}`,
				type: 'line',
				source: `line-source-${result.id}-${i}`,
				layout: {
					'line-join': 'round',
					'line-cap': 'round'
				},
				paint: {
					'line-color': '#fecc60',
					'line-width': 10
				}
			});
		}

		if (!active && map.getLayer(`line-${result.id}-${i}`)) {
			map.removeLayer(`line-${result.id}-${i}`);
			map.removeSource(`line-source-${result.id}-${i}`);
		}
	});
}

// export function activateGenerationResult(map: maplibre.Map, result: GenerationResult) {
//     if (result.result !== 'success') {
//         return;
//     }
//     result.markers_icon.forEach((marker, i) => {
//         marker.addTo(map);
//     });
//     result.markers_name.forEach((marker) => {
//         marker.addTo(map);
//     });
//     result.lines_geojson.forEach((line, i) => {
//         map.addSource(`line-source-${result.id}-${i}`, {
//             type: 'geojson',
//             data: line as any
//         });

//         map.addLayer({
//             id: `line-${result.id}-${i}`,
//             type: 'line',
//             source: `line-source-${result.id}-${i}`,
//             layout: {
//                 'line-join': 'round',
//                 'line-cap': 'round'
//             },
//             paint: {
//                 'line-color': '#fecc60',
//                 'line-width': 10
//             }
//         });
//     });
// }

// export function deactivateGenerationResult(map: maplibre.Map, result: GenerationResult) {
//     if (result.result !== 'success') {
//         return;
//     }
//     result.markers_icon.forEach((marker) => {
//         if (marker._map) {
//             marker.remove();
//         }
//     });
//     result.markers_name.forEach((marker) => {
//         if (marker._map) {
//             marker.remove();
//         }
//     });
//     result.lines_geojson.forEach((_, i) => {
//         if (map.getLayer(`line-${result.id}-${i}`)) {
//             map.removeLayer(`line-${result.id}-${i}`);
//         }
//         if (map.getSource(`line-source-${result.id}-${i}`)) {
//             map.removeSource(`line-source-${result.id}-${i}`);
//         }
//     });
// }

export function updatePlaceNameVisibility(result: GenerationResult, visible: boolean) {
	if (result.result !== 'success') {
		return;
	}
	result.markers_name.forEach((marker) => {
		marker.getElement().style.display = visible ? 'block' : 'none';
	});
}
