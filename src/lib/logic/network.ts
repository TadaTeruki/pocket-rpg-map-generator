import type { Config } from '../config';
import type { Place } from '../mapcontent/features';
import type { Mesh } from '../geometry/bounds';
import { Coordinates } from '../geometry/coordinates';
import { LineSegment } from '../geometry/line';
import Delaunator from 'delaunator';
import { SeedableRng } from './seedablelng';

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

type PathCandidate = {
	from: number;
	to: number;
	distance: number;
};

export function createNetwork(places: Place[], mesh: Mesh, config: Config): Map<number, number[]> {
	let delaunay = new Delaunator(
		places.map((place) => [place.coordinates.lng, place.coordinates.lat]).flat()
	);

	let paths: PathCandidate[] = [];
	for (let i = 0; i < delaunay.triangles.length; i += 3) {
		const a = delaunay.triangles[i];
		const b = delaunay.triangles[i + 1];
		const c = delaunay.triangles[i + 2];

		for (const [from, to] of [
			[a, b],
			[b, c],
			[c, a]
		]) {
			if (from >= to) {
				continue;
			}
			const distance = Math.hypot(
				places[from].coordinates.lat - places[to].coordinates.lat,
				places[from].coordinates.lng - places[to].coordinates.lng
			);
			paths.push({
				from: from,
				to: to,
				distance: distance
			});
		}
	}

	let network_accept = new Map<number, Set<number>>();
	let paths_rejected: PathCandidate[] = [];
	let disjoint_set = new DisjointSet(places.length);

	// sort by distance (like Kruskal's algorithm)
	paths.sort((a, b) => a.distance - b.distance);

	paths.forEach((path) => {
		if (!disjoint_set.connected(path.from, path.to)) {
			if (!network_accept.has(path.from)) {
				network_accept.set(path.from, new Set());
			}
			network_accept.get(path.from)!.add(path.to);
			disjoint_set.union(path.from, path.to);
		} else {
			paths_rejected.push(path);
		}
	});

	let rng = new SeedableRng(mesh.bounds.toHash());

	// randomly add rejected paths
	paths_rejected.forEach((path) => {
		if (rng.next() < config.useless_path_acceptance) {
			if (!network_accept.has(path.from)) {
				network_accept.set(path.from, new Set());
			}
			network_accept.get(path.from)!.add(path.to);
		}
	});

	const network_array = new Map<number, number[]>();
	network_accept.forEach((value, key) => {
		network_array.set(key, Array.from(value));
	});

	return network_array;
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

			if (from_place.coordinates.toHash() < to_place.coordinates.toHash()) {
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
