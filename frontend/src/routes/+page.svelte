<script lang="ts">
	import Map from '$lib/Map.svelte';
</script>

<Map zoom={4.5} mapId={'fullmap'} />

<style>
	:global(#fullmap) {
		@apply h-screen w-full overflow-hidden;
	}
</style>
