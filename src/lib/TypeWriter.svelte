<script lang="ts">
	import { onMount } from 'svelte';
	export let text = '';
	export let speed = 100;
	let displayText = '';
	let index = 0;
	let interval: number;

	onMount(() => {
		interval = setInterval(() => {
			displayText = text.slice(0, index);
			index++;
			if (index > text.length) {
				clearInterval(interval);
			}
		}, speed);
	});
</script>

<div class="inline">{displayText}</div>
