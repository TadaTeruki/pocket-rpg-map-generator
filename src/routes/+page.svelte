<script lang="ts">
	import Map from '$lib/Map.svelte';
	import { onMount } from 'svelte';

	onMount(() => {
		// canvas overlay draws a white rectangle line on cursor
		const canvas = document.getElementById('overlay') as HTMLCanvasElement;
		const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		let mouse_x = 0;
		let mouse_y = 0;

		window.addEventListener('mousemove', (e) => {
			mouse_x = e.clientX;
			mouse_y = e.clientY;
		});

		window.addEventListener('resize', () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		});

		function drawCursor() {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.beginPath();

			const time = new Date().getTime();
			const rect_size = 30 + 2 * Math.floor(Math.sin(time / 100));

			ctx.rect(mouse_x - rect_size / 2, mouse_y - rect_size / 2, rect_size, rect_size);
			ctx.strokeStyle = 'white';
			ctx.lineWidth = 5;
			ctx.stroke();

			window.requestAnimationFrame(drawCursor);
		}

		window.requestAnimationFrame(drawCursor);
	});
</script>

<Map mapId={'fullmap'} />
<canvas id="overlay" class="pointer-events-none absolute top-0 left-0 h-full w-full"></canvas>

<style>
	:global(#fullmap) {
		@apply h-screen w-full overflow-hidden;
	}
</style>
