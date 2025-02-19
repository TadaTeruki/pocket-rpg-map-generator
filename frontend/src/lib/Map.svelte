<script lang="ts">
    import { onMount } from "svelte";
    import { PMTiles } from "pmtiles";
    import maplibre from "maplibre-gl";
	import { getTileCoordsInBounds } from "./tilecoords";
	import { geojson } from "flatgeobuf";
    export let zoom = 3.5;
    export let center = [138.727, 38.362];
    export let mapId;

    let map: maplibre.Map;
    let meshsize = 16;

    onMount(() => {
        let style =
            "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
        map = new maplibre.Map({
            container: mapId,
            style: style,
            center: [center[0], center[1]],
            zoom: zoom,
        });

        map.on("click", async () => {
            const bounds = map.getBounds();
            const boundsArray = [
                bounds.getWest(),
                bounds.getSouth(),
                bounds.getEast(),
                bounds.getNorth(),
            ];
            console.log("Current bounds:", boundsArray);
            const currentZoom = Math.floor(map.getZoom());
            const tiles = getTileCoordsInBounds(bounds, currentZoom);
            console.log("Tiles covering current bounds:", tiles);     
            
            
            const base_url = window.location.origin;
            				
			const url = `${base_url}/routes.fgb`;

            console.log(url);

            const rect = {
                minX: boundsArray[0],
                minY: boundsArray[1],
                maxX: boundsArray[2],
                maxY: boundsArray[3]
            };

            const iter = geojson.deserialize(url, rect);

            let features = []; 
            for await (const feature of iter) {
                features.push(feature);
            }

            console.log(features.length);
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