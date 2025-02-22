export class Coordinates {
	lat: number;
	lng: number;
	constructor(lat: number, lng: number) {
		this.lat = lat;
		this.lng = lng;
	}

	isSame(coord: Coordinates): boolean {
		const dist = Math.abs(this.lat - coord.lat) + Math.abs(this.lng - coord.lng);
		return dist < 1e-3;
	}

	distance(coord: Coordinates): number {
		return Math.hypot(this.lat - coord.lat, this.lng - coord.lng);
	}

	simplify(): Coordinates {
		return new Coordinates(Math.round(this.lat * 1e3) / 1e3, Math.round(this.lng * 1e3) / 1e3);
	}

	toString(): string {
		return `(${this.lat}, ${this.lng})`;
	}

	toHash(): number {
		const simplified = this.simplify();
		return xorshift32(Math.round(simplified.lat * 1e6 + simplified.lng * 1e6));
	}
}

function xorshift32(seed: number) {
	let x = seed;
	x ^= x << 13;
	x ^= x >>> 17;
	x ^= x << 5;
	return x;
}
