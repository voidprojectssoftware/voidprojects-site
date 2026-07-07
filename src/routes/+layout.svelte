<script lang="ts">
	import './layout.css';
	import faviconFallback from '$lib/brand/orbitmark.svg';
	import { SpaceBackground } from '$lib/components/space-background/index.js';
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';

	let { children } = $props();

	// The favicon is a fresh generated orbit mark each load. The static orbit mark is
	// the pre-hydration / no-JS fallback; on mount we roll a random one and swap it in.
	// Lazy-loaded so the generator + trajectory data stay out of the initial bundle.
	let faviconHref = $state(faviconFallback);
	onMount(async () => {
		const { generateFaviconDataUri } = await import('$lib/brand/favicon.js');
		faviconHref = generateFaviconDataUri();
	});

	// On a fresh load or refresh, start at the top rather than wherever the browser
	// or SvelteKit would restore to — the hero animation is scroll-driven, so landing
	// mid-scroll is jarring. `enter` is the initial render (a refresh is a full load).
	// A URL hash still wins: we leave deep links alone so they land on their anchor.
	// afterNavigate runs after SvelteKit applies its own scroll, so this isn't undone.
	afterNavigate((nav) => {
		if (nav.type === 'enter' && !location.hash) window.scrollTo(0, 0);
	});
</script>

<svelte:head><link rel="icon" href={faviconHref} /></svelte:head>

<SpaceBackground />

<div class="flex flex-col">
	{@render children()}
</div>
