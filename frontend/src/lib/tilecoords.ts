import maplibre from 'maplibre-gl';

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

// 表示範囲(bounds)内のタイル座標のリストを返す関数
export function getTileCoordsInBounds(bounds: maplibre.LngLatBounds, zoom: number) {
	const ne = bounds.getNorthEast(); // 北東端（最大緯度・経度）
	const sw = bounds.getSouthWest(); // 南西端（最小緯度・経度）

	// タイルのX座標は経度から、Y座標は緯度から計算する
	const xMin = long2tile(sw.lng, zoom);
	const xMax = long2tile(ne.lng, zoom);
	// Web Mercatorでは、緯度が大きいほど y 値は小さくなるので注意
	const yMin = lat2tile(ne.lat, zoom); // 上側（北側）のタイル行
	const yMax = lat2tile(sw.lat, zoom); // 下側（南側）のタイル行

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
