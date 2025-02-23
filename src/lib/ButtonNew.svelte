<script lang="ts">
	export let mode: 'view' | 'edit';
</script>

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
		<span class="color-view flex h-12 w-54 items-center justify-center rounded-lg bg-indigo-900"
			>＋ 新しい地方</span
		>
	{:else}
		<span class="color-edit flex h-12 w-54 items-center justify-center rounded-lg bg-indigo-900"
			>＋ 新しい地方</span
		>
	{/if}
</button>

<style>
	.color-edit {
		border-color: #d4b758;
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
		border-color: #caa322;
	}
</style>
