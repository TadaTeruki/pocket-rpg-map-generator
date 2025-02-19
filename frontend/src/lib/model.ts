export class PointFeature {
	lat: number;
	lng: number;
	name: string;

	constructor(lat: number, lng: number, name: string) {
		this.lat = lat;
		this.lng = lng;
		this.name = name;
	}
}

export function pointFeaturesFromGeoJson(features: Object[]): PointFeature[] {
	return features.map((feature: any) => {
		return new PointFeature(
			feature.geometry.coordinates[1],
			feature.geometry.coordinates[0],
			feature.properties.name
		);
	});
}
