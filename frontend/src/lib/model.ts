import { Coordinates } from './tilecoords';

export class PointFeature {
	coordinates: Coordinates;
	name: string;

	constructor(coordinates: Coordinates, name: string) {
		this.coordinates = coordinates;
		this.name = name;
	}
}

export function pointFeaturesFromGeoJson(features: Object[]): PointFeature[] {
	return features.map((feature: any) => {
		return new PointFeature(
			new Coordinates(feature.geometry.coordinates[1], feature.geometry.coordinates[0]),
			feature.properties.name
		);
	});
}
