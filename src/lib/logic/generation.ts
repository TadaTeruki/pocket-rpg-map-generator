import { meshFromConfig, type Config } from '$lib/config';
import { Bounds } from '$lib/geometry/bounds';
import { getTileCoordsInBounds } from '$lib/geometry/tilecoords';
import { loadPlaces, Place } from '$lib/mapcontent/features';
import { createMarker } from '$lib/mapcontent/marker';
import maplibre from 'maplibre-gl';
import { createNetwork, createPathsFromNetwork, type Path } from './network';
import type { MarkerOwnerTable } from '$lib/mapcontent/markerowner';

export type GenerationResult = {
	id: string;
	result: 'success' | 'error';
	error_message: string;
	places: Place[];
	paths: Path[];
	marker_levels: number[];
	markers_icon: maplibre.Marker[];
	markers_name: maplibre.Marker[];
	lines_geojson: Object[];
};

export function getGenerationID(bounds: Bounds, zoom: number): string {
	return `${bounds.sw.lng}-${bounds.sw.lat}-${bounds.ne.lng}-${bounds.ne.lat}-${zoom}`;
}

export function parseGenerationID(id: string): [Bounds, number] {
	const [west, south, east, north, zoom] = id.split('-').map(Number);
	return [new Bounds(west, south, east, north), zoom];
}

export async function generateFromID(id: string, config: Config): Promise<GenerationResult> {
	const [bounds, zoom] = parseGenerationID(id);
	return generate(bounds, zoom, config);
}

export async function generate(
	bounds: Bounds,
	zoom: number,
	config: Config
): Promise<GenerationResult> {
	const id = getGenerationID(bounds, zoom);

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
			marker_levels: [],
			paths: [],
			markers_icon: [],
			markers_name: [],
			lines_geojson: []
		};
	}

	let marker_levels: number[] = [];
	let markers_icon: maplibre.Marker[] = [];
	let markers_name: maplibre.Marker[] = [];

	places.forEach((place) => {
		if (place.category == 'dummy') {
			return;
		}

		let markers = createMarker(place);

		const marker_icon = new maplibre.Marker({ element: markers.icon }).setLngLat([
			place.coordinates.lng,
			place.coordinates.lat
		] as [number, number]);

		const marker_name = new maplibre.Marker({ element: markers.name }).setLngLat([
			place.coordinates.lng,
			place.coordinates.lat
		] as [number, number]);

		marker_levels.push(markers.level);
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
	});

	return {
		id: id,
		result: 'success',
		error_message: '',
		places: places,
		paths: paths,
		marker_levels: marker_levels,
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
	marker_owner_table: MarkerOwnerTable,
	active: boolean
) {
	if (result.result !== 'success') {
		return;
	}
	result.markers_icon.forEach((marker, i) => {
		const place_id = result.places[i].id;

		if (marker_owner_table.get(place_id) != result.id) {
			if (marker._map) {
				marker.remove();
			}
			return;
		}

		if (active && !marker._map) {
			marker.addTo(map);
		}

		if (!active && marker._map) {
			marker.remove();
		}
	});

	result.markers_name.forEach((marker, i) => {
		const place_id = result.places[i].id;

		if (marker_owner_table.get(place_id) != result.id) {
			if (marker._map) {
				marker.remove();
			}
			return;
		}

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

export function togglePlaceNameVisibility(result: GenerationResult, visible: boolean) {
	if (result.result !== 'success') {
		return;
	}
	result.markers_name.forEach((marker) => {
		marker.getElement().style.display = visible ? 'block' : 'none';
	});
}
