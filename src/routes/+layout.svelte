<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { SpaceBackground } from '$lib/components/space-background/index.js';
	import { afterNavigate } from '$app/navigation';

	let { children } = $props();

	// Start at the top rather than wherever the browser or SvelteKit would restore
	// to — the hero animation is scroll-driven, so landing mid-scroll is jarring.
	// `enter` is the initial render (a refresh is a full load); `popstate` landing
	// back on the homepage covers the browser back/forward buttons (e.g. leaving to
	// a blog post and returning), where SvelteKit would otherwise restore the old
	// scroll offset and strand the timeline/hero mid-animation instead of resetting.
	// A URL hash still wins: we leave deep links alone so they land on their anchor.
	// afterNavigate runs after SvelteKit applies its own scroll, so this isn't undone.
	afterNavigate((nav) => {
		const backToHome = nav.type === 'popstate' && nav.to?.url.pathname === '/';
		if ((nav.type === 'enter' || backToHome) && !location.hash) window.scrollTo(0, 0);
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<SpaceBackground />

<div class="flex flex-col">
	{@render children()}
</div>
