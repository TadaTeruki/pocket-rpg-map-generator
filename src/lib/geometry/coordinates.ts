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
}
