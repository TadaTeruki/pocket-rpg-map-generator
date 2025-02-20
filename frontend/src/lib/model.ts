import { Coordinates } from './geometry/coordinates';
import { LineSegment } from './geometry/line';

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

export function createNetwork(
	places: Place[],
	radius_lng: number,
	radius_lat: number
): Map<number, number[]> {
	let network = new Map<number, Set<number>>();
	let disjoint_set = new DisjointSet(places.length);

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
		if (!disjoint_set.connected(path.from, path.to)) {
			if (!network.has(path.from)) {
				network.set(path.from, new Set());
			}
			network.get(path.from)!.add(path.to);
			disjoint_set.union(path.from, path.to);
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
				let intersected = false;
				// all connections in network
				network.forEach((tos, from) => {
					tos.forEach((to) => {
						const line1 = new LineSegment(place.coordinates, otherPlace.coordinates);
						const line2 = new LineSegment(places[from].coordinates, places[to].coordinates);
						const intersection = line1.intersection(line2);
						if (intersection instanceof Coordinates) {
							if (
								!intersection.isSame(place.coordinates) &&
								!intersection.isSame(otherPlace.coordinates) &&
								!intersection.isSame(places[from].coordinates) &&
								!intersection.isSame(places[to].coordinates)
							) {
								intersected = true;
							}
						}

						if (intersection instanceof LineSegment) {
							intersected = true;
						}
					});
				});

				if (intersected) {
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

export type Path = {
	line: LineSegment;
	segment: [number, number];
};

export function createPathsFromNetwork(
	places: Place[],
	place_network: Map<number, number[]>
): Path[] {
	let nodes: Coordinates[] = [];
	let candidate_lines: LineSegment[] = [];
	place_network.forEach((tos, from) => {
		tos.forEach((to) => {
			const from_place = places[from];
			const to_place = places[to];
			let mid_coords: Coordinates;

			const slope =
				(to_place.coordinates.lat - from_place.coordinates.lat) /
				(to_place.coordinates.lng - from_place.coordinates.lng);

			if (Math.abs(slope) < 1) {
				mid_coords = new Coordinates(from_place.coordinates.lat, to_place.coordinates.lng);
			} else {
				mid_coords = new Coordinates(to_place.coordinates.lat, from_place.coordinates.lng);
			}
			nodes.push(mid_coords);

			candidate_lines.push(new LineSegment(from_place.coordinates, mid_coords));
			candidate_lines.push(new LineSegment(mid_coords, to_place.coordinates));
		});
	});

	nodes.push(...places.map((place) => place.coordinates));

	let node_network = new Map<number, Set<number>>();
	let paths: Path[] = [];

	for (let i = 0; i < nodes.length; i++) {
		node_network.set(i, new Set());
	}

	// create a network of nodes
	for (const line of candidate_lines) {
		type NodeOnLine = {
			node_index: number;
			relpos: number;
		};

		let nodes_on_line: NodeOnLine[] = [];

		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			const relpos = line.is_on_segment(node, 1e-6);
			if (relpos !== undefined) {
				nodes_on_line.push({
					node_index: i,
					relpos: relpos
				});
			}
		}

		nodes_on_line.sort((a, b) => a.relpos - b.relpos);

		for (let i = 0; i < nodes_on_line.length - 1; i++) {
			const from = nodes_on_line[i].node_index;
			const to = nodes_on_line[i + 1].node_index;

			if (node_network.get(from)!.has(to)) {
				console.log('already connected');
				continue;
			}
			node_network.get(from)!.add(to);
			node_network.get(to)!.add(from);

			paths.push({
				line: new LineSegment(nodes[from], nodes[to]),
				segment: [from, to]
			});
		}
	}

	return paths;
}
