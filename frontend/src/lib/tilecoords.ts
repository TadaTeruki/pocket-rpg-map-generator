function long2tile(lon: number, zoom: number): number {
	return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat: number, zoom: number): number {
	const rad = (lat * Math.PI) / 180;
	return Math.floor(
		((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom)
	);
}

export class TileXYZ {
	x: number;
	y: number;
	z: number;
	constructor(x: number, y: number, z: number) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
}

export class Coordinates {
	lat: number;
	lng: number;
	constructor(lat: number, lng: number) {
		this.lat = lat;
		this.lng = lng;
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

// 表示範囲(bounds)内のタイル座標のリストを返す関数
export function getTileCoordsInBounds(bounds: Bounds, zoom: number) {
	// タイルのX座標は経度から、Y座標は緯度から計算する
	const xMin = long2tile(bounds.sw.lng, zoom);
	const xMax = long2tile(bounds.ne.lng, zoom);
	// Web Mercatorでは、緯度が大きいほど y 値は小さくなるので注意
	const yMin = lat2tile(bounds.ne.lat, zoom); // 上側（北側）のタイル行
	const yMax = lat2tile(bounds.sw.lat, zoom); // 下側（南側）のタイル行

	const tiles: TileXYZ[] = [];
	for (let x = xMin; x <= xMax; x++) {
		for (let y = yMin; y <= yMax; y++) {
			tiles.push({
				x: x,
				y: y,
				z: zoom
			});
		}
	}
	return tiles;
}
