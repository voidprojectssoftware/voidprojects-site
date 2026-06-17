<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/shadcn/ui/button/index.js';
	import { Section } from '$lib/components/section/index.js';
	import { ChevronDown } from '@lucide/svelte';
	import { DriftField } from '$lib/drift/index.js';
	import { ReducedMotionNotice } from '$lib/components/reduced-motion-notice/index.js';
	import { Feature } from '$lib/components/feature/index.js';
	import { ScrollReveal } from '$lib/components/scroll-reveal/index.js';

	let heroRef = $state<HTMLElement | null>(null);
	let githubRef = $state<HTMLElement | null>(null);

	let scrolled = $state(false);
	let progress = $state(0);

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

	const GITHUB_URL = 'https://github.com/voidprojectssoftware';

	// Open in a background tab (Ctrl/Cmd-click an anchor) so the user stays on this
	// page — they don't get yanked away from the animation.
	function openGithubTab() {
		const a = document.createElement('a');
		a.href = GITHUB_URL;
		a.target = '_blank';
		a.rel = 'noopener noreferrer';
		a.style.display = 'none';
		document.body.appendChild(a);
		a.dispatchEvent(
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
				view: window,
				ctrlKey: true, // Windows/Linux: background tab
				metaKey: true // macOS: background tab
			})
		);
		a.remove();
	}

	function warpToGithub() {
		if (!githubRef) {
			openGithubTab();
			return;
		}
		// Suck the glyphs into the button first, open GitHub once they land. Reset the
		// scroll at the same time so the page is back at the top (the hero is pinned, so
		// this doesn't shift the restoring glyphs) when the user returns to this tab.
		field.warp(githubRef, () => {
			openGithubTab();
			window.scrollTo(0, 0);
		});
	}

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

<header class="sticky top-0 z-2 h-16 bg-transparent px-6 pt-4 sm:px-12 lg:px-35">
	<div class="flex flex-row items-center justify-between">
		<div
			class="flex flex-row items-center justify-center gap-3 transition-opacity duration-300 sm:gap-6"
			class:opacity-0={!scrolled}
			class:pointer-events-none={!scrolled}
			aria-hidden={!scrolled}
		>
			<span class="text-base font-bold whitespace-nowrap sm:text-xl">Void Projects</span>
			<a href="/blog" class="text-base whitespace-nowrap hover:opacity-60 sm:text-lg">Blog</a>
			<a href="/team" class="text-base whitespace-nowrap hover:opacity-60 sm:text-lg"
				>Meet The Team</a
			>
		</div>
	</div>
</header>
<main class="flex flex-col">
	<Section
		bind:ref={heroRef}
		glass={false}
		class="relative sticky top-16 h-[calc(100dvh-4rem)] items-center justify-center gap-3 overflow-clip"
	>
		<div class="flex flex-col items-center gap-4">
			<h1 class="text-5xl font-bold select-none sm:text-7xl lg:text-8xl" aria-label={heroTitle}>
				{#each titleChars as ch, i (i)}<span
						use:drift
						aria-hidden="true"
						style="display:inline-block;white-space:pre">{ch === ' ' ? '\u00A0' : ch}</span
					>{/each}
			</h1>
			<p class="px-2 text-center text-lg select-none sm:text-2xl" aria-label={heroSubtitle}>
				{#each subtitleChars as ch, i (i)}<span
						use:drift
						aria-hidden="true"
						style="display:inline-block;white-space:pre">{ch === ' ' ? '\u00A0' : ch}</span
					>{/each}
			</p>
			<div use:drift bind:this={githubRef} class="inline-block">
				<Button
					variant="ghost"
					size="lg"
					class="group/github h-auto cursor-pointer gap-2.5 px-5 py-3 text-xl font-semibold text-primary hover:bg-primary/10 hover:text-primary"
					onclick={warpToGithub}
				>
					<svg
						class="size-6 transition-transform group-hover/github:scale-110"
						viewBox="0 0 24 24"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
						/>
					</svg>
					Warp to Github
				</Button>
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
			<Feature
				title="Wormhole"
				desc="Query a teammate's local notes in your favorite agent harness."
			/>
		</ScrollReveal>
		<div
			class="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 transition-opacity duration-300 select-none"
			class:opacity-0={scrolled}
			class:pointer-events-none={scrolled}
			aria-hidden={scrolled}
		>
			<span class="text-sm tracking-wide opacity-70">Scroll for our work</span>
			<ChevronDown class="size-6 animate-bounce opacity-70" />
		</div>
	</Section>
	<div class="h-1250"></div>
</main>

<ReducedMotionNotice />
