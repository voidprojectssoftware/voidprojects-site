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
	import { ScrollTimeline } from '$lib/components/scroll-timeline/index.js';
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import { ProfileCard } from '$lib/components/profile-card/index.js';

	let heroRef = $state<HTMLElement | null>(null);
	let githubRef = $state<HTMLElement | null>(null);
	let carouselRef = $state<HTMLElement | null>(null);
	let activeTeamIndex = $state(0);

	let scrolled = $state(false);
	// Total page-scroll progress (0-1), mirrored into state so the timeline rail can
	// track it; the same value is fanned to the physics stage in onScroll.
	let scrollProgress = $state(0);
	const DRIFT_THRESHOLD = 0.25;
	const EXIT_THRESHOLD = 0.75;
	const sectionVisible = $derived(scrollProgress >= EXIT_THRESHOLD);

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
		{ title: 'Meet The Team', threshold: EXIT_THRESHOLD }
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
		event.preventDefault();
		glyphs.warp(githubRef, () => {
			openGithubTab();
			window.scrollTo(0, 0);
		});
	}

	function onCarouselScroll(e: Event) {
		const el = e.currentTarget as HTMLElement;
		activeTeamIndex = Math.round(el.scrollLeft / el.offsetWidth);
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

		let last = measure();
		let autoReturning = false;

		const onScroll = () => {
			const { y, progress } = measure();
			scrolled = y > 0;
			scrollProgress = progress;
			stage.setScrollProgress(progress);

			if (!reduceMotion) {
				if (autoReturning) {
					// Stand down once home, or if the user pushed back down and took over.
					if (y <= 1 || y > last.y) autoReturning = false;
				} else if (last.progress >= firstCardThreshold && progress < firstCardThreshold) {
					// Crossed up out of the projects: glide to the top so the title reforms at
					// the origin rather than leaving the user in the scattered-glyph limbo.
					autoReturning = true;
					window.scrollTo({ top: 0, behavior: 'smooth' });
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
			delete w.driftDebug;
			delete w.driftState;
			clearScene();
			stage.destroy();
			nudgeField.destroy();
		};
	});
</script>

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
		>I thrive off of being enabled to learn new tech stacks, solving niche problems, and being let
		loose on an end-to-end solution. In particular, I love web-based products and architecting
		solutions that allow me to be creative.</span
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
		>You might find me traveling to new cities, hiking, camping, and playing far too many video
		games.</span
	>
{/snippet}

<SiteHeader {scrolled}></SiteHeader>
<main class="flex flex-col">
	<Section
		bind:ref={heroRef}
		glass={false}
		class="relative sticky top-16 h-[calc(100dvh-4rem)] items-center justify-center gap-3 overflow-clip"
	>
		<div
			class="flex flex-col items-center gap-4 transition-opacity duration-700"
			class:opacity-0={sectionVisible}
			class:pointer-events-none={sectionVisible}
		>
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
		<div
			class="absolute inset-0 z-10 flex flex-col items-center justify-center transition-opacity duration-700"
			class:opacity-0={!sectionVisible}
			class:pointer-events-none={!sectionVisible}
			aria-hidden={!sectionVisible}
		>
			<!-- Desktop (> 600px): stacked list -->
			<div class="hidden min-[601px]:flex flex-col items-center gap-10 px-8 py-6">
				<ProfileCard
					src="src/lib/assets/larryProfilePicture2024.jpg"
					alt="Larry Jones"
					name="Larry Jones"
					role="Co-Founder"
					email="larryjones@voidprojects.ai"
					linkedin="https://www.linkedin.com/in/lrryjns/"
					desc={larryDesc}
				/>
				<ProfileCard
					src="src/lib/assets/IMG_2021.JPEG"
					alt="Blake Hastings"
					name="Blake Hastings"
					role="Co-Founder"
					email="blakehastings@voidprojects.ai"
					linkedin="https://www.linkedin.com/in/the-blake-hastings/"
					desc={blakeDesc}
				/>
				<ProfileCard
					src="src/lib/assets/100_2013.JPEG"
					alt="Jackson Torregrossa"
					name="Jackson Torregrossa"
					role="Co-Founder"
					email="jacksontorregrossa@voidprojects.ai"
					linkedin="https://www.linkedin.com/in/jackson-torregrossa/"
					desc={jacksonDesc}
				/>
			</div>
			<!-- Mobile (≤ 600px): swipeable carousel -->
			<div class="contents min-[601px]:hidden">
				<div
					bind:this={carouselRef}
					onscroll={onCarouselScroll}
					class="flex w-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
				>
					<div class="flex w-full shrink-0 snap-center items-center justify-center px-8 py-6">
						<ProfileCard
							src="src/lib/assets/larryProfilePicture2024.jpg"
							alt="Larry Jones"
							name="Larry Jones"
							role="Co-Founder"
							email="larryjones@voidprojects.ai"
							linkedin="https://www.linkedin.com/in/lrryjns/"
							desc={larryDesc}
						/>
					</div>
					<div class="flex w-full shrink-0 snap-center items-center justify-center px-8 py-6">
						<ProfileCard
							src="src/lib/assets/IMG_2021.JPEG"
							alt="Blake Hastings"
							name="Blake Hastings"
							role="Co-Founder"
							email="blakehastings@voidprojects.ai"
							linkedin="https://www.linkedin.com/in/the-blake-hastings/"
							desc={blakeDesc}
						/>
					</div>
					<div class="flex w-full shrink-0 snap-center items-center justify-center px-8 py-6">
						<ProfileCard
							src="src/lib/assets/100_2013.JPEG"
							alt="Jackson Torregrossa"
							name="Jackson Torregrossa"
							role="Co-Founder"
							email="jacksontorregrossa@voidprojects.ai"
							linkedin="https://www.linkedin.com/in/jackson-torregrossa/"
							desc={jacksonDesc}
						/>
					</div>
				</div>
				<div class="flex gap-2" aria-hidden="true">
					{#each [0, 1, 2] as i}
						<button
							type="button"
							aria-label="View profile {i + 1}"
							onclick={() => carouselRef?.scrollTo({ left: i * (carouselRef?.offsetWidth ?? 0), behavior: 'smooth' })}
							class="size-2 rounded-full transition-all duration-300 {i === activeTeamIndex
								? 'scale-125 bg-primary'
								: 'bg-foreground/30'}"
						></button>
					{/each}
				</div>
			</div>
		</div>
	</Section>
	<div class="h-1250"></div>
</main>

<ScrollTimeline
	points={timelinePoints}
	progress={scrollProgress}
	visible={scrolled}
	onSeek={seekTo}
/>

<ReducedMotionNotice />
