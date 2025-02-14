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

        // map.on("click", () => {
        //     let bounds = map.getBounds();
        //     let ne = bounds.getNorthEast();
        //     let sw = bounds.getSouthWest();
        //     console.log(ne, sw);

        //     // add marker
        //     new maplibre.Marker()
        //         .setLngLat(ne)
        //         .addTo(map);
        //     new maplibre.Marker()
        //         .setLngLat(sw)
        //         .addTo(map);
        // });
    });
</script>

<svelte:head>
    <link
        href="https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css"
        rel="stylesheet"
    />
</svelte:head>

<div id={mapId}></div>