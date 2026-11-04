<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowUpRight, RefreshCw, Shapes, Undo2 } from '@lucide/svelte';
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import { Section } from '$lib/components/voidprojects/section/index.js';
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';
	import { PageMeta } from '$lib/components/page-meta/index.js';
	import { SkyExplainerBody, skyFacts } from '$lib/components/space-background/index.js';
	import { PAGES } from '$lib/seo/site.js';
	import {
		CRAFT_META,
		buildTrajectory,
		loadTrajectories,
		type TrajectoryData
	} from '$lib/trajectory';
	import { renderSpec } from '$lib/brand/labs/trajectory-logo.js';
	import { pickMarkSpec, randomSeed } from '$lib/brand/mark.js';
	import { brandColor } from '$lib/brand/colors.js';

	const REPO = 'https://github.com/voidprojectssoftware/voidprojects-site';

	const launchYear = (iso: string) => iso.slice(0, 4);

	// Random per visit, so the mark is drawn client-side after mount (a prerendered
	// one would mismatch on hydration). Starts on VISIT_SEED, the header's and tab's mark.
	let visitSeed = $state<number | null>(null);
	let seed = $state<number | null>(null);
	let ink = $state('');
	let data = $state.raw<TrajectoryData | null>(null);
	onMount(async () => {
		const [{ VISIT_SEED }, loaded] = await Promise.all([
			import('$lib/brand/visit-seed.js'),
			loadTrajectories()
		]);
		ink = brandColor('--color-primary');
		data = loaded;
		visitSeed = seed = VISIT_SEED;
	});

	const spec = $derived(seed === null || !data ? null : pickMarkSpec(data, seed, ink || undefined));
	const craft = $derived(spec && CRAFT_META.find((c) => c.id === spec.craftId));
	const markSvg = $derived(spec && data ? renderSpec(data, spec).svg : '');
	const pathSvg = $derived(
		spec && data
			? buildTrajectory(data, {
					craft: [spec.craftId],
					scale: spec.scale,
					maxAU: spec.reach,
					rotation: spec.rotationDeg,
					stroke: 1.4,
					smoothing: 1,
					palette: 'brand',
					planetRings: true,
					yearDots: true,
					yearEvery: 1,
					sun: true
				}).svg
			: ''
	);

	// The homepage's physics, confined to one panel: the same stage and glyph actor,
	// with some air friction so a throw settles and the loop parks when nothing moves.
	// Loaded after mount so Matter.js stays out of this page's initial bundle.
	const DEMO_WORD = 'Void Projects';
	const letterEls: HTMLElement[] = [];
	let demoBounds = $state<HTMLElement>();
	let demoStill = $state(false); // prefers-reduced-motion: letters stay at rest
	let resetDemo = $state<(() => void) | null>(null);
	onMount(() => {
		let disposed = false;
		let teardown: (() => void) | undefined;
		import('$lib/physics/index.js').then(async ({ PhysicsStage, GlyphField }) => {
			if (disposed || !demoBounds) return;
			const stage = new PhysicsStage({ bounds: demoBounds });
			await stage.init();
			if (disposed) {
				stage.destroy();
				return;
			}
			const glyphs = new GlyphField({
				frictionAir: 0.012,
				baseSpeed: 0.9,
				speedJitter: 0.4,
				spinRate: 0.01,
				mousePull: 0.02,
				mousePullRadius: 160,
				restSpeed: 0.03
			});
			stage.add(glyphs);
			for (const el of letterEls) if (el) glyphs.register(el);
			demoStill = stage.reduceMotion;

			// Reset eases the letters home; once they land, set them floating again.
			let replay = false;
			glyphs.onActiveChange = (active) => {
				if (!active && replay) {
					replay = false;
					glyphs.start();
				}
			};
			resetDemo = () => {
				replay = true;
				glyphs.return_();
			};

			// Run only while the panel is on screen and the tab is visible.
			let onScreen = false;
			let started = false;
			const syncPaused = () => stage.setPaused(!onScreen || document.hidden);
			const io = new IntersectionObserver(([entry]) => {
				onScreen = entry.isIntersecting;
				if (onScreen && !started) {
					started = true;
					glyphs.start();
				}
				syncPaused();
			});
			io.observe(demoBounds);
			document.addEventListener('visibilitychange', syncPaused);
			teardown = () => {
				io.disconnect();
				document.removeEventListener('visibilitychange', syncPaused);
				stage.destroy();
			};
		});
		return () => {
			disposed = true;
			teardown?.();
		};
	});

	// "Break the page": every [data-break] block in <main> comes loose and floats as a
	// body on a page-wide stage (document coordinates, so it scrolls with the page). The
	// stage only exists while broken; restoring eases the blocks home and destroys it.
	let mainEl = $state<HTMLElement>();
	let canBreak = $state(false); // stays false under reduced motion, which hides the control
	let broken = $state(false);
	let breaking = $state(false); // loading Matter or easing home; the toggle waits (aria-disabled, so it keeps focus)
	let breakNews = $state('');
	let breakDone: (() => void) | null = null; // drops the page's listeners and the stage, no animation
	let breakRestore: (() => void) | null = null;
	let pageAlive = true;

	onMount(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		const sync = () => {
			canBreak = !mq.matches;
			if (mq.matches) breakDone?.();
		};
		sync();
		mq.addEventListener('change', sync);
		return () => {
			mq.removeEventListener('change', sync);
			pageAlive = false;
			breakDone?.();
		};
	});

	async function breakPage() {
		if (broken || breaking || !mainEl) return;
		breaking = true;
		const { PhysicsStage, LooseBlocks } = await import('$lib/physics/index.js');
		const stage = new PhysicsStage({ bounds: document.documentElement, cursorForces: false });
		await stage.init();
		const blocks = new LooseBlocks();
		stage.add(blocks);
		for (const el of mainEl.querySelectorAll<HTMLElement>('[data-break]')) blocks.register(el);
		for (const el of mainEl.querySelectorAll<HTMLElement>('[data-break-solid]'))
			blocks.addObstacle(el);

		// A tilted block can poke a pixel past the side wall before the solver pushes it
		// back; clip that instead of growing a sideways scroll.
		const html = document.documentElement;
		const overflowX = html.style.overflowX;
		let width = window.innerWidth;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') restorePage();
		};
		const onVisibility = () => stage.setPaused(document.hidden);
		// Blocks hold their layout spot as a transform offset, so a reflow would leave them
		// measured wrong. A width change puts the page back instead (height alone is the
		// mobile toolbar sliding).
		const onResize = () => {
			if (window.innerWidth !== width) restorePage();
			width = window.innerWidth;
		};
		window.addEventListener('keydown', onKey);
		window.addEventListener('resize', onResize);
		document.addEventListener('visibilitychange', onVisibility);

		breakDone = () => {
			breakDone = breakRestore = null;
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('resize', onResize);
			document.removeEventListener('visibilitychange', onVisibility);
			stage.destroy(); // puts any loose block straight back
			html.style.overflowX = overflowX;
			broken = breaking = false;
		};
		blocks.onHome = () => {
			breakDone?.();
			breakNews = 'The page is back together.';
		};
		breakRestore = () => {
			breakRestore = null;
			broken = false;
			breaking = true;
			blocks.restore();
		};

		if (!canBreak || !pageAlive) {
			breakDone();
			return;
		}
		html.style.overflowX = 'clip';
		blocks.loosen();
		onVisibility();
		broken = true;
		breaking = false;
		breakNews = `The page is broken: ${blocks.count} blocks float free. Press Escape or choose Put the page back to restore it.`;
	}

	function restorePage() {
		breakRestore?.();
	}
