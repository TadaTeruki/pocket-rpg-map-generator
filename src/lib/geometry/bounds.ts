import { Coordinates } from './coordinates';

export class Mesh {
	bounds: Bounds;
	meshSizeLng: number;
	meshSizeLat: number;

	constructor(bounds: Bounds, meshSizeLng: number, meshSizeLat: number) {
		this.bounds = bounds;
		this.meshSizeLng = meshSizeLng;
		this.meshSizeLat = meshSizeLat;
	}

	meshIndices(coord: Coordinates): [number, number] | undefined {
		const [x, y] = this.bounds.relativeXY01(coord);
		if (x < 0 || x > 1 || y < 0 || y > 1) {
			return undefined;
		}

		const grad = (x: number) => {
			return x;
		};

		return [Math.floor(grad(x) * this.meshSizeLng), Math.floor(grad(y) * this.meshSizeLat)];
	}

	meshNormalLng(): number {
		return Math.abs(this.bounds.ne.lng - this.bounds.sw.lng) / this.meshSizeLng;
	}

	meshNormalLat(): number {
		return Math.abs(this.bounds.ne.lat - this.bounds.sw.lat) / this.meshSizeLat;
	}

	meshID(coord: Coordinates): number | undefined {
		const indices = this.meshIndices(coord);
		if (indices === undefined) {
			return undefined;
		}
		return indices[1] * this.meshSizeLng + indices[0];
	}
}

export class Bounds {
	sw: Coordinates;
	ne: Coordinates;
	constructor(w: number, s: number, e: number, n: number) {
		this.sw = new Coordinates(s, w);
		this.ne = new Coordinates(n, e);
	}

	relativeXY01(coord: Coordinates): [number, number] {
		const x = (coord.lng - this.sw.lng) / (this.ne.lng - this.sw.lng);
		const y = (coord.lat - this.sw.lat) / (this.ne.lat - this.sw.lat);
		return [x, y];
	}

	shrink(factor: number): Bounds {
		const w = this.sw.lng + (this.ne.lng - this.sw.lng) * factor;
		const s = this.sw.lat + (this.ne.lat - this.sw.lat) * factor;
		const e = this.ne.lng - (this.ne.lng - this.sw.lng) * factor;
		const n = this.ne.lat - (this.ne.lat - this.sw.lat) * factor;
		return new Bounds(w, s, e, n);
	}

	merge(bounds: Bounds): Bounds {
		const w = Math.min(this.sw.lng, bounds.sw.lng);
		const s = Math.min(this.sw.lat, bounds.sw.lat);
		const e = Math.max(this.ne.lng, bounds.ne.lng);
		const n = Math.max(this.ne.lat, bounds.ne.lat);
		return new Bounds(w, s, e, n);
	}

	center(): Coordinates {
		return new Coordinates((this.sw.lat + this.ne.lat) / 2, (this.sw.lng + this.ne.lng) / 2);
	}

	moveCenter(coord: Coordinates): Bounds {
		const center = this.center();
		const diff = new Coordinates(coord.lat - center.lat, coord.lng - center.lng);
		return new Bounds(
			this.sw.lng + diff.lng,
			this.sw.lat + diff.lat,
			this.ne.lng + diff.lng,
			this.ne.lat + diff.lat
		);
	}

	simplify(): Bounds {
		const sw = this.sw.simplify();
		const ne = this.ne.simplify();
		return new Bounds(sw.lng, sw.lat, ne.lng, ne.lat);
	}

	toHash(): number {
		return this.sw.toHash() ^ this.ne.toHash();
	}
}
