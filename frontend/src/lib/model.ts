import type { Config } from './config';
import type { Place } from './features';
import type { Bounds } from './geometry/bounds';
import { Coordinates } from './geometry/coordinates';
import { LineSegment } from './geometry/line';

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
	bounds: Bounds,
	config: Config
): Map<number, number[]> {
	let network = new Map<number, Set<number>>();
	let disjoint_set = new DisjointSet(places.length);

	const mesh_width_lng = bounds.meshNormalLng();
	const mesh_width_lat = bounds.meshNormalLat();

	const radius_lat = mesh_width_lat * config.connection_scale;
	const radius_lng = mesh_width_lng * config.connection_scale;

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
			if (distance < radius_lat && distance < radius_lng && Math.random() < 0.5) {
				// check if there is any intersection
				let intersected = false;
				// all connections in network
				network.forEach((tos, from) => {
					tos.forEach((to) => {
						const line1 = new LineSegment(place.coordinates, otherPlace.coordinates);
						const line2 = new LineSegment(places[from].coordinates, places[to].coordinates);
						const intersection = line1.intersection(line2, false);
						if (intersection !== undefined) {
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

			if (Math.random() < 0.5) {
				mid_coords = new Coordinates(from_place.coordinates.lat, to_place.coordinates.lng);
			} else {
				mid_coords = new Coordinates(to_place.coordinates.lat, from_place.coordinates.lng);
			}
			nodes.push(mid_coords);

			const new_lines = [
				new LineSegment(from_place.coordinates, mid_coords),
				new LineSegment(mid_coords, to_place.coordinates)
			];
			candidate_lines = candidate_lines.concat(new_lines);
		});
	});

	for (let ci = 0; ci < candidate_lines.length; ci++) {
		for (let cj = ci + 1; cj < candidate_lines.length; cj++) {
			const line1 = candidate_lines[ci];
			const line2 = candidate_lines[cj];
			const intersection = line1.intersection(line2, false);

			if (intersection instanceof Coordinates) {
				let acecpted = true;
				for (let i = 0; i < nodes.length; i++) {
					const existing = nodes[i];
					if (existing.isSame(intersection)) {
						acecpted = false;
						break;
					}
				}

				if (acecpted) {
					nodes.push(intersection);
				}
			}
		}
	}

	const nodes_prev_length = nodes.length;
	let node_associated_with_place = new Set<number>();
	for (let i = 0; i < places.length; i++) {
		node_associated_with_place.add(i + nodes_prev_length);
	}

	nodes.push(...places.map((place) => place.coordinates));

	let node_network = new Map<number, Set<number>>();

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

			node_network.get(from)!.add(to);
			node_network.get(to)!.add(from);
		}
	}

	for (let i = 0; i < nodes.length; i++) {
		let encount_nodes = new Map<number, number>();
		const neighbors_1 = Array.from(node_network.get(i)!);
		for (const neighbor_1 of neighbors_1) {
			const neighbors_2 = Array.from(node_network.get(neighbor_1)!);
			for (const neighbor_2 of neighbors_2) {
				if (neighbor_2 >= i) {
					continue;
				}
				if (encount_nodes.has(neighbor_2)) {
					const neighbor_prev_1 = encount_nodes.get(neighbor_2)!;
					// remove the longer line
					const line1 = new LineSegment(nodes[neighbor_prev_1], nodes[i]);
					const line2 = new LineSegment(nodes[neighbor_2], nodes[neighbor_1]);
					if (line1.manhattan_distance() > line2.manhattan_distance()) {
						node_network.get(neighbor_prev_1)!.delete(i);
						node_network.get(i)!.delete(neighbor_prev_1);
					} else {
						node_network.get(neighbor_2)!.delete(neighbor_1);
						node_network.get(neighbor_1)!.delete(neighbor_2);
					}
				} else {
					encount_nodes.set(neighbor_2, neighbor_1);
				}
			}
		}
	}

	// remove nodes with only 1 connection
	while (true) {
		let nodes_to_remove = new Set<number>();
		node_network.forEach((tos, from) => {
			if (tos.size === 1 && !node_associated_with_place.has(from)) {
				nodes_to_remove.add(from);
			}
		});
		if (nodes_to_remove.size === 0) {
			break;
		}
		for (const node of nodes_to_remove) {
			node_network.get(node)!.forEach((to) => {
				node_network.get(to)!.delete(node);
			});
			node_network.delete(node);
		}
	}

	let paths: Path[] = [];
	node_network.forEach((tos, from) => {
		tos.forEach((to) => {
			if (from >= to) {
				return;
			}
			paths.push({
				line: new LineSegment(nodes[from], nodes[to]),
				segment: [from, to]
			});
		});
	});

	return paths;
}
