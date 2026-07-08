<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import BrandArt from '$lib/brand/assets/BrandArt.svelte';
	import VoidMark from '$lib/brand/VoidMark.svelte';
	import orbitmark from '$lib/brand/orbitmark.svg';
	import {
		ASSETS,
		assetById,
		exportFilename,
		BRAND,
		type BrandAssetSpec
	} from '$lib/brand/manifest.js';
	import { PALETTE, FONT_VAR, TYPE_WEIGHTS } from '$lib/brand/tokens.js';
	import { brandColor } from '$lib/brand/colors.js';

	// ?asset=<id>&raw=1 renders that single asset alone at exact pixel size (no page
	// chrome) — this is what scripts/export-brand.mjs screenshots. With no params we
	// show the full brand guide + gallery.
	const rawId = $derived(page.url.searchParams.get('asset'));
	const isRaw = $derived(page.url.searchParams.get('raw') === '1' && !!rawId);
	const rawSpec = $derived(rawId ? assetById(rawId) : undefined);

	let showSafe = $state(true);
	let busy = $state<string | null>(null);

	let copied = $state<string | null>(null);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;
	function copy(value: string) {
		navigator.clipboard?.writeText(value);
		copied = value;
		clearTimeout(copyTimer);
		copyTimer = setTimeout(() => (copied = null), 1200);
	}

	// On-screen preview width per kind; the artwork is rendered at true px and scaled
	// down by a wrapper transform (the artwork node itself stays untransformed so the
	// capture below comes out full-size).
	function displayW(spec: BrandAssetSpec): number {
		return spec.kind === 'banner' ? 680 : 300;
	}
	const scaleFor = (spec: BrandAssetSpec) => displayW(spec) / spec.width;

	async function download(spec: BrandAssetSpec, card: HTMLElement) {
		const node = card.querySelector<HTMLElement>('[data-brand-asset]');
		if (!node) return;
		busy = spec.id;
		try {
			const { toPng, toJpeg } = await import('html-to-image');
			const opts = {
				width: spec.width,
				height: spec.height,
				canvasWidth: spec.width * (spec.scale ?? 1),
				canvasHeight: spec.height * (spec.scale ?? 1),
				pixelRatio: spec.scale ?? 1,
				backgroundColor: spec.background,
				cacheBust: true
			};
			const url = spec.format === 'jpg' ? await toJpeg(node, opts) : await toPng(node, opts);
			const a = document.createElement('a');
			a.href = url;
			a.download = exportFilename(spec);
			a.click();
		} finally {
			busy = null;
		}
	}

	const nav = [
		{ id: 'identity', label: 'Identity' },
		{ id: 'logo', label: 'Logo' },
		{ id: 'colors', label: 'Colors' },
		{ id: 'type', label: 'Typography' },
		{ id: 'assets', label: 'Assets' }
	];
	const socials = [
		{ label: 'GitHub', value: BRAND.github },
		{ label: 'YouTube', value: BRAND.youtube },
		{ label: 'LinkedIn', value: BRAND.linkedin }
	];

	// Read token values live from layout.css (the single source of truth) rather
	// than hardcoding them. Runs in the browser after mount.
	let tokenValues = $state<Record<string, string>>({});
	let fontValue = $state('');
	const fontName = $derived(fontValue.split(',')[0].replace(/['"]/g, '').trim());
	onMount(() => {
		const map: Record<string, string> = {};
		for (const group of PALETTE)
			for (const sw of group.swatches) map[sw.cssVar] = brandColor(sw.cssVar);
		tokenValues = map;
		fontValue = brandColor(FONT_VAR);
	});
</script>

<svelte:head>
	<title>Brand · Void Projects</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if isRaw && rawSpec}
	<!-- Raw export target: the single asset, pinned top-left, nothing else. -->
	<div class="fixed top-0 left-0 z-50">
		<BrandArt spec={rawSpec} />
	</div>
{:else if isRaw}
	<p class="p-8 text-red-400">Unknown asset id: {rawId}</p>
{:else}
	<main class="relative mx-auto max-w-[1500px] px-6 py-14">
		<a
			href="/brand/trajectory-logo-lab"
			class="absolute top-6 right-6 z-10 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary ring-1 ring-primary/30 hover:bg-primary/20"
		>
			Trajectory Logo Lab ↗
		</a>
		<header class="mb-12">
			<h1 class="text-3xl font-bold">Void Projects — Brand</h1>
			<p class="mt-2 max-w-2xl text-foreground/65">
				The living brand guide: identity, logo, palette, and type, plus the channel assets and their
				export pipeline. Everything here is generated from
				<code class="text-primary">src/lib/brand/</code>.
			</p>
			<nav class="mt-5 flex flex-wrap gap-2">
				{#each nav as n (n.id)}
					<a
						href="#{n.id}"
						class="rounded-full px-3 py-1 text-sm text-foreground/70 ring-1 ring-white/10 hover:bg-white/5 hover:text-foreground"
					>
						{n.label}
					</a>
				{/each}
			</nav>
		</header>

		<!-- Identity ---------------------------------------------------------------->
		<section id="identity" class="mb-14 scroll-mt-6">
			<h2 class="mb-4 text-xl font-semibold">Identity</h2>
			<div class="grid gap-6 md:grid-cols-2">
				<div class="rounded-2xl bg-white/[0.02] p-6 ring-1 ring-white/10">
					<div class="text-2xl font-bold">{BRAND.name}</div>
					<p class="mt-1 text-foreground/70">{BRAND.tagline}</p>
					<p class="mt-4 text-sm leading-relaxed text-foreground/55">
						A developer collective shipping AI-centric projects. The identity leans into the “void”:
						a deep-space, dark-only world with a real star sky, a single luminous violet accent, and
						restrained, modern typography. Keep it flat and monochromatic — no gradients or glows on
						the mark.
					</p>
				</div>
				<div class="rounded-2xl bg-white/[0.02] p-6 ring-1 ring-white/10">
					<div class="text-xs tracking-wide text-foreground/45 uppercase">Find us</div>
					<ul class="mt-3 flex flex-col gap-2">
						{#each socials as s (s.label)}
							<li class="flex items-baseline gap-3">
								<span class="w-16 text-sm text-foreground/50">{s.label}</span>
								<button
									type="button"
									onclick={() => copy(s.value)}
									class="cursor-pointer font-mono text-sm text-primary hover:underline"
								>
									{s.value}
								</button>
							</li>
						{/each}
					</ul>
					<p class="mt-4 text-xs text-foreground/40">Click any value to copy.</p>
				</div>
			</div>
		</section>

		<!-- Logo -------------------------------------------------------------------->
		<section id="logo" class="mb-14 scroll-mt-6">
			<h2 class="mb-4 text-xl font-semibold">Logo</h2>
			<div class="grid gap-6 md:grid-cols-[auto_1fr]">
				<div
					class="flex flex-col gap-4 rounded-2xl p-6 ring-1 ring-white/10"
					style="background:#0e0e17"
				>
					<div class="flex items-center gap-6">
						<div class="orbit" style="width:160px;height:160px">
							<img src={orbitmark} alt="Void Projects" />
						</div>
						<div class="orbit" style="width:88px;height:88px">
							<img src={orbitmark} alt="Void Projects" />
						</div>
						<div class="orbit" style="width:48px;height:48px">
							<img src={orbitmark} alt="Void Projects" />
						</div>
					</div>
					<div class="flex items-center gap-3 border-t border-white/10 pt-4">
						<span class="text-xs tracking-wide text-foreground/45 uppercase"
							>Lettermark alternate</span
						>
						<VoidMark size={36} />
					</div>
				</div>
				<div class="rounded-2xl bg-white/[0.02] p-6 ring-1 ring-white/10">
					<div class="text-3xl font-bold tracking-tight">Void Projects</div>
					<p class="mt-3 text-sm leading-relaxed text-foreground/55">
						The primary logo is the <strong class="text-foreground/80">orbit mark</strong> — a constellation
						of stars abstracted from real deep-space probe trajectories (Pioneer / Voyager), in brand
						violet on the deep-space field. It's the avatar on every platform and the site favicon. A
						monochromatic “VP” lettermark is the compact alternate for very small or text-only contexts.
					</p>
				</div>
			</div>
		</section>

		<!-- Colors ------------------------------------------------------------------>
		<section id="colors" class="mb-14 scroll-mt-6">
			<h2 class="mb-1 text-xl font-semibold">Colors</h2>
			<p class="mb-5 text-sm text-foreground/50">
				Read live from the CSS tokens in <code class="text-primary">layout.css</code> — no values are
				duplicated here. Click a swatch to copy.
			</p>
			<div class="flex flex-col gap-8">
				{#each PALETTE as group (group.title)}
					<div>
						<div class="mb-3">
							<h3 class="text-sm font-semibold">{group.title}</h3>
							<p class="text-xs text-foreground/45">{group.description}</p>
						</div>
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
							{#each group.swatches as sw (sw.name)}
								{@const val = tokenValues[sw.cssVar] ?? ''}
								<button
									type="button"
									onclick={() => copy(val)}
									class="checker cursor-pointer overflow-hidden rounded-xl text-left ring-1 ring-white/10 transition hover:ring-white/25"
								>
									<div class="h-16 w-full" style="background:var({sw.cssVar})"></div>
									<div class="bg-card/60 p-3">
										<div class="flex items-center justify-between gap-2">
											<span class="text-sm font-medium">{sw.name}</span>
											{#if val && copied === val}
												<span class="text-xs text-primary">Copied</span>
											{/if}
										</div>
										<div class="mt-0.5 font-mono text-[11px] text-foreground/45">{sw.cssVar}</div>
										<div class="mt-1 font-mono text-[11px] break-all text-foreground/60">
											{val || '…'}
										</div>
										{#if sw.note}
											<div class="mt-1 text-[11px] text-foreground/40">{sw.note}</div>
										{/if}
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Typography -------------------------------------------------------------->
		<section id="type" class="mb-14 scroll-mt-6">
			<h2 class="mb-4 text-xl font-semibold">Typography</h2>
			<div class="grid gap-6 lg:grid-cols-2">
				<div class="rounded-2xl bg-white/[0.02] p-6 ring-1 ring-white/10">
					<div class="text-xs tracking-wide text-foreground/45 uppercase">Typeface</div>
					<div class="mt-1 text-2xl font-bold">{fontName || '…'}</div>
					<p class="mt-2 text-sm text-foreground/55">
						One family for everything — UI, headings, wordmark, and the logo. Variable, so any
						weight is available.
					</p>
					<div class="mt-5 flex flex-col gap-4">
						{#each TYPE_WEIGHTS as w (w.weight)}
							<div class="flex items-baseline justify-between gap-4 border-t border-white/5 pt-3">
								<span class="text-2xl" style="font-weight:{w.weight}">Void Projects</span>
								<span class="text-right text-xs text-foreground/45"
									>{w.name} · {w.weight}<br /><span class="text-foreground/35">{w.use}</span></span
								>
							</div>
						{/each}
					</div>
				</div>
				<div class="rounded-2xl bg-white/[0.02] p-6 ring-1 ring-white/10">
					<div class="text-xs tracking-wide text-foreground/45 uppercase">Scale</div>
					<div class="mt-3 flex flex-col gap-3">
						<div class="text-5xl font-bold tracking-tight">Display</div>
						<div class="text-3xl font-bold tracking-tight">Heading</div>
						<div class="text-xl font-semibold">Subheading</div>
						<div class="text-base text-foreground/80">
							Body — AI-centric projects from a developer collective.
						</div>
						<div class="text-sm text-foreground/55">Small / captions and metadata.</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Assets ------------------------------------------------------------------>
		<section id="assets" class="scroll-mt-6">
			<div class="mb-4 flex items-baseline justify-between gap-4">
				<h2 class="text-xl font-semibold">Channel assets</h2>
				<label class="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground/80">
					<input type="checkbox" bind:checked={showSafe} class="accent-primary" />
					Show safe zones
				</label>
			</div>
			<p class="mb-6 text-sm text-foreground/50">
				Grab a quick copy with Download, or run
				<code class="text-primary">npm run export:brand</code> for pixel-perfect files of all of them.
			</p>

			<div class="grid grid-cols-1 gap-10 lg:grid-cols-2">
				{#each ASSETS as spec (spec.id)}
					{@const scale = scaleFor(spec)}
					<div
						data-asset-card
						class="flex flex-col gap-3 rounded-2xl bg-white/[0.02] p-5 ring-1 ring-white/10"
					>
						<div class="flex items-baseline justify-between gap-3">
							<h3 class="text-lg font-semibold">{spec.label}</h3>
							<span class="text-xs tracking-wide text-foreground/50 uppercase">{spec.platform}</span
							>
						</div>
						<p class="text-xs text-foreground/50">
							{spec.width}×{spec.height} · {spec.format.toUpperCase()} · {exportFilename(spec)}
						</p>

						<!-- Checkerboard so any unintended transparency is obvious. -->
						<div class="checker relative w-max overflow-hidden rounded-lg ring-1 ring-white/10">
							<div
								style="width:{spec.width * scale}px;height:{spec.height * scale}px"
								class="relative"
							>
								<div
									style="transform:scale({scale});transform-origin:top left;width:{spec.width}px;height:{spec.height}px"
								>
									<BrandArt {spec} />
								</div>

								{#if showSafe && spec.safe}
									{#if spec.safe.shape === 'circle'}
										<div
											class="pointer-events-none absolute rounded-full border-2 border-dashed border-primary/70"
											style="width:{spec.safe.width * scale}px;height:{spec.safe.height *
												scale}px;left:{((spec.width - spec.safe.width) / 2) *
												scale}px;top:{((spec.height - spec.safe.height) / 2) * scale}px"
										></div>
									{:else}
										<div
											class="pointer-events-none absolute border-2 border-dashed border-primary/70"
											style="width:{spec.safe.width * scale}px;height:{spec.safe.height *
												scale}px;left:{((spec.width - spec.safe.width) / 2) *
												scale}px;top:{((spec.height - spec.safe.height) / 2) * scale}px"
										></div>
									{/if}
								{/if}
							</div>
						</div>

						{#if spec.note}
							<p class="text-xs text-foreground/45">{spec.note}</p>
						{/if}

						<div class="mt-1 flex items-center gap-3">
							<button
								type="button"
								onclick={(e) =>
									download(spec, e.currentTarget.closest('[data-asset-card]') as HTMLElement)}
								disabled={busy === spec.id}
								class="cursor-pointer rounded-md bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary ring-1 ring-primary/30 hover:bg-primary/25 disabled:opacity-50"
							>
								{busy === spec.id ? 'Rendering…' : `Download ${spec.format.toUpperCase()}`}
							</button>
							<a
								href="/brand?asset={spec.id}&raw=1"
								target="_blank"
								class="text-sm text-foreground/55 hover:text-foreground"
							>
								Open raw ↗
							</a>
						</div>
					</div>
				{/each}
			</div>
		</section>
	</main>
{/if}

<style>
	.orbit {
		line-height: 0;
	}
	.orbit img {
		display: block;
		width: 100%;
		height: 100%;
	}

	.checker {
		background-image:
			linear-gradient(45deg, oklch(1 0 0 / 0.04) 25%, transparent 25%),
			linear-gradient(-45deg, oklch(1 0 0 / 0.04) 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, oklch(1 0 0 / 0.04) 75%),
			linear-gradient(-45deg, transparent 75%, oklch(1 0 0 / 0.04) 75%);
		background-size: 16px 16px;
		background-position:
			0 0,
			0 8px,
			8px -8px,
			-8px 0;
	}
</style>
