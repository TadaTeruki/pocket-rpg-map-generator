<script lang="ts">
	import { DefaultMarker, MapEvents, MapLibre } from 'svelte-maplibre';
	import type { LngLat, MapMouseEvent } from 'maplibre-gl';

	let markers: { lngLat: LngLat }[] = $state([]);

	function addMarker(e: MapMouseEvent) {
		markers = [...markers, { lngLat: e.lngLat }];
	}
</script>

<MapLibre
	style="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
	class="relative aspect-[9/16] max-h-[70vh] w-full sm:aspect-video sm:max-h-full"
	standardControls
>
	<MapEvents onclick={addMarker} />

	{#each markers as marker}
		<DefaultMarker lngLat={marker.lngLat} />
	{/each}
</MapLibre>
