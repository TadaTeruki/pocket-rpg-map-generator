import maplibre from 'maplibre-gl';

export function screenShot(map: maplibre.Map): HTMLCanvasElement {
	const canvas = map.getCanvas();
	const croppedCanvas = document.createElement('canvas');

	// 正方形の一辺は canvas の短い方
	const croppedWH = Math.min(canvas.width, canvas.height);
	croppedCanvas.width = croppedWH;
	croppedCanvas.height = croppedWH;
	const croppedCtx = croppedCanvas.getContext('2d') as CanvasRenderingContext2D;

	// 中央から切り抜くためのオフセット計算
	const sx = canvas.width > canvas.height ? (canvas.width - canvas.height) / 2 : 0;
	const sy = canvas.height > canvas.width ? (canvas.height - canvas.width) / 2 : 0;

	croppedCtx.drawImage(
		canvas,
		sx, // ソースのx座標
		sy, // ソースのy座標
		croppedWH, // ソースから切り抜く幅
		croppedWH, // ソースから切り抜く高さ
		0,
		0,
		croppedWH,
		croppedWH
	);

	return croppedCanvas;
}
