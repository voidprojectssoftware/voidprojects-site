<script lang="ts">
	import './layout.css';
	import { SpaceBackground } from '$lib/components/space-background/index.js';
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';

	let { children } = $props();

	// The favicon is a fresh generated orbit mark each load. We render no icon until
	// it's ready — so no static fallback flashes first — and generate it during idle
	// time (lazy-loaded) so the work never competes with the hero's opening frames.
	let faviconHref = $state<string | undefined>(undefined);
	onMount(() => {
		const roll = async () => {
			const { generateFaviconDataUri } = await import('$lib/brand/favicon.js');
			faviconHref = generateFaviconDataUri();
		};
		if ('requestIdleCallback' in window) {
			window.requestIdleCallback(() => roll(), { timeout: 2000 });
		} else {
			setTimeout(roll, 200);
		}
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

<svelte:head>
	{#if faviconHref}<link rel="icon" href={faviconHref} />{/if}
</svelte:head>

<SpaceBackground />

<div class="flex flex-col">
	{@render children()}
</div>
