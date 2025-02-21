import { Coordinates } from './coordinates';

export class Bounds {
	sw: Coordinates;
	ne: Coordinates;
	meshSizeLng: number;
	meshSizeLat: number;
	constructor(
		w: number,
		s: number,
		e: number,
		n: number,
		meshSizeLng: number,
		meshSizeLat: number
	) {
		this.sw = new Coordinates(s, w);
		this.ne = new Coordinates(n, e);
		this.meshSizeLng = meshSizeLng;
		this.meshSizeLat = meshSizeLat;
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
		return new Bounds(w, s, e, n, this.meshSizeLng, this.meshSizeLat);
	}

	meshIndices(coord: Coordinates): [number, number] | undefined {
		const [x, y] = this.relativeXY01(coord);
		if (x < 0 || x > 1 || y < 0 || y > 1) {
			return undefined;
		}

		const grad = (x: number) => {
			return x;
		};

		return [Math.floor(grad(x) * this.meshSizeLng), Math.floor(grad(y) * this.meshSizeLat)];
	}

	meshNormalLng(): number {
		return Math.abs(this.ne.lng - this.sw.lng) / this.meshSizeLng;
	}

	meshNormalLat(): number {
		return Math.abs(this.ne.lat - this.sw.lat) / this.meshSizeLat;
	}

	meshID(coord: Coordinates): number | undefined {
		const indices = this.meshIndices(coord);
		if (indices === undefined) {
			return undefined;
		}
		return indices[1] * this.meshSizeLng + indices[0];
	}
}
