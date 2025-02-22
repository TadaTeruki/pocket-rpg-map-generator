<script lang="ts">
	import ControlPanel from '$lib/ControlPanel.svelte';
	import Map from '$lib/Map.svelte';
	import type { Place } from '$lib/mapcontent/features';
	import { onMount } from 'svelte';

	let mode: 'view' | 'edit' = 'edit';
	let place_chosen: Place | undefined;
	let show_place_name: boolean;
	let error_message: string | undefined;

	let message = '';

	$: if (error_message) {
		message = error_message;
	} else {
		message = '';
	}

	let place_name_cache: string | undefined;
	$: if (place_name_cache !== place_chosen?.name) {
		place_name_cache = place_chosen?.name;
		message = '';
		setTimeout(() => {
			message = place_chosen?.name_display || '';
		}, 1);
	}

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

<div class="h-screen w-screen overflow-hidden border-5 border-indigo-950 md:border-10">
	<Map mapId={'fullmap'} bind:mode bind:place_chosen bind:show_place_name bind:error_message />
</div>
<canvas id="overlay" class="pointer-events-none absolute top-0 left-0 h-full w-full"></canvas>
<div
	class="pointer-events-none absolute top-0 left-0 flex h-full w-full flex-col items-center justify-center"
>
	<div class="text-md flex h-7 w-full items-center justify-center bg-indigo-900 p-4 text-white">
		捕獲系RPG風 マップジェネレータ
	</div>
	<div class="flex h-full w-full max-w-2xl flex-col items-center justify-center">
		{#if message || mode === 'edit'}
			<div
				class="animBoard pointer-events-auto mt-5 flex items-center justify-center rounded-sm bg-indigo-900/75 px-3 py-1 text-lg font-bold text-white"
			>
				{#if mode === 'view'}
					{#if message}
						{message}
					{/if}
				{:else}
					タップ / クリックで場所を選ぶ
				{/if}
			</div>
		{/if}
		<div class="flex-grow"></div>
		<div class="pointer-events-auto mb-5 flex flex-col items-center justify-center bg-indigo-900">
			<ControlPanel bind:mode>＋ 新しい地方</ControlPanel>
			<div>
				<input type="checkbox" bind:checked={show_place_name} class="h-4 w-4 text-indigo-900" />
				<label for="show_place_name" class="text-sm text-white">シティ・タウン名を表示</label>
			</div>
		</div>
	</div>
</div>

<style>
	:global(#fullmap) {
		@apply h-full w-full overflow-hidden;
	}

	.animBoard {
		animation: pulse 0.5s linear;
	}

	@keyframes pulse {
		0% {
			/* 表示位置を少し上に */
			transform: translateY(-100px);
		}
		100% {
			/* 表示位置を少し下に */
			transform: translateY(0);
		}
	}
</style>
