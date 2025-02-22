import { Bounds } from './geometry/bounds';

export type Config = {
	feature_margin01: number;
	zoom_level_detailed: number;
	lower_connection_scale: number;
	upper_connection_scale: number;
	lower_connection_probability: number;
	upper_connection_probability: number;
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
		Math.sqrt(config.num_C + config.num_T + config.num_D) * 2.0 * 1.5,
		Math.sqrt(config.num_C + config.num_T + config.num_D) * 2.0
	).shrink(0.1);
}
