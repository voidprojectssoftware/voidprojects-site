<script lang="ts">
	import './layout.css';
	import favicon from '$lib/brand/orbitmark.svg';
	import { SpaceBackground } from '$lib/components/space-background/index.js';
	import { afterNavigate } from '$app/navigation';

	let { children } = $props();

	// On a fresh load or refresh, start at the top rather than wherever the browser
	// or SvelteKit would restore to — the hero animation is scroll-driven, so landing
	// mid-scroll is jarring. `enter` is the initial render (a refresh is a full load).
	// A URL hash still wins: we leave deep links alone so they land on their anchor.
	// afterNavigate runs after SvelteKit applies its own scroll, so this isn't undone.
	afterNavigate((nav) => {
		if (nav.type === 'enter' && !location.hash) window.scrollTo(0, 0);
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<SpaceBackground />

<div class="flex flex-col">
	{@render children()}
</div>
