import { Coordinates } from './tilecoords';

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
	category: 'city' | 'town';

	constructor(coordinates: Coordinates, name: string, category: 'city' | 'town') {
		this.coordinates = coordinates;
		this.name = name;
		this.category = category;
	}
}

class DisjointSet {
	parent: number[];

	constructor(size: number) {
		this.parent = Array.from({ length: size }, (_, i) => i);
	}

	root(i: number): number {
		if (this.parent[i] === i) {
			return i;
		}
		return (this.parent[i] = this.root(this.parent[i]));
	}

	union(i: number, j: number): void {
		this.parent[this.root(i)] = this.root(j);
	}

	connected(i: number, j: number): boolean {
		return this.root(i) === this.root(j);
	}
}

function lineIntersection(
	p0: Coordinates,
	p1: Coordinates,
	p2: Coordinates,
	p3: Coordinates
): Coordinates | undefined {
	const s1_x = p1.lng - p0.lng;
	const s1_y = p1.lat - p0.lat;
	const s2_x = p3.lng - p2.lng;
	const s2_y = p3.lat - p2.lat;

	const s = (-s1_y * (p0.lng - p2.lng) + s1_x * (p0.lat - p2.lat)) / (-s2_x * s1_y + s1_x * s2_y);
	const t = (s2_x * (p0.lat - p2.lat) - s2_y * (p0.lng - p2.lng)) / (-s2_x * s1_y + s1_x * s2_y);

	const x = p0.lng + t * s1_x;
	const y = p0.lat + t * s1_y;

	if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
		return new Coordinates(y, x);
	}

	return undefined;
}

function hasIntersection(
	p0: Coordinates,
	p1: Coordinates,
	p2: Coordinates,
	p3: Coordinates
): boolean {
	if (
		Math.max(p0.lng, p1.lng) < Math.min(p2.lng, p3.lng) ||
		Math.min(p0.lng, p1.lng) > Math.max(p2.lng, p3.lng) ||
		Math.max(p0.lat, p1.lat) < Math.min(p2.lat, p3.lat) ||
		Math.min(p0.lat, p1.lat) > Math.max(p2.lat, p3.lat)
	) {
		return false;
	}

	const intersection = lineIntersection(p0, p1, p2, p3);
	if (intersection === undefined) {
		return false;
	}
	if (intersection.lat === p0.lat && intersection.lng === p0.lng) {
		return false;
	}
	if (intersection.lat === p1.lat && intersection.lng === p1.lng) {
		return false;
	}

	return true;
}

export function createNetwork(
	places: Place[],
	radius_lng: number,
	radius_lat: number
): Map<number, number[]> {
	let network = new Map<number, Set<number>>();
	let disjointSet = new DisjointSet(places.length);

	let paths = [];

	for (let i = 0; i < places.length; i++) {
		for (let j = i + 1; j < places.length; j++) {
			const placeA = places[i];
			const placeB = places[j];
			const distance = Math.hypot(
				placeA.coordinates.lat - placeB.coordinates.lat,
				placeA.coordinates.lng - placeB.coordinates.lng
			);
			paths.push({
				from: i,
				to: j,
				distance: distance
			});
		}
	}

	paths.sort((a, b) => a.distance - b.distance);

	paths.forEach((path) => {
		if (!disjointSet.connected(path.from, path.to)) {
			if (!network.has(path.from)) {
				network.set(path.from, new Set());
			}
			network.get(path.from)!.add(path.to);
			disjointSet.union(path.from, path.to);
		}
	});

	places.forEach((place, i) => {
		// connect others within radius
		places.forEach((otherPlace, j) => {
			if (place === otherPlace) {
				return;
			}

			const distance = Math.hypot(
				place.coordinates.lat - otherPlace.coordinates.lat,
				place.coordinates.lng - otherPlace.coordinates.lng
			);
			if (distance < radius_lat && distance < radius_lng) {
				// check if there is any intersection
				let intersection = false;
				// all connections in network
				network.forEach((tos, from) => {
					tos.forEach((to) => {
						const fromPlace = places[from];
						const toPlace = places[to];
						if (
							hasIntersection(
								place.coordinates,
								otherPlace.coordinates,
								fromPlace.coordinates,
								toPlace.coordinates
							)
						) {
							intersection = true;
						}
					});
				});

				if (intersection) {
					return;
				}

				if (!network.has(i)) {
					network.set(i, new Set());
				}
				network.get(i)!.add(j);
			}
		});
	});

	// convert to array sorter by the distance
	const networkArray = new Map<number, number[]>();
	network.forEach((value, key) => {
		networkArray.set(
			key,
			Array.from(value).sort((a, b) => {
				const placeA = places[a];
				const placeB = places[b];
				return Math.hypot(
					placeA.coordinates.lat - placeB.coordinates.lat,
					placeA.coordinates.lng - placeB.coordinates.lng
				);
			})
		);
	});

	return networkArray;
}
