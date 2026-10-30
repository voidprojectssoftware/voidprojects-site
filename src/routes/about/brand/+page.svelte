<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowUpRight, Clock, Link2, MousePointer2, Orbit, RefreshCw } from '@lucide/svelte';
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import { Section } from '$lib/components/voidprojects/section/index.js';
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';
	import { PageMeta } from '$lib/components/page-meta/index.js';
	import { PAGES } from '$lib/seo/site.js';
	import { publishedPosts } from '$lib/content/posts';
	import { DATA, buildTrajectory } from '$lib/trajectory';
	import { renderSpec } from '$lib/brand/labs/trajectory-logo.js';
	import { pickMarkSpec, randomSeed } from '$lib/brand/mark.js';
	import { brandColor } from '$lib/brand/colors.js';

	const REPO = 'https://github.com/voidprojectssoftware/voidprojects-site';
	// The physics write-up is linked only once a post with this slug is published.
	const FLOAT_POST = publishedPosts().find((p) => p.slug === 'how-we-made-the-site-float');

	const launchYear = (iso: string) => iso.slice(0, 4);

	// Random per visit, so the mark is drawn client-side after mount (a prerendered
	// one would mismatch on hydration). Starts on VISIT_SEED, the header's and tab's mark.
	let visitSeed = $state<number | null>(null);
	let seed = $state<number | null>(null);
	let ink = $state('');
	onMount(async () => {
		const { VISIT_SEED } = await import('$lib/brand/visit-seed.js');
		ink = brandColor('--color-primary');
		visitSeed = seed = VISIT_SEED;
	});

	const spec = $derived(seed === null ? null : pickMarkSpec(seed, ink || undefined));
	const craft = $derived(spec && DATA.craft.find((c) => c.id === spec.craftId));
	const markSvg = $derived(spec ? renderSpec(spec).svg : '');
	const pathSvg = $derived(
		spec
			? buildTrajectory({
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

	const FLOAT_PARTS = [
		{
			icon: Clock,
			title: 'One world, one clock',
			body: 'Everything that can collide lives in one shared world, and only that world moves time forward: sixty fixed steps a second, so the motion runs at the same speed on any screen. When nothing is moving, it stops and costs nothing.'
		},
		{
			icon: Orbit,
			title: 'Actors',
			body: 'Each kind of thing (the title letters, a project card) is an actor that pushes its own bodies around. The world doesn’t know what a letter or a card is. It just runs them.'
		},
		{
			icon: Link2,
			title: 'Effects',
			body: 'Some moments span several actors. When the Constellation card arrives, springs link it to the letters and pull them into formation around it, then let go when it leaves.'
		},
		{
			icon: MousePointer2,
			title: 'Your cursor',
			body: 'Pass your mouse near the resting letters and they shy away, then spring home. While they drift they lean toward your cursor, and on a phone your finger plows through them as you scroll.'
		}
	];
</script>

<svelte:head>
	<PageMeta meta={PAGES.brand} />
</svelte:head>

<SiteHeader />

<Section wide class="items-center pt-20 pb-20 text-center sm:pt-28">
	<p class="text-sm font-semibold tracking-[0.14em] text-primary uppercase">Our brand</p>
	<h1 class="max-w-3xl pt-3 text-4xl font-bold tracking-tight text-balance sm:text-6xl">
		Nothing here sits still.
	</h1>
	<p class="max-w-2xl pt-6 text-lg leading-relaxed text-balance text-foreground/70">
		Two things make Void Projects look like Void Projects: a logo that is drawn fresh for every
		visit, and a site where things drift as if there were no gravity. Here is where both come from.
	</p>
</Section>

<Section wide class="pb-24">
	<GlassCard class="grid gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16">
		<div class="flex flex-col gap-4">
			<h2 class="text-3xl font-bold tracking-tight">The logo that never sits still</h2>
			<p class="text-lg leading-relaxed text-foreground/70">
				Our logo is not a fixed drawing. Every page load rolls a new one: the mark in the header and
				the icon in your browser tab are the same freshly drawn mark, and the badge on the sites we
				build fetches a new one on every visit.
			</p>
			<p class="leading-relaxed text-foreground/65">
				Each mark starts from a real spacecraft. We took the paths of {DATA.craft.length} probes from
				NASA/JPL HORIZONS, one position a month, measured from the Sun and flattened onto the plane the
				planets orbit in, as if you were looking down on the solar system from above.
			</p>
			<p class="leading-relaxed text-foreground/65">
				To make a mark, the generator picks one probe, crops its path at a chosen distance from the
				Sun, stretches the distance scale so the loops near the planets stay readable, then repeats
				that arm around the centre three, four, five, six or eight times, sometimes mirrored. Rolls
				that come out too small or too dense to read at icon size are thrown back.
			</p>
		</div>

		<div class="flex flex-col gap-4">
			<div class="grid grid-cols-2 gap-4">
				<figure class="flex flex-col gap-2">
					<div class="aspect-square rounded-2xl bg-background/40 p-3 ring-1 ring-foreground/10">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						<span class="block size-full [&>svg]:size-full" aria-hidden="true">{@html pathSvg}</span
						>
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
		<h3 class="text-sm font-semibold tracking-[0.14em] text-foreground/60 uppercase">
			The {DATA.craft.length} probes
		</h3>
		<ul class="flex flex-wrap gap-2">
			{#each DATA.craft as c (c.id)}
				<li class="rounded-full bg-foreground/8 px-3 py-1 text-sm text-foreground/75">
					{c.name} <span class="text-foreground/45">{launchYear(c.launch)}</span>
				</li>
			{/each}
		</ul>
	</div>
</Section>

<Section wide class="pb-24">
	<div class="mx-auto flex max-w-3xl flex-col items-center gap-4 pb-12 text-center">
		<h2 class="text-3xl font-bold tracking-tight sm:text-4xl">Why things float</h2>
		<p class="text-lg leading-relaxed text-balance text-foreground/70">
			Void Projects is named for the void, so the site behaves like it. On the homepage the letters
			of the title and the project cards are real physical bodies, simulated with the open-source
			Matter.js engine, with gravity switched off. Scroll and the letters break apart and drift; the
			cards are tossed in from below and bump them aside. Grab a letter and you can throw it.
		</p>
	</div>
	<div class="grid w-full gap-5 md:grid-cols-2 xl:grid-cols-4">
		{#each FLOAT_PARTS as part (part.title)}
			{@const Icon = part.icon}
			<GlassCard class="gap-3 p-6">
				<span class="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
					<Icon class="size-5" aria-hidden="true" />
				</span>
				<h3 class="pt-1 text-lg font-semibold">{part.title}</h3>
				<p class="text-sm leading-relaxed text-foreground/65">{part.body}</p>
			</GlassCard>
		{/each}
	</div>
	<div class="mx-auto flex max-w-3xl flex-col gap-3 pt-12 text-center">
		<p class="leading-relaxed text-foreground/70">
			It isn’t only the homepage. The menu at the top of this page floats too: each link drifts a
			few pixels, tugs on its neighbours and steps aside for your cursor, and Causes hangs off
			Websites on a string. Try it.
		</p>
		<p class="text-sm leading-relaxed text-foreground/55">
			If your device asks for reduced motion, all of it stays still.
		</p>
	</div>
</Section>

<Section wide class="items-center pb-28">
	<div class="flex w-full max-w-3xl flex-col gap-5">
		<h2 class="text-center text-3xl font-bold tracking-tight">Read more</h2>
		<div class="grid gap-5 sm:grid-cols-2">
			<GlassCard class="gap-2 p-6">
				<h3 class="text-lg font-semibold">How we made the site float</h3>
				{#if FLOAT_POST}
					<p class="text-sm leading-relaxed text-foreground/65">{FLOAT_POST.meta.description}</p>
					<a
						href="/blog/{FLOAT_POST.slug}"
						class="inline-flex items-center gap-1 pt-1 text-sm font-semibold text-primary hover:underline"
						>Read the write-up <ArrowUpRight class="size-4" aria-hidden="true" /></a
					>
				{:else}
					<p class="text-sm leading-relaxed text-foreground/65">
						The full story of the physics engine, on our blog.
					</p>
					<p class="pt-1 text-sm font-semibold text-foreground/50">Write-up coming soon</p>
				{/if}
			</GlassCard>
			<GlassCard class="gap-2 p-6">
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
