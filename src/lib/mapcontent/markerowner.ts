import type { GenerationResult } from '$lib/logic/generation';

export type MarkerOwnerTable = Map<string, string>;

export function createMarkerOwnerTable(
	generation_result_map: Map<string, GenerationResult>
): MarkerOwnerTable {
	// place_id -> [generation_id, position]
	let places_duplications: Map<string, [string, number][]> = new Map();
	generation_result_map.forEach((result, id) => {
		result.places.forEach((place, i) => {
			if (!places_duplications.has(place.id)) {
				places_duplications.set(place.id, []);
			}
			places_duplications.get(place.id)!.push([id, result.marker_levels[i]]);
		});
	});

	places_duplications.forEach((duplications) => {
		duplications.sort((a, b) => a[1] - b[1]);
	});

	// place_id -> generation_id (which generation result owns the place?)
	let places_owner: Map<string, string> = new Map();
	places_duplications.forEach((duplications, place_id) => {
		const [generation_id, _] = duplications[0];
		places_owner.set(place_id, generation_id);
	});

	return places_owner;
}
