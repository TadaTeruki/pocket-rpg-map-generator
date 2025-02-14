<script lang="ts">
	import Map from "$lib/Map.svelte";

</script>

<Map zoom={4.5} mapId={"fullmap"} />

<style>
  :global(#fullmap) {
      @apply w-full h-screen overflow-hidden;
  }
</style>