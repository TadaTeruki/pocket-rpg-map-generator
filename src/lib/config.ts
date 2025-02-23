import { Bounds, Mesh } from './geometry/bounds';

export type Config = {
	feature_margin01: number;
	zoom_level_detailed: number;
	extract_margin_scale: number;
	useless_path_acceptance: number;
	num_C: number;
	num_T: number;
	num_D: number;
};

export function meshFromConfig(config: Config, bounds: Bounds): Mesh {
	const aspect_ratio =
		Math.abs(bounds.ne.lng - bounds.sw.lng) / Math.abs(bounds.ne.lat - bounds.sw.lat);

	return new Mesh(
		bounds,
		Math.sqrt(config.num_C + config.num_T + config.num_D) * 2.0 * aspect_ratio,
		Math.sqrt(config.num_C + config.num_T + config.num_D) * 2.0
	);
}

export function loadDefaultConfig(): Config {
	return {
		feature_margin01: 0.0,
		zoom_level_detailed: 8,
		extract_margin_scale: 1.0,
		useless_path_acceptance: 0.3,
		num_C: 8,
		num_T: 8,
		num_D: 8
	};
}
