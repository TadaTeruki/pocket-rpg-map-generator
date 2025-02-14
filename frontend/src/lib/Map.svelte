<script lang="ts">
    import { onMount } from "svelte";
    import maplibre from "maplibre-gl";

    export let zoom = 3.5;
    export let center = [138.727, 38.362];
    export let mapId;

    let map: maplibre.Map;
    
    onMount(() => {
        let style =
            "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
        map = new maplibre.Map({
            container: mapId,
            style: style,
            center: [center[0], center[1]],
            zoom: zoom,
        });
    });
</script>

<svelte:head>
    <link
        href="https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css"
        rel="stylesheet"
    />
</svelte:head>

<div id={mapId}></div>