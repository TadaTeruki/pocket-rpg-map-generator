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
		<span class="color-view flex h-14 w-50 items-center justify-center rounded-lg bg-indigo-900"
			><slot></slot></span
		>
	{:else}
		<span class="color-edit flex h-14 w-50 items-center justify-center rounded-lg bg-indigo-900"
			><slot></slot></span
		>
	{/if}
</button>

<style>
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
