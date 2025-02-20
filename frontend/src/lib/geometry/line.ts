import { Coordinates } from './coordinates';

export class LineSegment {
	start: Coordinates;
	end: Coordinates;

	constructor(start: Coordinates, end: Coordinates) {
		this.start = start;
		this.end = end;
	}

	intersection(other: LineSegment): Coordinates | LineSegment | undefined {
		return calculateIntersection(this, other);
	}

	relative_position(point: Coordinates): number {
		const x0 = this.start.lng;
		const y0 = this.start.lat;
		const x1 = this.end.lng;
		const y1 = this.end.lat;
		const x = point.lng;
		const y = point.lat;
		const dx = x1 - x0;
		const dy = y1 - y0;

		if (dx === 0) {
			return (y - y0) / dy;
		}
		if (dy === 0) {
			return (x - x0) / dx;
		}

		const t = ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy);
		return t;
	}

	is_on_segment(point: Coordinates, limit_distance: number): number | undefined {
		const relpos = this.relative_position(point);
		if (relpos < 0 || relpos > 1) {
			return undefined;
		}

		const point_on_segment = new Coordinates(
			this.start.lat + relpos * (this.end.lat - this.start.lat),
			this.start.lng + relpos * (this.end.lng - this.start.lng)
		);

		const distance = point.distance(point_on_segment);

		if (distance < limit_distance) {
			return relpos;
		}

		return undefined;
	}
}

function calculateIntersection(
	line1: LineSegment,
	line2: LineSegment
): Coordinates | LineSegment | undefined {
	const EPS = 1e-10;

	const p0 = line1.start;
	const p1 = line1.end;
	const p2 = line2.start;
	const p3 = line2.end;

	const s1_x = p1.lng - p0.lng;
	const s1_y = p1.lat - p0.lat;
	const s2_x = p3.lng - p2.lng;
	const s2_y = p3.lat - p2.lat;

	const denominator = s1_x * s2_y - s1_y * s2_x;

	// 線分が平行または共線の場合（分母が0に近い場合）
	if (Math.abs(denominator) < EPS) {
		// (p2 - p0)と線分1の方向ベクトルの外積を計算して、共線かどうか確認
		const cross = (p2.lng - p0.lng) * s1_y - (p2.lat - p0.lat) * s1_x;
		if (Math.abs(cross) > EPS) {
			// 平行（交点なし）
			return undefined;
		}

		// 共線の場合
		// パラメータ t を用いて p0～p1 の位置を表現（t=0: p0、t=1: p1）
		let t2: number, t3: number;
		// 垂直や水平の場合にも対応するため、差分の絶対値が大きい方を利用
		if (Math.abs(s1_x) > Math.abs(s1_y)) {
			t2 = (p2.lng - p0.lng) / s1_x;
			t3 = (p3.lng - p0.lng) / s1_x;
		} else {
			t2 = (p2.lat - p0.lat) / s1_y;
			t3 = (p3.lat - p0.lat) / s1_y;
		}
		if (t2 > t3) {
			[t2, t3] = [t3, t2];
		}
		// 線分1上のパラメータの重複区間を求める
		const t_start = Math.max(0, t2);
		const t_end = Math.min(1, t3);

		if (t_start > t_end) {
			// 重複区間が存在しない場合
			return undefined;
		}
		// 重複区間が1点の場合
		if (Math.abs(t_start - t_end) < EPS) {
			const x = p0.lng + t_start * s1_x;
			const y = p0.lat + t_start * s1_y;
			return new Coordinates(y, x);
		}
		// 重複区間が存在する場合、その両端の座標を返す
		const x_start = p0.lng + t_start * s1_x;
		const y_start = p0.lat + t_start * s1_y;
		const x_end = p0.lng + t_end * s1_x;
		const y_end = p0.lat + t_end * s1_y;
		return new LineSegment(new Coordinates(y_start, x_start), new Coordinates(y_end, x_end));
	}

	// 傾きが異なる場合の通常の交点計算
	const s = (-s1_y * (p0.lng - p2.lng) + s1_x * (p0.lat - p2.lat)) / denominator;
	const t = (s2_x * (p0.lat - p2.lat) - s2_y * (p0.lng - p2.lng)) / denominator;

	if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
		const x = p0.lng + t * s1_x;
		const y = p0.lat + t * s1_y;
		return new Coordinates(y, x);
	}

	return undefined;
}
