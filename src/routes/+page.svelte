<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/shadcn/ui/button/index.js';
	import { Section } from '$lib/components/section/index.js';
	import {
		Blocks,
		ChevronDown,
		GraduationCap,
		MessagesSquare,
		PanelsTopLeft
	} from '@lucide/svelte';
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
	import { ScrollTimeline } from '$lib/components/scroll-timeline/index.js';
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import { ProfileCard } from '$lib/components/profile-card/index.js';
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';
	import { Section as PageSection } from '$lib/components/voidprojects/section/index.js';
	import type { Component } from 'svelte';
	import { headshots } from '$lib/assets/headshots.js';
	import { JsonLd } from '$lib/components/json-ld/index.js';
	import { PageMeta } from '$lib/components/page-meta/index.js';
	import { PAGES, organizationJsonLd } from '$lib/seo/site.js';
	import {
		HERO_CTA,
		HERO_LINE,
		SERVICES,
		SERVICES_HEADING,
		SERVICES_INTRO,
		WHY_LESS
	} from '$lib/content/services.js';

	const team = [
		{
			name: 'Larry Jones',
			src: headshots.larry,
			subrole: 'Constellation Technical Lead',
			skills: ['C#', 'SQL', 'Data Engineering', 'Graph Databases'],
			email: 'larryjones@voidprojects.ai',
			linkedin: 'https://www.linkedin.com/in/lrryjns/',
			desc: larryDesc
		},
		{
			name: 'Blake Hastings',
			src: headshots.blake,
			subrole: 'Protostar Technical Lead',
			skills: ['Agentic Development', 'C#', '.NET', 'Web Dev', 'Agile', 'Enterprise Systems'],
			email: 'blakehastings@voidprojects.ai',
			linkedin: 'https://www.linkedin.com/in/the-blake-hastings/',
			desc: blakeDesc
		},
		{
			name: 'Jackson Torregrossa',
			src: headshots.jackson,
			subrole: 'Full Stack Developer',
			skills: ['C#', 'TypeScript', 'React', 'Svelte', 'Tailwind', 'Front End Design'],
			email: 'jacksontorregrossa@voidprojects.ai',
			linkedin: 'https://www.linkedin.com/in/jackson-torregrossa/',
			desc: jacksonDesc
		}
	];

	let heroRef = $state<HTMLElement | null>(null);
	let githubRef = $state<HTMLElement | null>(null);
	let servicesRef = $state<HTMLElement | null>(null);
	let heroFade = $state(1); // hero opacity; drops as the services section scrolls over it

	const SERVICE_ICONS: Record<string, Component> = {
		consulting: MessagesSquare,
		software: Blocks,
		website: PanelsTopLeft,
		training: GraduationCap
	};
	let scrolled = $state(false);
	// Total page-scroll progress (0-1), mirrored into state so the timeline rail can
	// track it; the same value is fanned to the physics stage in onScroll.
	let scrollProgress = $state(0);
	const DRIFT_THRESHOLD = 0.25;
	const EXIT_THRESHOLD = 0.75;
	const sectionVisible = $derived(scrollProgress >= EXIT_THRESHOLD);
	const drifting = $derived(scrollProgress >= DRIFT_THRESHOLD);

	const heroTitle = 'Void Projects';
	const titleChars = [...heroTitle];

	const heroSubtitle = HERO_LINE;
	const subtitleChars = [...heroSubtitle];

	// Character indexes grouped into words and single spaces, so each word renders in a
	// no-wrap box: the letters are separate inline-blocks (for the drift), and without
	// the box a narrow screen would break a line mid-word.
	function wordRuns(chars: string[]): number[][] {
		const runs: number[][] = [];
		chars.forEach((ch, i) => {
			const prev = runs.at(-1);
			if (ch !== ' ' && prev && chars[prev[0]] !== ' ') prev.push(i);
			else runs.push([i]);
		});
		return runs;
	}
	const titleRuns = wordRuns(titleChars);
	const subtitleRuns = wordRuns(subtitleChars);

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
	// it, so the free-floating glyphs actually collide with the heavy cards. Matter
	// itself loads after hydration (see `stage.init()` in onMount).
	const stage = new PhysicsStage();
	const glyphs = new GlyphField({ driftThreshold: DRIFT_THRESHOLD });
	stage.add(glyphs);

	// Each card tosses in from below as scroll crosses its threshold, one after the
	// next, and ejects back out the bottom on the way up. Distinct `class` vertical
	// homes keep them readable (and un-stacked under reduced motion). `threshold` is
	// the scroll fraction the card arrives at — kept as a field so the same value
	// drives both the actor and the scroll-timeline marker (one source of truth).
	const cardDefs = [
		{
			threshold: 0.5,
			exitThreshold: EXIT_THRESHOLD,
			title: 'Constellation',
			desc: 'Transform disjointed, amorphic systems into accessible graphs of knowledge.',
			// Private for now: the card shows "Coming soon" instead of a live repo link.
			repo: null,
			class: 'top-[18%]'
		}
	];
	const cards = cardDefs.map((d) => ({
		...d,
		actor: new ProjectCardActor({ threshold: d.threshold, exitThreshold: d.exitThreshold })
	}));
	for (const c of cards) stage.add(c.actor);

	// Cards toss in at their threshold and finish flying into view just a hair later, so
	// nudge each marker down a touch: reaching the dot then lines up with the card
	// actually showing up, not with the toss threshold. Kept small — the card is visible
	// only slightly past its threshold on a normal scroll. Tune to taste.
	const CARD_ARRIVAL_OFFSET = 0.02;

	// The timeline waypoints, in scroll order: first "The Void" — where the title glyphs
	// begin drifting apart (the glyph drift threshold), an instant trigger so it takes no
	// arrival nudge — then one marker per project at the scroll fraction it tosses in at.
	const timelinePoints = [
		{ title: 'The Void', threshold: DRIFT_THRESHOLD },
		...cardDefs.map((d) => ({
			title: d.title,
			threshold: d.threshold,
			arrivalOffset: CARD_ARRIVAL_OFFSET
		})),
		// Also needs the arrival nudge, but for the opposite reason: exiting a card is a
		// strict `progress > exitThreshold` check (project-card.ts), so a seek that lands
		// exactly on the threshold — same value as this marker's own — never actually
		// crosses it and leaves the Constellation graph stuck formed.
		{ title: 'Meet The Team', threshold: EXIT_THRESHOLD, arrivalOffset: CARD_ARRIVAL_OFFSET }
	];

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
	// The card-to-V "maps to" edge: pull it in close on mobile like the spine.
	graph.hubLengthFor = (w) => (w >= 768 ? 330 : 90);

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
	// (Void, Projects, Consulting, custom, software, websites, and, AI, training).
	const LINK_LABELS = [
		'modifies', // Void -> Projects
		'offers', // Projects -> Consulting
		'lists', // Consulting -> custom
		'modifies', // custom -> software
		'lists', // software -> websites
		'joins', // websites -> and
		'joins', // and -> AI
		'modifies' // AI -> training
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

	// The Constellation card's arrival is a little timed scene, played on the stage's
	// frame clock via `stage.schedule` (one cancellable seam for "over time" effects,
	// not stray setTimeouts): the card crashes in SOLID and bulldozes the drifting
	// glyphs around (the chaos); when the graph forms the card stops colliding so the
	// letters can pull into formation straight through it; once it has settled the card
	// collides again so it has real presence in the constellation.
	const SCENE = {
		graphFormMs: 1100, // card has shoved the glyphs around; now the graph forms + the card opens
		cardOpenMs: 1600 // how long the card stays non-colliding after that, so the formation settles
	};
	let sceneCues: Array<() => void> = []; // cancel handles for the in-flight scene
	const clearScene = () => {
		for (const cancel of sceneCues) cancel();
		sceneCues = [];
	};

	// The GitHub button docks at the bottom only while a project card is on screen, so
	// count cards in flight and toggle the dock as the first arrives / last leaves.
	// Cards go active -> ejecting -> dormant, so count up on 'active', down on
	// 'ejecting'. The Constellation card additionally plays its arrival scene.
	let cardsOnScreen = 0;
	// Latest state per card, by title — the source of truth the introspection hook
	// (`window.driftState()`) reports, so tests assert on real state, not DOM output.
	const cardStates: Record<string, string> = {};
	for (const c of cards) {
		c.actor.onStateChange = (state) => {
			cardStates[c.title] = state;
			if (state === 'active') cardsOnScreen++;
			else if (state === 'ejecting') cardsOnScreen = Math.max(0, cardsOnScreen - 1);
			glyphs.setBottomBiasActive(cardsOnScreen > 0);

			if (c === constellationCard) {
				if (state === 'active') {
					clearScene();
					// The card arrives solid (default) and shoves the glyphs around for a beat.
					sceneCues = [
						// Then the graph forms and the card opens up (non-colliding) so the letters
						// can pull into formation through it. The spec is built at fire time, so it
						// captures where the bodies actually scattered to.
						stage.schedule(SCENE.graphFormMs, () => {
							const spec = buildConstellationSpec();
							if (spec) graph.activate(spec);
							constellationCard.actor.setColliding(false);
						}),
						// Once the formation has settled, the card collides again so it has presence.
						stage.schedule(SCENE.graphFormMs + SCENE.cardOpenMs, () =>
							constellationCard.actor.setColliding(true)
						)
					];
				} else if (state === 'ejecting') {
					clearScene(); // left mid-scene — cancel whatever hasn't played yet
					graph.deactivate();
				}
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
		// A click that beats the physics load waits for it; if Matter never arrives,
		// open the tab anyway rather than swallowing the click.
		event.preventDefault();
		const target = githubRef;
		stage.init().then(
			() =>
				glyphs.warp(target, () => {
					openGithubTab();
					window.scrollTo(0, 0);
				}),
			openGithubTab
		);
	}

	// Jump the page to a timeline point's scroll position (a project's arrival).
	function seekTo(threshold: number) {
		const scrollable = document.documentElement.scrollHeight - window.innerHeight;
		if (scrollable <= 0) return;
		window.scrollTo({
			top: threshold * scrollable,
			behavior: stage.reduceMotion ? 'auto' : 'smooth'
		});
	}

	onMount(() => {
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		// The scroll fraction at which the first project card tosses in. Below it sits the
		// "limbo" zone: the title has scattered but no project is on screen yet. Scrolling
		// down keeps that give (a beat of scattered glyphs before the projects arrive);
		// scrolling back up past it means the projects have all left, so we glide home to
		// the origin instead of stranding the user in the empty limbo with a broken title.
		const firstCardThreshold = Math.min(...cards.map((c) => c.actor.threshold));

		const measure = () => {
			const y = window.scrollY;
			const scrollable = document.documentElement.scrollHeight - window.innerHeight;
			return { y, progress: scrollable > 0 ? Math.max(0, Math.min(1, y / scrollable)) : 0 };
		};

		// Fetch Matter once the page is idle after hydration, or on the first scroll if
		// that comes sooner. The stage holds any earlier scroll progress and replays it.
		const startPhysics = () =>
			void stage.init().catch((err) => console.warn('[drift] physics failed to load', err));
		const idle = window.requestIdleCallback
			? window.requestIdleCallback(startPhysics, { timeout: 1000 })
			: window.setTimeout(startPhysics, 200);
		const cancelIdle = () =>
			window.cancelIdleCallback ? window.cancelIdleCallback(idle) : window.clearTimeout(idle);

		let last = measure();
		let autoReturning = false;
		let returnTo = 0;
		// Share of the viewport below the header that the services section covers (0-1).
		const servicesCoverage = () => {
			if (!servicesRef) return 0;
			const header = document.querySelector('header')?.offsetHeight ?? 0;
			const r = servicesRef.getBoundingClientRect();
			const seen = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, header);
			return Math.max(0, seen) / (window.innerHeight - header);
		};
		// The services section sits between the hero and the scene, below the sticky header.
		const servicesTop = () => {
			if (!servicesRef) return 0;
			const header = document.querySelector('header')?.offsetHeight ?? 0;
			return servicesRef.getBoundingClientRect().top + window.scrollY - header;
		};

		const onScroll = () => {
			const { y, progress } = measure();
			scrolled = y > 0;
			scrollProgress = progress;
			heroFade = 1 - Math.min(1, servicesCoverage() * 1.4);
			startPhysics();
			stage.setScrollProgress(progress);
			// Re-evaluate after setScrollProgress: a card's onStateChange (fired above)
			// may have just changed cardsOnScreen, and sectionVisible already reflects
			// the scrollProgress write above.
			glyphs.setBottomBiasActive(cardsOnScreen > 0 || sectionVisible);

			if (!reduceMotion) {
				if (autoReturning) {
					// Stand down once home, or if the user pushed back down and took over.
					if (y <= returnTo + 1 || y > last.y) autoReturning = false;
				} else if (last.progress >= firstCardThreshold && progress < firstCardThreshold) {
					// Crossed up out of the projects: glide back to the services section (the
					// title reforms behind it) rather than leaving the user in the scattered-glyph
					// limbo, and without skipping past the services on the way to the top.
					autoReturning = true;
					returnTo = Math.max(0, servicesTop());
					window.scrollTo({ top: returnTo, behavior: 'smooth' });
				}
			}

			last = { y, progress };
		};

		window.addEventListener('scroll', onScroll, { passive: true });

		// At rest the glyphs react to the cursor; drift takes over on scroll/warp.
		nudgeField.enable();

		// Left to drift freely the GitHub button snags in the glyphs and cards (and on
		// mobile a scroll-up swipe plows it to the top, stranding it in zero-g). Tag it so
		// the field docks it down at the bottom-centre, clear of the pile, once a card is up.
		if (githubRef) glyphs.setBottomBias(githubRef);

		// Console-driven debug overlay: `driftDebug()` to show, `driftDebug(false)` to hide.
		// `driftState()` returns a read-only snapshot of the real animation state (card
		// states, whether the graph has formed, the GitHub dock + its rendered centre),
		// so it can be inspected from the console and asserted on without scraping the
		// DOM for incidental output.
		const w = window as typeof window & {
			driftDebug?: (on?: boolean) => void;
			driftState?: () => unknown;
		};
		w.driftDebug = (on = true) => (on ? stage.enableDebug() : stage.disableDebug());
		w.driftState = () => {
			const r = githubRef?.getBoundingClientRect();
			const cardBody = constellationCard?.actor.body ?? null;
			return {
				cards: cards.map((c) => ({ title: c.title, state: cardStates[c.title] ?? 'dormant' })),
				graph: { formed: graph.formed },
				// null = no live body (dormant); otherwise whether it currently collides.
				constellationColliding: cardBody ? !cardBody.isSensor : null,
				dock: {
					active: cardsOnScreen > 0,
					buttonCenter: r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null
				}
			};
		};
		console.info(
			'[drift] run driftDebug() to overlay the physics wireframe, driftState() to read state'
		);

		return () => {
			window.removeEventListener('scroll', onScroll);
			cancelIdle();
			delete w.driftDebug;
			delete w.driftState;
			clearScene();
			stage.destroy();
			nudgeField.destroy();
		};
	});
</script>

<svelte:head>
	<PageMeta meta={PAGES.home} />
	<JsonLd data={organizationJsonLd()} />
</svelte:head>

{#snippet larryDesc()}
	<span
		>I'm a seasoned, multi-disciplinary engineer with a broad depth of expertise and experience.
		I've spent time with point-of-sale systems, cash recyclers, and incredibly complex
		enterprise-level microservice architecture.</span
	>
	<span
		>I love to walk for a ridiculous amount of time, play tennis, and aggressively sell my dusty
		music gear.</span
	>
{/snippet}

{#snippet jacksonDesc()}
	<span
		>I thrive off of learning new tech stacks, solving niche problems, and being let loose on an
		end-to-end solution. In particular, I love web-based products and architecting solutions that
		allow me to be creative.</span
	>
	<span
		>My best days usually consist of making music, spending time with my friends and family, and
		reading books related to whatever interests me.</span
	>
{/snippet}

{#snippet blakeDesc()}
	<span
		>I love to engage with emerging technologies, push myself with challenging projects, and
		continually chase the cool stuff. Experimenting with AI agents, automating my life away,
		breaking websites. I do it all passionately!</span
	>
	<span
		>You might find me traveling to new cities, hiking, and camping, always with a computer by my
		side.</span
	>
{/snippet}

{#snippet glyphRun(chars: string[], meta: CharMeta[], run: number[])}<span
		class="inline-block whitespace-nowrap"
		>{#each run as i (i)}<span
				use:driftNode={meta[i]}
				use:nudge
				aria-hidden="true"
				style="display:inline-block;white-space:pre">{chars[i] === ' ' ? '\u00A0' : chars[i]}</span
			>{/each}</span
	>{/snippet}

<SiteHeader />
<main id="main-content" class="flex flex-col">
	<Section
		bind:ref={heroRef}
		glass={false}
		class="relative sticky top-16 h-[calc(100dvh-4rem)] items-center justify-center gap-3 overflow-clip"
	>
		<div class="flex flex-col items-center gap-4" style:opacity={heroFade}>
			<div
				class="flex flex-col items-center gap-4 transition-opacity duration-700"
				class:opacity-0={sectionVisible}
				class:pointer-events-none={sectionVisible}
			>
				<h1
					class="pointer-events-none text-5xl font-bold select-none max-[600px]:text-4xl sm:text-7xl lg:text-8xl"
					aria-label={heroTitle}
				>
					{#each titleRuns as run, r (r)}{@render glyphRun(titleChars, titleMeta, run)}{/each}
				</h1>
				<p
					class="pointer-events-none px-2 text-center text-lg select-none sm:text-2xl"
					aria-label={heroSubtitle}
				>
					{#each subtitleRuns as run, r (r)}{@render glyphRun(
							subtitleChars,
							subtitleMeta,
							run
						)}{/each}
				</p>
			</div>
			<div class="flex flex-wrap items-center justify-center gap-3 pt-2">
				<!-- Fades once the title scatters: unlike the GitHub button it does not drift. -->
				<a
					href="/contact"
					class="inline-flex h-11 items-center rounded-full bg-primary-strong px-6 text-sm font-semibold text-white transition-opacity duration-300 hover:bg-primary-strong/85"
					class:opacity-0={drifting}
					class:pointer-events-none={drifting}
					tabindex={drifting ? -1 : undefined}>{HERO_CTA}</a
				>
				<!-- Deliberately outside the fading div above: unlike the title/subtitle, the
			     GitHub button should stay up (and clickable) through the Meet The Team
			     section - z-20 lifts it above that section's own z-10 panel. Below lg the
			     stacked team cards fill the screen, so it fades there instead of covering one. -->
				<div
					use:drift
					bind:this={githubRef}
					class="relative z-20 inline-block transition-opacity duration-500 {sectionVisible
						? 'max-lg:pointer-events-none max-lg:opacity-0'
						: ''}"
				>
					<Button
						href={GITHUB_URL}
						target="_blank"
						rel="noopener noreferrer"
						draggable={false}
						variant="ghost"
						class="group/github h-11 cursor-pointer gap-2 rounded-full border border-foreground/15 px-6 text-sm font-semibold text-foreground hover:bg-foreground/5 hover:text-foreground"
						onclick={warpToGithub}
					>
						<svg
							class="size-4 transition-transform group-hover/github:scale-110"
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
			<span class="text-sm tracking-wide opacity-70">Scroll for what we do</span>
			<ChevronDown class="size-6 animate-bounce opacity-70" />
		</div>
		<div
			class="absolute inset-0 z-10 mb-10 flex flex-col items-center justify-center transition-opacity duration-700"
			class:opacity-0={!sectionVisible}
			class:pointer-events-none={!sectionVisible}
			aria-hidden={!sectionVisible}
		>
			<div
				class="grid w-full max-w-6xl grid-cols-1 items-start gap-3 px-4 lg:grid-cols-3 lg:gap-6 lg:px-8"
			>
				{#each team as member, i (member.name)}
					<div class="team-float" style:animation-delay="{i * -1.7}s">
						<GlassCard class="gap-0 bg-background/90 p-4 backdrop-blur-sm lg:p-6">
							<ProfileCard
								layout="vertical"
								src={member.src}
								alt={member.name}
								name={member.name}
								role="Co-Founder"
								subrole={member.subrole}
								skills={member.skills}
								linkedin={member.linkedin}
								desc={member.desc}
							/>
						</GlassCard>
					</div>
				{/each}
			</div>
		</div>
	</Section>
	<!-- In flow after the sticky hero, so it scrolls up over it (z-1); the hero fades as it
	     is covered (heroFade), so the sky shows between the cards and not the title. -->
	<PageSection bind:ref={servicesRef} wide class="relative z-1 pt-24 pb-24">
		<div
			id="services"
			class="mx-auto flex max-w-2xl scroll-mt-24 flex-col items-center gap-3 pb-10 text-center"
		>
			<h2 class="text-3xl font-bold tracking-tight">{SERVICES_HEADING}</h2>
			<p class="text-lg leading-relaxed text-balance text-foreground/65">{SERVICES_INTRO}</p>
		</div>
		<div class="grid w-full gap-5 md:grid-cols-2 xl:grid-cols-4">
			{#each SERVICES as service (service.key)}
				{@const Icon = SERVICE_ICONS[service.key]}
				<GlassCard class="h-full gap-3 p-6">
					<span class="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
						<Icon class="size-5" aria-hidden="true" />
					</span>
					<h3 class="pt-1 text-lg font-semibold">{service.title}</h3>
					<p class="text-sm leading-relaxed text-foreground/65">{service.body}</p>
					<div class="mt-auto flex flex-wrap gap-x-4 text-sm">
						{#if service.link}
							<a
								href={service.link.href}
								class="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline"
								>{service.link.label}</a
							>
						{/if}
						<a
							href="/contact?kind={service.key}"
							class="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline"
							>{service.ask}</a
						>
					</div>
				</GlassCard>
			{/each}
		</div>
		<div class="mx-auto flex max-w-3xl flex-col items-center gap-3 pt-16 text-center">
			<h3 class="text-2xl font-bold tracking-tight">{WHY_LESS.title}</h3>
			<p class="text-lg leading-relaxed text-balance text-foreground/65">{WHY_LESS.body}</p>
		</div>
	</PageSection>
	<div class="h-1250"></div>
</main>

<ScrollTimeline
	points={timelinePoints}
	progress={scrollProgress}
	visible={scrolled}
	onSeek={seekTo}
/>

<ReducedMotionNotice />

<style>
	/* Same idle bob as the never-grid scenes; each card runs on its own phase. */
	.team-float {
		animation: team-float 5.2s ease-in-out infinite alternate;
	}
	@keyframes team-float {
		from {
			translate: 0 0;
		}
		to {
			translate: 0 -8px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.team-float {
			animation: none;
		}
	}
</style>
