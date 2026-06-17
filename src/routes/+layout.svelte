<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { SpaceBackground } from '$lib/components/space-background/index.js';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<SpaceBackground />

<div class="flex flex-col">
	{@render children()}
</div>
