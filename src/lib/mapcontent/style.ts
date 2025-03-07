import { type StyleSpecification } from 'maplibre-gl';

export function loadMapStyle(): StyleSpecification {
	return {
		version: 8,
		name: 'OSM Liberty',
		metadata: {
			'maputnik:license': 'https://github.com/maputnik/osm-liberty/blob/gh-pages/LICENSE.md',
			'maputnik:renderer': 'mbgljs',
			'openmaptiles:version': '3.x'
		},
		sources: {
			natural_earth_shaded_relief: {
				maxzoom: 6,
				tileSize: 256,
				tiles: [
					'https://klokantech.github.io/naturalearthtiles/tiles/natural_earth_2_shaded_relief.raster/{z}/{x}/{y}.png'
				],
				type: 'raster'
			},
			openmaptiles: {
				type: 'vector',
				url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${import.meta.env.VITE_MAPTILER_KEY}`
			}
		},
		sprite: 'https://maputnik.github.io/osm-liberty/sprites/osm-liberty',
		glyphs: 'https://orangemug.github.io/font-glyphs/glyphs/{fontstack}/{range}.pbf',
		layers: [
			{
				id: 'background',
				type: 'background',
				layout: { visibility: 'visible' },
				paint: { 'background-color': 'rgba(170, 221, 108, 1)' }
			},
			{
				id: 'natural_earth',
				type: 'raster',
				source: 'natural_earth_shaded_relief',
				maxzoom: 7,
				layout: { visibility: 'visible' },
				paint: {
					'raster-opacity': {
						base: 1.5,
						stops: [
							[0, 0.8],
							[6, 0.1]
						]
					}
				}
			},
			{
				id: 'landcover_wood',
				type: 'fill',
				source: 'openmaptiles',
				'source-layer': 'landcover',
				minzoom: 0,
				maxzoom: 24,
				filter: ['all', ['==', 'class', 'wood']],
				layout: { visibility: 'visible' },
				paint: {
					'fill-antialias': false,
					'fill-color': 'rgba(210, 192, 80, 1)',
					'fill-opacity': 0.8
				}
			},
			{
				id: 'water',
				type: 'fill',
				source: 'openmaptiles',
				'source-layer': 'water',
				filter: ['all', ['!=', 'brunnel', 'tunnel']],
				layout: { visibility: 'visible' },
				paint: { 'fill-color': 'rgba(112, 184, 255, 1)' }
			},
			{
				id: 'landcover_sand',
				type: 'fill',
				source: 'openmaptiles',
				'source-layer': 'landcover',
				filter: ['all', ['==', 'class', 'sand']],
				layout: { visibility: 'none' },
				paint: { 'fill-color': 'rgba(247, 239, 195, 1)' }
			},
			{
				id: 'road_major_rail',
				type: 'line',
				source: 'openmaptiles',
				'source-layer': 'transportation',
				filter: ['all', ['!in', 'brunnel', 'bridge', 'tunnel'], ['==', 'class', 'rail']],
				layout: { visibility: 'visible' },
				paint: {
					'line-color': '#bbb',
					'line-width': {
						base: 1.4,
						stops: [
							[14, 1],
							[15, 2],
							[20, 4]
						]
					}
				}
			},
			{
				id: 'building',
				type: 'fill',
				source: 'openmaptiles',
				'source-layer': 'building',
				layout: { visibility: 'visible' },
				paint: {
					'fill-color': 'rgba(157, 186, 123, 1)'
				}
			}
		],
		id: 'osm-liberty'
	};
}
