<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/shadcn/ui/button/index.js';
	import { Section } from '$lib/components/section/index.js';
	import { Sun, Moon } from '@lucide/svelte';
	import { DriftField } from '$lib/drift/index.js';
	import { ReducedMotionNotice } from '$lib/components/reduced-motion-notice/index.js';
	import { Feature } from '$lib/components/feature/index.js';
	import { ScrollReveal } from '$lib/components/scroll-reveal/index.js';

	let heroRef = $state<HTMLElement | null>(null);

	let dark = $state(false);
	let scrolled = $state(false);
	let progress = $state(0);

	function toggleDark() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
	}

	const heroTitle = 'Void Projects';
	const titleChars = [...heroTitle];

	const heroSubtitle = 'Software for accelerating the use of agentic systems.';
	const subtitleChars = [...heroSubtitle];

	// Fraction of total page scroll before the title drifts apart.
	const DRIFT_THRESHOLD = 0.02;

	// Fraction of total page scroll before the card slides in.
	const CARD_REVEAL_THRESHOLD = 0.3;

	const field = new DriftField();

	// Svelte action — tag any element that should become a drifting rigid body.
	const drift = (el: HTMLElement) => ({ destroy: field.register(el) });

	onMount(() => {
		const onScroll = () => {
			scrolled = window.scrollY > 0;
			const scrollable = document.documentElement.scrollHeight - window.innerHeight;
			progress = scrollable > 0 ? Math.max(0, Math.min(1, window.scrollY / scrollable)) : 0;

			if (progress > DRIFT_THRESHOLD) field.start();
			else field.return_();
		};

		window.addEventListener('scroll', onScroll, { passive: true });

		// Console-driven debug overlay: `driftDebug()` to show, `driftDebug(false)` to hide.
		const w = window as typeof window & { driftDebug?: (on?: boolean) => void };
		w.driftDebug = (on = true) => (on ? field.enableDebug() : field.disableDebug());
		console.info('[drift] run driftDebug() in the console to overlay the physics wireframe');

		return () => {
			window.removeEventListener('scroll', onScroll);
			delete w.driftDebug;
			field.destroy();
		};
	});
</script>

<header class="sticky top-0 z-2 h-16 bg-background/10 px-35 pt-4 backdrop-blur-lg">
	<div class="flex flex-row items-center justify-between">
		<div
			class="flex flex-row items-center justify-center gap-6 transition-opacity duration-300"
			class:opacity-0={!scrolled}
			class:pointer-events-none={!scrolled}
			aria-hidden={!scrolled}
		>
			<span class="text-xl font-bold">Void Projects</span>
			<a href="/blog" class="text-lg hover:opacity-60">Blog</a>
			<a href="/team" class="text-lg hover:opacity-60">Meet The Team</a>
		</div>
	</div>
	<div class="absolute top-0 right-0 p-3">
		<Button
			variant="ghost"
			size="icon-lg"
			onclick={toggleDark}
			class="cursor-pointer hover:bg-transparent hover:text-primary dark:hover:bg-transparent"
			aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
		>
			{#if dark}
				<Sun class="size-5" />
			{:else}
				<Moon class="size-5" />
			{/if}
		</Button>
	</div>
</header>
<main class="flex flex-col">
	<Section
		bind:ref={heroRef}
		class="sticky top-16 h-[calc(100dvh-4rem)] items-center justify-center gap-3 overflow-clip"
	>
		<div class="flex flex-col items-center gap-4">
			<h1 class="text-8xl font-bold select-none" aria-label={heroTitle}>
				{#each titleChars as ch}<span
						use:drift
						aria-hidden="true"
						style="display:inline-block;white-space:pre">{ch === ' ' ? '\u00A0' : ch}</span
					>{/each}
			</h1>
			<p class="text-2xl select-none" aria-label={heroSubtitle}>
				{#each subtitleChars as ch}<span
						use:drift
						aria-hidden="true"
						style="display:inline-block;white-space:pre">{ch === ' ' ? '\u00A0' : ch}</span
					>{/each}
			</p>
			<div use:drift class="inline-block">
				<Button
					class="text-2xl"
					onclick={() => window.open('https://github.com/voidprojectssoftware')}
					>Visit Our Github</Button
				>
			</div>
		</div>
		<ScrollReveal {progress} threshold={CARD_REVEAL_THRESHOLD}>
			<Feature
				title="Constellation"
				desc="Transform disjointed, amorphic systems into accessible graphs of knowledge."
			/>
		</ScrollReveal>
		<ScrollReveal {progress} threshold={CARD_REVEAL_THRESHOLD + 0.3} class="z-2">
			<Feature
				title="Protostar"
				desc="Shareable, private, and internal agent skills that get better as you use them."
			/>
		</ScrollReveal>
		<ScrollReveal {progress} threshold={CARD_REVEAL_THRESHOLD + 0.6} class="z-3">
			<Feature title="Wormhole" desc="Query a teammate's local notes in your favorite agent harness." />
		</ScrollReveal>
	</Section>
	<div class="h-1250"></div>
</main>

<ReducedMotionNotice />
