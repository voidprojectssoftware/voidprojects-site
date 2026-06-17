<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/shadcn/ui/button/index.js';
	import { Section } from '$lib/components/section/index.js';
	import { Sun, Moon } from '@lucide/svelte';
	import { DriftField } from '$lib/drift/index.js';
	import { ReducedMotionNotice } from '$lib/components/reduced-motion-notice/index.js';

	let heroRef = $state<HTMLElement | null>(null);
	let secondRef = $state<HTMLElement | null>(null);

	let dark = $state(false);
	let scrolled = $state(false);

	function toggleDark() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
	}

	const heroTitle = 'Void Projects';
	const titleChars = [...heroTitle];

	const heroSubtitle = 'Software for accelerating the use of agentic systems.';
	const subtitleChars = [...heroSubtitle];

	// Fraction of secondRef that must scroll into view before the title drifts apart.
	const DRIFT_THRESHOLD = 0.02;

	const field = new DriftField();

	// Svelte action — tag any element that should become a drifting rigid body.
	const drift = (el: HTMLElement) => ({ destroy: field.register(el) });

	onMount(() => {
		const onScroll = () => {
			scrolled = window.scrollY > 0;
			if (!heroRef || !secondRef) return;
			const progress = Math.max(
				0,
				Math.min(
					1,
					(window.innerHeight - secondRef.getBoundingClientRect().top) / window.innerHeight
				)
			);

			if (progress > DRIFT_THRESHOLD) field.start();
			else field.return_();
		};

		window.addEventListener('scroll', onScroll, { passive: true });
		return () => {
			window.removeEventListener('scroll', onScroll);
			field.destroy();
		};
	});
</script>

<div class="isolate">
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
			<h1 class="text-8xl font-bold" aria-label={heroTitle}>
				{#each titleChars as ch}<span
						use:drift
						aria-hidden="true"
						style="display:inline-block;white-space:pre">{ch === ' ' ? '\u00A0' : ch}</span
					>{/each}
			</h1>
			<p class="text-2xl" aria-label={heroSubtitle}>
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
	</Section>
	<div bind:this={secondRef} class="h-[5000px]"></div>
</main>

<ReducedMotionNotice />
