<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/shadcn/ui/button/index.js';
	import { Section } from '$lib/components/section/index.js';
	import { ChevronDown } from '@lucide/svelte';
	import {
		PhysicsStage,
		GlyphField,
		ProjectCard as ProjectCardActor,
		RelationGraph
	} from '$lib/physics/index.js';
	import type { GraphSpec, GraphLink } from '$lib/physics/index.js';
	import { NudgeField } from '$lib/nudge/index.js';
	import { ReducedMotionNotice } from '$lib/components/reduced-motion-notice/index.js';
	import { ProjectCard } from '$lib/components/project-card/index.js';

	let heroRef = $state<HTMLElement | null>(null);
	let githubRef = $state<HTMLElement | null>(null);

	let scrolled = $state(false);

	const heroTitle = 'Void Projects';
	const titleChars = [...heroTitle];

	const heroSubtitle = 'AI-centric projects from a developer collective.';
	const subtitleChars = [...heroSubtitle];

	// Per-character word membership, so the Constellation graph can bind the letters
	// of each word into a chain and hook each word back to the card. Spaces get null
	// (they stay pure drifters, not graph nodes). Word ids are unique across both
	// lines so each word is its own cluster.
	type CharMeta = { word: number; pos: number } | null;
	function wordMeta(chars: string[], start: number): { meta: CharMeta[]; next: number } {
		const meta: CharMeta[] = [];
		let word = start;
		let pos = 0;
		let inWord = false;
		for (const ch of chars) {
			if (ch === ' ') {
				meta.push(null);
				if (inWord) {
					word++;
					pos = 0;
					inWord = false;
				}
			} else {
				inWord = true;
				meta.push({ word, pos });
				pos++;
			}
		}
		if (inWord) word++; // count the trailing word
		return { meta, next: word };
	}
	const titleWM = wordMeta(titleChars, 0);
	const subtitleWM = wordMeta(subtitleChars, titleWM.next);
	const titleMeta = titleWM.meta;
	const subtitleMeta = subtitleWM.meta;

	// The shared Matter world. The glyph title and the project cards are actors on
	// it, so the free-floating glyphs actually collide with the heavy cards.
	const stage = new PhysicsStage();
	const glyphs = new GlyphField();
	stage.add(glyphs);

	// Each card tosses in from below as scroll crosses its threshold, one after the
	// next, and ejects back out the bottom on the way up. Distinct `class` vertical
	// homes keep them readable (and un-stacked under reduced motion).
	const cards = [
		{
			actor: new ProjectCardActor({ threshold: 0.3 }),
			title: 'Constellation',
			desc: 'Transform disjointed, amorphic systems into accessible graphs of knowledge.',
			// Private for now: the card shows "Coming soon" instead of a live repo link.
			repo: null,
			class: 'top-[18%]'
		},
		{
			actor: new ProjectCardActor({ threshold: 0.5 }),
			title: 'Protostar',
			desc: 'Shareable, private, and internal agent skills that get better as you use them.',
			repo: 'https://github.com/voidprojectssoftware/protostar-cli',
			class: 'top-[42%]'
		},
		{
			actor: new ProjectCardActor({ threshold: 0.7 }),
			title: 'Wormhole',
			desc: "Query a teammate's local notes in your favorite agent harness.",
			repo: 'https://github.com/voidprojectssoftware/wormhole',
			class: 'top-[66%]'
		}
	];
	for (const c of cards) stage.add(c.actor);

	// Subtle cursor-repel-with-spring-back at rest. It and the drift take turns on
	// the same glyphs: drift owns them while free-floating/warping, the nudge owns
	// them at rest. The GlyphField fires onActiveChange right as it takes/hands back.
	// Subtle and heavy: a small, short-reaching shove with high inertia and a soft
	// spring, so the glyphs lean away sluggishly and drift back rather than snapping.
	const nudgeField = new NudgeField({
		radius: 85,
		push: 0.32,
		stiffness: 0.05,
		damping: 0.9,
		mass: 7,
		maxOffset: 7
	});
	glyphs.onActiveChange = (active) => (active ? nudgeField.disable() : nudgeField.enable());

	// Svelte action — tag any element that should become a drifting glyph.
	const drift = (el: HTMLElement) => ({ destroy: glyphs.register(el) });

	// Svelte action — tag any element that should react to the cursor at rest.
	const nudge = (el: HTMLElement) => ({ destroy: nudgeField.register(el) });

	// --- Constellation card effect: the relationship graph ---------------------
	// When the Constellation card tosses in, pull the scattered glyphs into a graph
	// centered on it; tear it down when it leaves. RelationGraph is generic over
	// bodies, so it links the glyphs, the GitHub button, and the card without any of
	// them knowing about each other — the composition root wires them up here.
	const graph = new RelationGraph();
	stage.add(graph);

	// Pin the card and blow the glyphs off it in a direction, so the graph stays clear
	// of the card and reads well: card on the left with the flow going right on desktop
	// (room to spread sideways), card at the bottom with the flow going up on mobile.
	// Both re-evaluated each frame, so they follow resizes and rotation.
	graph.hubAnchor = (w, h) =>
		w >= 768
			? { x: w * 0.22, y: h * 0.5 } // desktop: card on the left
			: { x: w * 0.5, y: h * 0.8 }; // mobile: card at the bottom
	graph.flowDirection = (w) =>
		w >= 768
			? { x: 1, y: 0 } // desktop: flow right
			: { x: 0, y: -1 }; // mobile: flow up
	// Narrow screens stack the words vertically, so pull the spine much tighter there:
	// shorter rest length and a much stiffer link so it actually holds against the
	// repulsion instead of stretching tall.
	graph.linkLengthFor = (w) => (w >= 768 ? 120 : 38);
	graph.linkStiffnessFor = (w) => (w >= 768 ? 0.006 : 0.07);

	// Element refs per word (indexed by the contiguous word id, then by position),
	// filled by `driftNode` so the spec can resolve each word's letters to their
	// live bodies at activation time.
	const wordEls: HTMLElement[][] = [];

	// Like `drift`, but also files the element under its word so it can become a
	// graph node. Spaces (meta === null) stay plain drifters, not nodes.
	const driftNode = (el: HTMLElement, meta: CharMeta) => {
		const destroy = glyphs.register(el);
		if (meta) (wordEls[meta.word] ??= [])[meta.pos] = el;
		return { destroy };
	};

	// The spine: the relationship between each consecutive pair of words, a
	// dependency-grammar reading ("language as a graph"). Aligned to word order
	// (Void, Projects, AI-centric, projects, from, a, developer, collective).
	const LINK_LABELS = [
		'modifies', // Void -> Projects
		'elaborated by', // Projects -> AI-centric
		'describes', // AI-centric -> projects
		'extends', // projects -> from
		'introduces', // from -> a
		'scopes', // a -> developer
		'modifies' // developer -> collective
	];
	const constellationCard = cards.find((c) => c.title === 'Constellation');

	function buildConstellationSpec(): GraphSpec | null {
		const clusters: GraphSpec['clusters'] = [];
		for (const els of wordEls) {
			if (!els) continue;
			const nodes = els
				.map((el) => glyphs.bodyFor(el))
				.filter((body): body is NonNullable<typeof body> => body != null)
				.map((body) => ({ body }));
			if (nodes.length === 0) continue;
			clusters.push({ nodes, intraLabel: 'precedes' }); // each letter precedes the next
		}
		if (clusters.length === 0) return null;

		// One link from the Constellation card out to the V of Void (the first cluster's
		// anchor), opted in via its hubLabel. No other word ties to the card.
		clusters[0].hubLabel = 'maps to';

		// Reconnect consecutive clusters into one chain.
		const links: GraphLink[] = [];
		for (let i = 0; i < clusters.length - 1; i++) {
			links.push({ from: i, to: i + 1, label: LINK_LABELS[i] ?? 'relates to' });
		}

		// The card is the hub (its one link is to Void) and also repels the glyphs.
		const cardBody = constellationCard?.actor.body;
		const hub = cardBody ? { body: cardBody } : undefined;

		return { clusters, links, hub };
	}

	if (constellationCard) {
		constellationCard.actor.onStateChange = (state) => {
			if (state === 'active') {
				const spec = buildConstellationSpec();
				if (spec) graph.activate(spec);
			} else if (state === 'ejecting') {
				graph.deactivate();
			}
		};
	}

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

	function warpToGithub(event: MouseEvent) {
		// Drop the relationship springs first if the graph is live, so they don't fight
		// the warp as it grabs the glyphs and sucks them into the button.
		graph.deactivate();

		// The button is a real <a target="_blank">, so a native click always opens the
		// tab from a genuine user gesture. Touch devices (notably iOS Safari) block both
		// the deferred open and the synthetic Ctrl/Cmd-click background-tab trick, so let
		// the anchor do its native thing there and skip the warp (the page navigates away
		// anyway). Only enhance on fine-pointer devices where the fancy path works.
		const canEnhance = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
		if (!canEnhance || !githubRef) {
			// Touch path: the native anchor is about to navigate away, so we can't run the
			// warp. Still reset synchronously here (scroll to top, send the glyphs home) so
			// the page is clean when the user switches back to this tab. The hero is pinned,
			// so scrolling to top doesn't shift the restoring glyphs.
			window.scrollTo(0, 0);
			glyphs.return_();
			return;
		}

		// Desktop: keep the user here to watch the warp, then open a background tab.
		// Suck the glyphs into the button first, open GitHub once they land. Reset the
		// scroll at the same time so the page is back at the top (the hero is pinned, so
		// this doesn't shift the restoring glyphs) when the user returns to this tab.
		event.preventDefault();
		glyphs.warp(githubRef, () => {
			openGithubTab();
			window.scrollTo(0, 0);
		});
	}

	onMount(() => {
		const onScroll = () => {
			scrolled = window.scrollY > 0;
			const scrollable = document.documentElement.scrollHeight - window.innerHeight;
			const progress = scrollable > 0 ? Math.max(0, Math.min(1, window.scrollY / scrollable)) : 0;
			stage.setScrollProgress(progress);
		};

		window.addEventListener('scroll', onScroll, { passive: true });

		// At rest the glyphs react to the cursor; drift takes over on scroll/warp.
		nudgeField.enable();

		// Console-driven debug overlay: `driftDebug()` to show, `driftDebug(false)` to hide.
		const w = window as typeof window & { driftDebug?: (on?: boolean) => void };
		w.driftDebug = (on = true) => (on ? stage.enableDebug() : stage.disableDebug());
		console.info('[drift] run driftDebug() in the console to overlay the physics wireframe');

		return () => {
			window.removeEventListener('scroll', onScroll);
			delete w.driftDebug;
			stage.destroy();
			nudgeField.destroy();
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
			<h1
				class="pointer-events-none text-5xl font-bold select-none sm:text-7xl lg:text-8xl"
				aria-label={heroTitle}
			>
				{#each titleChars as ch, i (i)}<span
						use:driftNode={titleMeta[i]}
						use:nudge
						aria-hidden="true"
						style="display:inline-block;white-space:pre">{ch === ' ' ? '\u00A0' : ch}</span
					>{/each}
			</h1>
			<p
				class="pointer-events-none px-2 text-center text-lg select-none sm:text-2xl"
				aria-label={heroSubtitle}
			>
				{#each subtitleChars as ch, i (i)}<span
						use:driftNode={subtitleMeta[i]}
						use:nudge
						aria-hidden="true"
						style="display:inline-block;white-space:pre">{ch === ' ' ? '\u00A0' : ch}</span
					>{/each}
			</p>
			<div use:drift bind:this={githubRef} class="inline-block">
				<Button
					href={GITHUB_URL}
					target="_blank"
					rel="noopener noreferrer"
					draggable={false}
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
		{#each cards as card (card.title)}
			<ProjectCard
				actor={card.actor}
				title={card.title}
				desc={card.desc}
				repo={card.repo}
				class={card.class}
			/>
		{/each}
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
