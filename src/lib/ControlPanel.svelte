<script lang="ts">
	import { generation_history } from '../store';

	export let mode: 'view' | 'edit';
	export let sharing: boolean;

	let undo_enabled = false;
	let redo_enabled = false;
	generation_history.subscribe((history) => {
		undo_enabled = history.canUndo();
		redo_enabled = history.canRedo();
	});
</script>

<div class="m-1 flex items-center justify-center gap-2">
	<button
		class="color-view centerbox h-14 w-14 rounded-lg bg-indigo-900 text-2xl text-2xl font-bold text-white"
		on:click={() => {
			generation_history.update((history) => history.undo());
		}}
	>
		{#if undo_enabled}
			↩
		{/if}
	</button>
	<button
		class="color-view centerbox h-14 w-14 rounded-lg bg-indigo-900 text-2xl text-2xl font-bold text-white"
		on:click={() => {
			generation_history.update((history) => history.redo());
		}}
	>
		{#if redo_enabled}
			↪
		{/if}
	</button>
	<button
		on:click={() => {
			if (mode === 'view') {
				mode = 'edit';
			} else {
				mode = 'view';
			}
		}}
		class="text-lg font-bold text-white"
	>
		{#if mode === 'view'}
			<span class="color-view flex h-14 w-50 items-center justify-center rounded-lg bg-indigo-900"
				><slot></slot></span
			>
		{:else}
			<span class="color-edit flex h-14 w-50 items-center justify-center rounded-lg bg-indigo-900"
				><slot></slot></span
			>
		{/if}
	</button>
	<button
		class="color-view centerbox nowrap h-14 w-14 rounded-lg bg-indigo-900 text-2xl text-sm font-bold text-white"
		on:click={() => {
			if (confirm('作業内容を全て消します。よろしいですか？')) {
				generation_history.update((history) => history.reset());
			}
		}}
	>
		全消
	</button>
	<button
		class="color-view centerbox nowrap h-14 w-14 rounded-lg bg-indigo-900 text-2xl text-sm font-bold text-white"
		on:click={() => {
			sharing = !sharing;
		}}
	>
		{#if !sharing}
			共有
		{/if}
	</button>
</div>

<style>
	.centerbox {
		@apply flex items-center justify-center;
	}

	.color-edit {
		border-color: #1eda9b;
		border-width: 5px;
		animation: pulse 1s infinite;
	}

	@keyframes pulse {
		0% {
			filter: brightness(1);
		}
		50% {
			filter: brightness(1.2);
		}
		100% {
			filter: brightness(1);
		}
	}

	.color-view {
		border-color: #989da7;
		border-width: 5px;
		transition: border-color 0.1s;
	}

	.color-view:hover {
		border-color: #1eda9b;
	}
</style>
