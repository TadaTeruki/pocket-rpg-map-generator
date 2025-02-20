import { Bounds } from './geometry/bounds';

export type Config = {
	feature_margin01: number;
	zoom_level_detailed: number;
	connection_scale: number;
	extract_margin_scale: number;
	num_C: number;
	num_T: number;
	num_D: number;
};

export function boundsFromConfig(
	config: Config,
	west: number,
	south: number,
	east: number,
	north: number
): Bounds {
	return new Bounds(
		west,
		south,
		east,
		north,
		Math.sqrt(config.num_C + config.num_T + config.num_D) * 1.5,
		Math.sqrt(config.num_C + config.num_T + config.num_D)
	).shrink(0.1);
}