</script>

<svelte:head>
	<PageMeta meta={PAGES.brand} />
</svelte:head>

<SiteHeader />

<main id="main-content" class="flex flex-col" bind:this={mainEl}>
	<Section wide class="items-center pt-20 pb-20 text-center sm:pt-28">
		<p data-break class="text-sm font-semibold tracking-[0.14em] text-primary uppercase">
			Our brand
		</p>
		<h1
			data-break
			class="max-w-3xl pt-3 text-4xl font-bold tracking-tight text-balance sm:text-6xl"
		>
			Nothing here sits still.
		</h1>
		<p data-break class="max-w-2xl pt-6 text-lg leading-relaxed text-balance text-foreground/70">
			Two things make Void Projects: the inspiration that drives our projects, and our ever-changing
			approach to all things tech.
		</p>
	</Section>

	<Section wide class="pb-24">
		<GlassCard
			data-break
			class="grid gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16"
		>
			<div class="flex flex-col gap-4">
				<h2 class="text-3xl font-bold tracking-tight">The logo that never sits still</h2>
				<p class="text-lg leading-relaxed text-foreground/70">
					Like our projects and technical pursuits, our logo is ever-changing. Each time you visit,
					our logo will be different, and hopefully our projects will stay constantly evolving.
				</p>
				<p class="leading-relaxed text-foreground/65">
					Each mark starts from a real spacecraft. We took the paths of {CRAFT_META.length} probes from
					NASA/JPL HORIZONS, one position a month, measured from the Sun and flattened onto the plane
					the planets orbit in, as if you were looking down on the solar system from above.
				</p>
				<p class="leading-relaxed text-foreground/65">
					To make a mark, the generator picks one probe, crops its path at a chosen distance from
					the Sun, stretches the distance scale so the loops near the planets stay readable, then
					repeats that arm around the centre three, four, five, six or eight times, sometimes
					mirrored. Rolls that come out too small or too dense to read at icon size are thrown back.
				</p>
			</div>

			<div class="flex flex-col gap-4">
				<div class="grid grid-cols-2 gap-4">
					<figure class="flex flex-col gap-2">
						<div class="aspect-square rounded-2xl bg-background/40 p-3 ring-1 ring-foreground/10">
							<span class="block size-full [&>svg]:size-full" aria-hidden="true">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html pathSvg}
							</span>
						</div>
						<figcaption class="text-xs text-foreground/55">The real path</figcaption>
					</figure>
					<figure class="flex flex-col gap-2">
						<div class="aspect-square rounded-2xl bg-background/40 p-3 ring-1 ring-foreground/10">
							<span
								role="img"
								aria-label={craft ? `Orbit mark drawn from ${craft.name}` : 'Orbit mark'}
								class="block size-full [&>svg]:size-full"
							>
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html markSvg}
							</span>
						</div>
						<figcaption class="text-xs text-foreground/55">
							{seed !== null && seed === visitSeed ? 'This visit’s mark' : 'Another roll'}
						</figcaption>
					</figure>
				</div>
				<div class="flex flex-wrap items-center justify-between gap-3">
					<p class="text-sm text-foreground/70" aria-live="polite">
						{#if spec && craft}
							{craft.name}, launched {launchYear(craft.launch)}. {spec.order} arms{spec.mirror
								? ', mirrored'
								: ''}.
						{:else}
							&nbsp;
						{/if}
					</p>
					<button
						type="button"
						onclick={() => (seed = randomSeed())}
						disabled={seed === null}
						class="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-foreground/15 px-4 text-sm font-semibold hover:bg-foreground/5 disabled:opacity-50"
					>
						<RefreshCw class="size-4" aria-hidden="true" /> Draw another
					</button>
				</div>
			</div>
		</GlassCard>

		<div class="flex flex-col gap-3 pt-10">
			<h3 data-break class="text-sm font-semibold tracking-[0.14em] text-foreground/60 uppercase">
				The {CRAFT_META.length} probes
			</h3>
			<ul data-break class="flex flex-wrap gap-2">
				{#each CRAFT_META as c (c.id)}
					<li class="rounded-full bg-foreground/8 px-3 py-1 text-sm text-foreground/75">
						{c.name} <span class="text-foreground/45">{launchYear(c.launch)}</span>
					</li>
				{/each}
			</ul>
		</div>
	</Section>

	<Section wide class="pb-24">
		<div class="mx-auto flex max-w-3xl flex-col items-center gap-4 pb-12 text-center">
			<h2 data-break class="text-3xl font-bold tracking-tight sm:text-4xl">Why things float</h2>
			<p data-break class="text-lg leading-relaxed text-balance text-foreground/70">
				Honestly, because we think it is cool. Yes, it hurts our SEO, and yes, it doesn't load well
				on older devices, but one of our devs got really interested in physics sims and here we are.
				Another project :)
			</p>
			<p data-break class="text-lg leading-relaxed text-balance text-foreground/70">
				On the homepage the title letters and the project cards are real physical bodies, simulated
				with the open-source Matter.js engine with gravity switched off. Scroll and the letters
				break apart and drift; the cards are tossed in from below and bump them aside. Grab a letter
				and you can throw it.
			</p>
		</div>
		<GlassCard data-break-solid class="mx-auto w-full max-w-3xl gap-4 p-6 sm:p-8">
			<div
				bind:this={demoBounds}
				class="relative grid h-64 place-items-center overflow-hidden rounded-2xl bg-background/40 ring-1 ring-foreground/10 sm:h-72"
			>
				<p class="text-3xl font-bold tracking-tight sm:text-6xl" aria-label={DEMO_WORD}>
					{#each DEMO_WORD as ch, i (i)}{#if ch === ' '}<span aria-hidden="true">&nbsp;</span
							>{:else}<span
								bind:this={letterEls[i]}
								aria-hidden="true"
								class="inline-block cursor-grab leading-none select-none">{ch}</span
							>{/if}{/each}
				</p>
			</div>
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="text-sm text-foreground/70">
					{demoStill
						? 'Your device asks for reduced motion, so these letters stay put.'
						: 'Grab a letter and throw it.'}
				</p>
				<div class="flex flex-wrap gap-2">
					{#if canBreak}
						<button
							type="button"
							onclick={() => (broken ? restorePage() : breakPage())}
							aria-disabled={breaking}
							class="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-foreground/15 px-4 text-sm font-semibold hover:bg-foreground/5 aria-disabled:opacity-50"
						>
							{#if broken}
								<Undo2 class="size-4" aria-hidden="true" /> Put the page back
							{:else}
								<Shapes class="size-4" aria-hidden="true" /> Break the page
							{/if}
						</button>
					{/if}
					<button
						type="button"
						onclick={() => resetDemo?.()}
						disabled={!resetDemo || demoStill}
						class="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-foreground/15 px-4 text-sm font-semibold hover:bg-foreground/5 disabled:opacity-50"
					>
						<RefreshCw class="size-4" aria-hidden="true" /> Reset
					</button>
				</div>
			</div>
		</GlassCard>
		<div class="mx-auto flex max-w-3xl flex-col gap-3 pt-12 text-center">
			<p data-break class="leading-relaxed text-foreground/70">
				It isn’t only the homepage. The menu at the top of this page floats too: each link drifts a
				few pixels, tugs on its neighbours and steps aside for your cursor, and Causes hangs off
				Websites on a string. Try it.
			</p>
			<p data-break class="text-sm leading-relaxed text-foreground/55">
				If your device asks for reduced motion, all of it stays still.
			</p>
		</div>
	</Section>

	<Section wide class="pb-24">
		<div class="mx-auto flex max-w-3xl flex-col items-center gap-4 pb-12 text-center">
			<h2 data-break class="text-3xl font-bold tracking-tight sm:text-4xl">
				The sky behind every page
			</h2>
			<p data-break class="text-lg leading-relaxed text-balance text-foreground/70">
				The stars behind this page are the real night sky, as it looks right now. Because why not?
			</p>
		</div>
		<GlassCard data-break class="gap-12 p-6 text-sm sm:p-10 sm:text-base">
			<SkyExplainerBody {...skyFacts()} layout="page" />
		</GlassCard>
	</Section>

	<Section wide class="items-center pb-28">
		<div class="flex w-full max-w-3xl flex-col gap-5">
			<h2 data-break class="text-center text-3xl font-bold tracking-tight">Read more</h2>
			<div class="grid gap-5 sm:grid-cols-2">
				<GlassCard data-break class="gap-2 p-6">
					<h3 class="text-lg font-semibold">How we made the site float</h3>
					<!-- Link the blog post here once "How we made the site float" is published. -->
					<p class="text-sm leading-relaxed text-foreground/65">
						The full story of the physics engine, on our blog.
					</p>
					<p class="pt-1 text-sm font-semibold text-foreground/50">Write-up coming soon</p>
				</GlassCard>
				<GlassCard data-break class="gap-2 p-6">
					<h3 class="text-lg font-semibold">The code</h3>
					<p class="text-sm leading-relaxed text-foreground/65">
						This site is open source, logo generator and physics engine included.
					</p>
					<a
						href={REPO}
						target="_blank"
						rel="noopener"
						class="inline-flex items-center gap-1 pt-1 text-sm font-semibold text-primary hover:underline"
						>voidprojects-site on GitHub <ArrowUpRight class="size-4" aria-hidden="true" /></a
					>
				</GlassCard>
			</div>
		</div>
	</Section>

	<p class="sr-only" aria-live="polite">{breakNews}</p>
	{#if broken}
		<!-- Fixed so a mouse can put the page back from anywhere; Escape and the toggle cover the keyboard. -->
		<button
			type="button"
			onclick={restorePage}
			class="fixed bottom-6 left-1/2 z-50 inline-flex h-9 -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full border border-foreground/15 bg-background/80 px-4 text-sm font-semibold backdrop-blur hover:bg-foreground/5"
		>
			<Undo2 class="size-4" aria-hidden="true" /> Put the page back
		</button>
	{/if}
</main>
