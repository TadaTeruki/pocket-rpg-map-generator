<script lang="ts">
	import ButtonNew from './ButtonNew.svelte';
	import { generation_history, place_chosen } from '../store';

	export let mode: 'view' | 'edit';
	export let sharing: boolean;

	let undo_enabled = false;
	let redo_enabled = false;
	generation_history.subscribe((history) => {
		undo_enabled = history.canUndo();
		redo_enabled = history.canRedo();
	});
</script>

<div class="mt-1 block sm:hidden">
	<ButtonNew bind:mode />
</div>
<div class="m-1 flex items-center justify-center gap-2">
	<div class="flex gap-2">
		<button
			class="color-view centerbox h-12 w-12 rounded-lg bg-indigo-900 text-xl text-xl font-bold text-white"
			on:click={() => {
				place_chosen.set('');
				generation_history.update((history) => history.undo());
			}}
		>
			{#if undo_enabled}
				↩
			{/if}
		</button>
		<button
			class="color-view centerbox h-12 w-12 rounded-lg bg-indigo-900 text-xl text-xl font-bold text-white"
			on:click={() => {
				place_chosen.set('');
				generation_history.update((history) => history.redo());
			}}
		>
			{#if redo_enabled}
				↪
			{/if}
		</button>
	</div>
	<div class="hidden sm:block">
		<ButtonNew bind:mode />
	</div>
	<div class="flex gap-2">
		<button
			class="color-view centerbox nowrap h-12 w-12 rounded-lg bg-indigo-900 text-sm font-bold text-white"
			on:click={() => {
				if (confirm('作業内容を全て消します。よろしいですか？')) {
					generation_history.update((history) => history.reset());
					place_chosen.set('');
				}
			}}
		>
			全消
		</button>
		<button
			class="color-view centerbox nowrap h-12 w-12 rounded-lg bg-indigo-900 text-sm font-bold text-white"
			on:click={() => {
				sharing = !sharing;
			}}
		>
			{#if !sharing}
				共有
			{/if}
		</button>
	</div>
</div>

<style>
	.centerbox {
		@apply flex items-center justify-center;
	}

	.color-view {
		border-color: #989da7;
		border-width: 5px;
		transition: border-color 0.1s;
	}

	.color-view:hover {
		border-color: #caa322;
	}
</style>
