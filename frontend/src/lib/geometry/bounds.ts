import { Coordinates } from './coordinates';

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

	// block separates the bounds evenly into blockSize x blockSize blocks
	blockIndices(coord: Coordinates, blockSize: number): [number, number] | undefined {
		const [x, y] = this.relativeXY01(coord);
		if (x < 0 || x > 1 || y < 0 || y > 1) {
			return undefined;
		}
		return [Math.floor(x * blockSize), Math.floor(y * blockSize)];
	}

	blockRect(blockIndices: [number, number], blockSize: number): Bounds {
		const [x, y] = blockIndices;
		const w = this.sw.lng + (this.ne.lng - this.sw.lng) * (x / blockSize);
		const s = this.sw.lat + (this.ne.lat - this.sw.lat) * (y / blockSize);
		const e = this.sw.lng + (this.ne.lng - this.sw.lng) * ((x + 1) / blockSize);
		const n = this.sw.lat + (this.ne.lat - this.sw.lat) * ((y + 1) / blockSize);
		return new Bounds(w, s, e, n);
	}

	blockWidth(blockSize: number): number {
		return Math.abs(this.ne.lng - this.sw.lng) / blockSize;
	}

	blockHeight(blockSize: number): number {
		return Math.abs(this.ne.lat - this.sw.lat) / blockSize;
	}

	// mesh is like a block, but the size is smaller if the coord is closer to the center
	meshIndices(coord: Coordinates, meshSize: number): [number, number] | undefined {
		const [x, y] = this.relativeXY01(coord);
		if (x < 0 || x > 1 || y < 0 || y > 1) {
			return undefined;
		}

		const grad = (x: number) => {
			return x * x * x * (x * (x * 6 - 15) + 10);
		};

		return [Math.floor(grad(x) * meshSize), Math.floor(grad(y) * meshSize)];
	}

	meshNormalWidth(meshSize: number): number {
		return Math.abs(this.ne.lng - this.sw.lng) / meshSize;
	}

	meshNormalHeight(meshSize: number): number {
		return Math.abs(this.ne.lat - this.sw.lat) / meshSize;
	}

	meshID(coord: Coordinates, meshSize: number): number | undefined {
		const indices = this.meshIndices(coord, meshSize);
		if (indices === undefined) {
			return undefined;
		}
		return indices[1] * meshSize + indices[0];
	}
}
