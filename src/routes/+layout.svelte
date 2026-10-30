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
			const [{ generateFaviconDataUri }, { VISIT_SEED }] = await Promise.all([
				import('$lib/brand/favicon.js'),
				import('$lib/brand/visit-seed.js')
			]);
			faviconHref = generateFaviconDataUri(VISIT_SEED); // same mark as OrbitMark this visit
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
		const backToHome = nav.type === 'popstate' && nav.to?.url.pathname === '/';
		if ((nav.type === 'enter' || backToHome) && !location.hash) window.scrollTo(0, 0);
	});
</script>

<svelte:head>
	{#if faviconHref}<link rel="icon" href={faviconHref} />{/if}
</svelte:head>

<!-- First in the DOM so it is the first Tab stop; every page's <main> carries the id. -->
<a
	href="#main-content"
	class="sr-only rounded-full bg-background text-sm font-semibold ring-1 ring-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2"
	>Skip to content</a
>

<SpaceBackground />

<div class="flex flex-col">
	{@render children()}
</div>
