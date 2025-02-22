<script lang="ts">
	import maplibre from 'maplibre-gl';
	import ControlPanel from '$lib/ControlPanel.svelte';
	import Map from '$lib/Map.svelte';
	import type { Place } from '$lib/mapcontent/features';
	import { onMount } from 'svelte';
	import { generation_history } from '../store';
	import { screenShot } from '$lib/screenshot';

	let mode: 'view' | 'edit' = 'view';
	let place_chosen: Place | undefined;
	let show_place_name: boolean;
	let error_message: string | undefined;
	let message = '';
	let sharing = false;
	let current_url = '';
	let map: maplibre.Map;

	let last_copied_url = 'never-occurs';
	let image_canvas: HTMLCanvasElement | undefined;

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
	<Map
		mapId={'fullmap'}
		bind:mode
		bind:place_chosen
		bind:show_place_name
		bind:error_message
		bind:current_url
		bind:map
	/>
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
				class="animBoardUpper mt-5 flex items-center justify-center rounded-sm bg-indigo-900/75 px-3 py-1 text-lg font-bold text-white"
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
		{#if sharing}
			<div
				class="animBoardLower pointer-events-auto mb-5 w-[70%] overflow-y-auto bg-indigo-900/75 text-white"
			>
				<div class="m-1 rounded-lg border-5 border-gray-400 p-3">
					共有用テキスト
					<button
						class="nowrap ml-2 rounded-sm bg-white/20 px-2 py-1 text-sm hover:bg-white/30"
						on:click={() => {
							navigator.clipboard.writeText(current_url);
							last_copied_url = current_url;
						}}
					>
						{#if last_copied_url === current_url}
							コピーしました
						{:else}
							コピー
						{/if}
					</button>

					<div class="my-4 bg-indigo-900/75 p-1 text-sm break-all text-white">
						#捕獲系RPG風マップジェネレータ<br />
						{current_url.split(',').join(',\n')}
					</div>
					<!-- スクリーンショット
					<button
						class="text-sm rounded-sm bg-white/20 hover:bg-white/30 nowrap px-2 py-1 ml-2"
						on:click={() => {
							navigator.clipboard.writeText(current_url);
							image_canvas = screenShot(map);
							//let image_canvas_div = document.getElementById('image-canvas') as HTMLDivElement;
							// image_canvas_div.innerHTML = '';
							// image_canvas_div.appendChild(image_canvas);
						}}
					>
					撮影
					</button>
					{#if image_canvas}
						<a download="map.png" href={image_canvas.toDataURL('image/png')}>ダウンロード</a>
					{/if}
					<div id="image-canvas"></div> -->
				</div>
			</div>
		{/if}
		<div
			class="pointer-events-auto z-10 flex w-[70%] flex-col items-center justify-center bg-indigo-900 pb-5"
		>
			<ControlPanel bind:mode bind:sharing>＋ 新しい地方</ControlPanel>
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

	.animBoardUpper {
		animation: moveDown 0.5s linear;
	}

	@keyframes moveDown {
		0% {
			/* 表示位置を少し上に */
			transform: translateY(-100px);
		}
		100% {
			/* 表示位置を少し下に */
			transform: translateY(0);
		}
	}

	.animBoardLower {
		animation: moveUp 0.5s linear;
	}

	@keyframes moveUp {
		0% {
			/* 表示位置を少し下に */
			transform: translateY(150px);
		}
		100% {
			/* 表示位置を少し上に */
			transform: translateY(0);
		}
	}
</style>
