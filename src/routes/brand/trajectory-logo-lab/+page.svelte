<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { Button } from '$lib/components/shadcn/ui/button/index.js';
	import { Switch } from '$lib/components/shadcn/ui/switch/index.js';
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';
	import {
		ArrowLeft,
		Copy,
		Download,
		ImageDown,
		Lock,
		LockOpen,
		RefreshCw,
		RotateCcw,
		Shuffle,
		X
	} from '@lucide/svelte';
	import { CRAFT_META } from '$lib/trajectory';
	import {
		deriveSpec,
		renderSpec,
		seedFor,
		type TLGlobals,
		type TLSpec,
		type TLPalette,
		type TLScale,
		type TLSegment,
		type TLStyle,
		type TLFrame,
		type TLSymmetry,
		type TLBgShape
	} from '$lib/brand/labs/trajectory-logo.js';

	const N = 12;
	const INITIAL_SEED = 424242;

	let baseSeed = $state(INITIAL_SEED);
	let seeds = $state<number[]>(Array.from({ length: N }, (_, i) => seedFor(INITIAL_SEED, i)));
	let locked = $state<boolean[]>(new Array(N).fill(false));

	let stroke = $state(1);
	let palette = $state<TLPalette>('brand');
	let frameMode = $state<TLFrame | 'random'>('random');
	let symmetry = $state<TLSymmetry>('mixed');
	let pool = $state<string[]>(CRAFT_META.map((c) => c.id));

	// Per-tile edited spec; null means "follow the seed + globals". A mark becomes
	// a concrete override the moment it is opened, so the editor can adjust it and
	// the change shows on its tile. Cleared when a tile's seed is rerolled.
	let overrides = $state<(TLSpec | null)[]>(new Array(N).fill(null));

	const globals = $derived<TLGlobals>({ stroke, palette, frameMode, symmetry, pool });
	const tiles = $derived(seeds.map((s, i) => renderSpec(overrides[i] ?? deriveSpec(s, globals))));

	const palettes: { id: TLPalette; label: string; swatch: string }[] = [
		{ id: 'brand', label: 'Brand', swatch: '#b79cf5' },
		{ id: 'aurum', label: 'Aurum', swatch: '#e8c58a' },
		{ id: 'argent', label: 'Argent', swatch: '#d8dee9' },
		{ id: 'mono', label: 'Mono', swatch: '#e6e3da' },
		{ id: 'duo', label: 'Duo', swatch: 'linear-gradient(90deg,#b79cf5,#e8c58a)' },
		{ id: 'spectral', label: 'Spectral', swatch: 'linear-gradient(90deg,#e8c58a,#7fd7e8)' }
	];
	const symmetries: { id: TLSymmetry; label: string }[] = [
		{ id: 'mixed', label: 'Mixed' },
		{ id: 'emblem', label: 'Emblem' },
		{ id: 'single', label: 'Single arm' }
	];
	const frames: (TLFrame | 'random')[] = ['random', 'none', 'circle', 'ring', 'hex', 'diamond'];
	const frameLabel: Record<TLFrame | 'random', string> = {
		random: 'Surprise me',
		none: 'None',
		circle: 'Circle',
		ring: 'Ring',
		hex: 'Hexagon',
		diamond: 'Diamond'
	};

	// The seed base as an editable base-36 code (matches the label + tile codes), so
	// a wall you like can be typed back in and reproduced.
	let seedInput = $state(INITIAL_SEED.toString(36).toUpperCase());

	const rand = () => (Math.random() * 1e9) | 0;
	function reseed(base: number) {
		baseSeed = base >>> 0;
		seeds = seeds.map((s, i) => (locked[i] ? s : seedFor(baseSeed, i)));
		overrides = overrides.map((o, i) => (locked[i] ? o : null)); // drop non-locked edits
		seedInput = baseSeed.toString(36).toUpperCase();
	}
	const regenerate = () => reseed(rand());
	function applySeed() {
		const n = parseInt(seedInput.trim(), 36);
		if (!Number.isFinite(n) || n <= 0) {
			seedInput = baseSeed.toString(36).toUpperCase(); // revert bad input
			toast('Enter a valid seed code');
			return;
		}
		reseed(n);
	}
	const reroll = (i: number) => {
		if (!locked[i]) {
			seeds = seeds.with(i, rand());
			overrides = overrides.with(i, null);
		}
	};
	// Materialize an editable spec on open so the editor's bindings have a target.
	function openTile(i: number) {
		if (!overrides[i]) overrides = overrides.with(i, deriveSpec(seeds[i], globals));
		lbIndex = i;
	}
	const resetTile = (i: number) => (overrides = overrides.with(i, deriveSpec(seeds[i], globals)));
	const toggleLock = (i: number) => (locked = locked.with(i, !locked[i]));
	function togglePool(id: string) {
		const next = pool.includes(id) ? pool.filter((p) => p !== id) : [...pool, id];
		if (next.length) pool = next; // never empty the pool
	}

	let pngSize = $state(1024); // px, square export resolution

	function saveBlob(blob: Blob, filename: string) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}
	function downloadSvg(i: number) {
		saveBlob(new Blob([tiles[i].svg], { type: 'image/svg+xml' }), `voidprojects-orbitmark-${seeds[i].toString(36)}.svg`);
		toast(`Downloaded mark #${String(i + 1).padStart(2, '0')}`);
	}
	// Rasterize the mark's SVG onto a canvas. A transparent background is kept when
	// no fill is set, so a logo exports with alpha; a chosen bg fill bakes in.
	async function svgToPng(svg: string, size: number): Promise<Blob> {
		const sized = svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
		const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml;charset=utf-8' }));
		try {
			const img = new Image();
			await new Promise<void>((resolve, reject) => {
				img.onload = () => resolve();
				img.onerror = () => reject(new Error('render failed'));
				img.src = url;
			});
			const canvas = document.createElement('canvas');
			canvas.width = size;
			canvas.height = size;
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('no 2d context');
			ctx.drawImage(img, 0, 0, size, size);
			return await new Promise<Blob>((resolve, reject) =>
				canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/png')
			);
		} finally {
			URL.revokeObjectURL(url);
		}
	}
	async function downloadPng(i: number) {
		try {
			const blob = await svgToPng(tiles[i].svg, pngSize);
			saveBlob(blob, `voidprojects-orbitmark-${seeds[i].toString(36)}-${pngSize}.png`);
			toast(`Exported #${String(i + 1).padStart(2, '0')} · ${pngSize}px PNG`);
		} catch {
			toast('PNG export failed');
		}
	}
	async function copySvg(i: number) {
		try {
			await navigator.clipboard.writeText(tiles[i].svg);
			toast('SVG markup copied');
		} catch {
			toast('Copy blocked by the browser');
		}
	}

	let lbIndex = $state<number | null>(null);
	const closeTile = () => (lbIndex = null);

	// Editor option lists.
	const scaleOpts: TLScale[] = ['linear', 'sqrt', 'log'];
	const segOpts: TLSegment[] = ['full', 'inner', 'outer', 'mid'];
	const styleOpts: { id: TLStyle; label: string }[] = [
		{ id: 'line', label: 'Line' },
		{ id: 'lineDots', label: 'Line + dots' },
		{ id: 'dots', label: 'Dots' }
	];
	const specFrames: TLFrame[] = ['none', 'circle', 'ring', 'hex', 'diamond'];
	const bgShapes: TLBgShape[] = ['none', 'rect', 'rounded', 'circle', 'hex', 'diamond'];
	// `space` is the dark backdrop the marks sit on by default.
	const bgFills: { id: string; color: string; swatch: string }[] = [
		{ id: 'none', color: 'none', swatch: 'repeating-conic-gradient(#333 0 90deg,#222 0 180deg) 0/8px 8px' },
		{ id: 'space', color: '#0f1220', swatch: '#0f1220' },
		{ id: 'ink', color: '#0b0d13', swatch: '#0b0d13' },
		{ id: 'violet', color: '#171029', swatch: '#171029' },
		{ id: 'gold', color: '#241c0f', swatch: '#241c0f' },
		{ id: 'light', color: '#f2efe6', swatch: '#f2efe6' },
		{ id: 'white', color: '#ffffff', swatch: '#ffffff' },
		{ id: 'black', color: '#000000', swatch: '#000000' }
	];
	const isHex = (v: string) => /^#[0-9a-fA-F]{3,8}$/.test(v);
	// Set the background color from a typed/pasted hex, once it's complete.
	function setBgHex(spec: TLSpec, raw: string) {
		let v = raw.trim();
		if (v && v[0] !== '#') v = '#' + v;
		if (isHex(v)) spec.bg.fill = v.toLowerCase();
	}

	let toastMsg = $state('');
	let toastOn = $state(false);
	let toastTimer: ReturnType<typeof setTimeout>;
	function toast(msg: string) {
		toastMsg = msg;
		toastOn = true;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toastOn = false), 1700);
	}
	const seedCode = (s: number) => s.toString(36).toUpperCase();

	// --- persistence: autosave the whole lab to this browser ---
	const STORAGE_KEY = 'voidprojects.orbit-lab.v1';
	let loaded = false;
	onMount(() => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			const s = raw ? JSON.parse(raw) : null;
			if (s && s.v === 1) {
				if (Array.isArray(s.seeds) && s.seeds.length === N) seeds = s.seeds;
				if (Array.isArray(s.locked) && s.locked.length === N) locked = s.locked;
				if (Array.isArray(s.overrides) && s.overrides.length === N) overrides = s.overrides;
				if (typeof s.baseSeed === 'number') baseSeed = s.baseSeed;
				if (typeof s.stroke === 'number') stroke = s.stroke;
				if (typeof s.palette === 'string') palette = s.palette;
				if (typeof s.frameMode === 'string') frameMode = s.frameMode;
				if (typeof s.symmetry === 'string') symmetry = s.symmetry;
				if (Array.isArray(s.pool) && s.pool.length) pool = s.pool;
				seedInput = baseSeed.toString(36).toUpperCase();
			}
		} catch {
			/* ignore corrupt storage */
		}
		loaded = true;
	});

	$effect(() => {
		// Deep-read every persisted field so any change (incl. a nested spec edit) re-runs.
		const snap = {
			v: 1,
			baseSeed,
			seeds,
			locked,
			overrides: $state.snapshot(overrides),
			stroke,
			palette,
			frameMode,
			symmetry,
			pool
		};
		if (!browser || !loaded) return; // don't overwrite storage before the load has run
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
		} catch {
			/* quota exceeded / private mode */
		}
	});
</script>

<svelte:head>
	<title>Orbit Mark Lab · Void Projects</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') closeTile();
	}}
/>

<header
	class="sticky top-0 z-10 flex h-16 items-center justify-between px-6 backdrop-blur-sm sm:px-12 lg:px-20"
>
	<a
		href="/brand"
		class="flex items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-foreground"
	>
		<ArrowLeft class="size-4" />
		Brand assets
	</a>
	<span class="text-xs tracking-[0.22em] text-foreground/40 uppercase">Orbit Mark Lab</span>
</header>

<main class="mx-auto grid max-w-[1400px] gap-6 px-6 pb-24 sm:px-12 lg:grid-cols-[300px_1fr] lg:px-20">
	<aside class="lg:sticky lg:top-20 lg:h-fit">
		<GlassCard class="flex flex-col gap-6 p-6">
			<div>
				<h1 class="text-lg font-semibold tracking-tight">Orbit marks</h1>
				<p class="mt-1 text-[13px] leading-relaxed text-foreground/55">
					Logos grown from real probe trajectories: one craft's path, windowed and repeated around
					the Sun into an emblem. Lock the keepers, regenerate the rest.
				</p>
			</div>

			<div>
				<h2 class="mb-2 text-[11px] font-semibold tracking-[0.16em] text-foreground/45 uppercase">
					Symmetry
				</h2>
				<div class="flex gap-1.5">
					{#each symmetries as s (s.id)}
						<button
							type="button"
							onclick={() => (symmetry = s.id)}
							aria-pressed={symmetry === s.id}
							class="flex-1 rounded-md border px-2 py-1 text-xs transition-colors
								{symmetry === s.id
								? 'border-primary bg-primary text-primary-foreground'
								: 'border-border bg-foreground/5 text-foreground/60 hover:text-foreground'}"
						>
							{s.label}
						</button>
					{/each}
				</div>
			</div>

			<div>
				<h2 class="mb-2 text-[11px] font-semibold tracking-[0.16em] text-foreground/45 uppercase">
					Frame
				</h2>
				<div class="flex flex-wrap gap-1.5">
					{#each frames as fr (fr)}
						<button
							type="button"
							onclick={() => (frameMode = fr)}
							aria-pressed={frameMode === fr}
							class="rounded-md border px-2.5 py-1 text-xs transition-colors
								{frameMode === fr
								? 'border-primary bg-primary text-primary-foreground'
								: 'border-border bg-foreground/5 text-foreground/60 hover:text-foreground'}"
						>
							{frameLabel[fr]}
						</button>
					{/each}
				</div>
			</div>

			<div>
				<h2 class="mb-2 text-[11px] font-semibold tracking-[0.16em] text-foreground/45 uppercase">
					Palette
				</h2>
				<div class="flex flex-wrap gap-2">
					{#each palettes as p (p.id)}
						<button
							type="button"
							onclick={() => (palette = p.id)}
							aria-pressed={palette === p.id}
							title={p.label}
							aria-label={p.label}
							class="size-7 rounded-full border-2 transition-transform hover:scale-110
								{palette === p.id ? 'border-foreground' : 'border-transparent'}"
							style="background:{p.swatch}"
						></button>
					{/each}
				</div>
			</div>

			<div>
				<div class="mb-1.5 flex items-baseline justify-between">
					<span class="text-[13px]">Stroke weight</span>
					<span class="font-mono text-xs text-primary tabular-nums">{stroke.toFixed(2)}×</span>
				</div>
				<input type="range" min="0.5" max="2" step="0.05" bind:value={stroke} class="range" />
			</div>

			<div>
				<h2 class="mb-2 text-[11px] font-semibold tracking-[0.16em] text-foreground/45 uppercase">
					Source craft
				</h2>
				<div class="flex flex-wrap gap-1">
					{#each CRAFT_META as c (c.id)}
						<button
							type="button"
							onclick={() => togglePool(c.id)}
							aria-pressed={pool.includes(c.id)}
							title={c.name}
							class="rounded border px-1.5 py-0.5 text-[10.5px] transition-colors
								{pool.includes(c.id)
								? 'border-primary/60 bg-primary/15 text-foreground'
								: 'border-border text-foreground/40 hover:text-foreground/70'}"
						>
							{c.name}
						</button>
					{/each}
				</div>
			</div>

			<Button onclick={regenerate} class="gap-2">
				<RefreshCw class="size-4" />
				Regenerate all
			</Button>
			<div class="flex items-center gap-2">
				<span class="text-[11px] font-semibold tracking-[0.16em] text-foreground/45 uppercase"
					>Seed</span
				>
				<input
					bind:value={seedInput}
					onkeydown={(e) => {
						if (e.key === 'Enter') applySeed();
					}}
					onblur={applySeed}
					spellcheck="false"
					autocapitalize="characters"
					aria-label="Seed base"
					class="min-w-0 flex-1 rounded-md border border-border bg-foreground/5 px-2.5 py-1.5 text-center font-mono text-xs tracking-wider uppercase focus:border-primary focus:outline-none"
				/>
			</div>
		</GlassCard>
	</aside>

	<section class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
		{#each tiles as tile, i (i)}
			<div
				class="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border transition-all hover:-translate-y-0.5
					{locked[i] ? 'border-primary/50' : 'border-border hover:border-primary/40'}"
			>
				<button
					type="button"
					onclick={() => openTile(i)}
					class="mark flex size-full items-center justify-center p-[12%]"
					aria-label="Inspect mark {i + 1}"
				>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html tile.svg}
				</button>

				<button
					type="button"
					onclick={() => downloadSvg(i)}
					title="Download SVG"
					aria-label="Download mark {i + 1}"
					class="tool right-11 opacity-0 group-hover:opacity-100"><Download class="size-3.5" /></button
				>
				<button
					type="button"
					onclick={() => toggleLock(i)}
					title={locked[i] ? 'Unlock' : 'Lock'}
					aria-label={locked[i] ? 'Unlock mark' : 'Lock mark'}
					aria-pressed={locked[i]}
					class="tool right-2 {locked[i]
						? 'text-primary opacity-100'
						: 'opacity-0 group-hover:opacity-100'}"
				>
					{#if locked[i]}<Lock class="size-3.5" />{:else}<LockOpen class="size-3.5" />{/if}
				</button>
				<button
					type="button"
					onclick={() => reroll(i)}
					title="Reroll"
					aria-label="Reroll mark {i + 1}"
					class="tool left-2 opacity-0 group-hover:opacity-100"
					disabled={locked[i]}><Shuffle class="size-3.5" /></button
				>
				<button
					type="button"
					onclick={() => downloadPng(i)}
					title="Download PNG ({pngSize}px)"
					aria-label="Download PNG mark {i + 1}"
					class="tool left-11 opacity-0 group-hover:opacity-100"><ImageDown class="size-3.5" /></button
				>

				<span
					class="pointer-events-none absolute bottom-2 left-3 font-mono text-[10px] tracking-wider text-foreground/35 tabular-nums"
				>
					#{String(i + 1).padStart(2, '0')} · {seedCode(seeds[i])}
				</span>
			</div>
		{/each}
	</section>
</main>

{#if lbIndex !== null}
	{@const i = lbIndex}
	{@const spec = overrides[i]}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
		role="button"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) closeTile();
		}}
		onkeydown={() => {}}
	>
		<GlassCard
			class="grid max-h-[94vh] w-full max-w-[940px] gap-0 overflow-hidden sm:grid-cols-[1fr_360px]"
		>
			<div class="mark flex items-center justify-center bg-black/40 p-8">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html tiles[i].svg}
			</div>
			{#if spec}
				<div class="flex max-h-[94vh] flex-col border-t border-border sm:border-t-0 sm:border-l">
					<div class="flex items-center justify-between border-b border-border px-5 py-3">
						<h2 class="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
							Edit · #{String(i + 1).padStart(2, '0')} · {seedCode(seeds[i])}
						</h2>
						<button
							type="button"
							onclick={closeTile}
							aria-label="Close"
							class="text-foreground/50 hover:text-foreground"><X class="size-4" /></button
						>
					</div>

					<div class="ed flex-1 space-y-4 overflow-y-auto px-5 py-4">
						<label class="block">
							<span class="edlabel">Source craft</span>
							<select bind:value={spec.craftId} class="edselect">
								{#each CRAFT_META as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
							</select>
						</label>

						<div>
							<div class="edrow"><span class="edlabel">Symmetry</span><span class="edval">{spec.order}×</span></div>
							<input type="range" min="1" max="8" step="1" bind:value={spec.order} class="range" />
						</div>
						<div>
							<div class="edrow"><span class="edlabel">Rotation</span><span class="edval">{Math.round(spec.rotationDeg)}°</span></div>
							<input type="range" min="0" max="360" step="1" bind:value={spec.rotationDeg} class="range" />
						</div>
						<label class="flex items-center justify-between">
							<span class="edlabel">Mirror</span><Switch bind:checked={spec.mirror} />
						</label>

						<div>
							<span class="edlabel">Radial scale</span>
							<div class="mt-1 flex gap-1.5">
								{#each scaleOpts as s (s)}
									<button type="button" onclick={() => (spec.scale = s)} aria-pressed={spec.scale === s} class="chip flex-1 capitalize">{s}</button>
								{/each}
							</div>
						</div>
						<div>
							<div class="edrow"><span class="edlabel">Reach</span><span class="edval">{spec.reach} AU</span></div>
							<input type="range" min="6" max="74" step="1" bind:value={spec.reach} class="range" />
						</div>
						<div>
							<span class="edlabel">Segment</span>
							<div class="mt-1 flex gap-1.5">
								{#each segOpts as s (s)}
									<button type="button" onclick={() => (spec.segment = s)} aria-pressed={spec.segment === s} class="chip flex-1 capitalize">{s}</button>
								{/each}
							</div>
						</div>

						<div>
							<div class="edrow"><span class="edlabel">Smoothing</span><span class="edval">{spec.smoothing.toFixed(2)}</span></div>
							<input type="range" min="0" max="1.5" step="0.05" bind:value={spec.smoothing} class="range" />
						</div>
						<div>
							<div class="edrow"><span class="edlabel">Stroke</span><span class="edval">{spec.stroke.toFixed(2)}×</span></div>
							<input type="range" min="0.5" max="2" step="0.05" bind:value={spec.stroke} class="range" />
						</div>
						<div>
							<span class="edlabel">Style</span>
							<div class="mt-1 flex gap-1.5">
								{#each styleOpts as s (s.id)}
									<button type="button" onclick={() => (spec.style = s.id)} aria-pressed={spec.style === s.id} class="chip flex-1">{s.label}</button>
								{/each}
							</div>
						</div>

						<div>
							<span class="edlabel">Palette</span>
							<div class="mt-1 flex flex-wrap gap-2">
								{#each palettes as p (p.id)}
									<button type="button" onclick={() => (spec.palette = p.id)} aria-pressed={spec.palette === p.id} title={p.label} aria-label={p.label} class="sw" style="background:{p.swatch}"></button>
								{/each}
							</div>
						</div>
						<div>
							<span class="edlabel">Frame</span>
							<div class="mt-1 flex flex-wrap gap-1.5">
								{#each specFrames as fr (fr)}
									<button type="button" onclick={() => (spec.frame = fr)} aria-pressed={spec.frame === fr} class="chip capitalize">{fr}</button>
								{/each}
							</div>
						</div>
						<label class="flex items-center justify-between">
							<span class="edlabel">Sun</span><Switch bind:checked={spec.sun} />
						</label>

						<div class="rounded-lg border border-border/70 bg-foreground/[0.03] p-3">
							<span class="edlabel text-primary/80">Background shape</span>
							<div class="mt-1 flex flex-wrap gap-1.5">
								{#each bgShapes as s (s)}
									<button type="button" onclick={() => (spec.bg.shape = s)} aria-pressed={spec.bg.shape === s} class="chip capitalize">{s}</button>
								{/each}
							</div>
							<div class="mt-3">
								<div class="edrow"><span class="edlabel">Size</span><span class="edval">{Math.round(spec.bg.size * 100)}%</span></div>
								<input type="range" min="0.4" max="1.4" step="0.02" bind:value={spec.bg.size} class="range" />
							</div>
							<div class="mt-3">
								<span class="edlabel">Fill</span>
								<div class="mt-1 flex flex-wrap items-center gap-2">
									{#each bgFills as bf (bf.id)}
										<button type="button" onclick={() => (spec.bg.fill = bf.color)} aria-pressed={spec.bg.fill === bf.color} title={bf.id} aria-label={bf.id} class="sw" style="background:{bf.swatch}"></button>
									{/each}
									<!-- current custom color preview (only when it isn't a preset) -->
									{#if isHex(spec.bg.fill) && !bgFills.some((b) => b.color === spec.bg.fill)}
										<span class="sw" style="border-color:var(--foreground);background:{spec.bg.fill}" title={spec.bg.fill}></span>
									{/if}
									<input
										type="text"
										value={isHex(spec.bg.fill) ? spec.bg.fill : ''}
										oninput={(e) => setBgHex(spec, e.currentTarget.value)}
										placeholder="type any #hex"
										spellcheck="false"
										maxlength="9"
										aria-label="Background color hex"
										class="w-[7.5rem] rounded-md border border-border bg-foreground/5 px-2 py-1 font-mono text-xs lowercase focus:border-primary focus:outline-none"
									/>
								</div>
							</div>
						</div>
					</div>

					<div class="space-y-2 border-t border-border p-4">
						<div class="flex items-center justify-between">
							<span class="edlabel">PNG resolution</span>
							<div class="flex gap-1">
								{#each [512, 1024, 2048] as sz (sz)}
									<button
										type="button"
										onclick={() => (pngSize = sz)}
										aria-pressed={pngSize === sz}
										class="chip tabular-nums">{sz}</button
									>
								{/each}
							</div>
						</div>
						<div class="grid grid-cols-2 gap-2">
							<Button onclick={() => downloadPng(i)} class="gap-2">
								<ImageDown class="size-4" /> PNG
							</Button>
							<Button variant="outline" onclick={() => downloadSvg(i)} class="gap-2">
								<Download class="size-4" /> SVG
							</Button>
						</div>
						<div class="grid grid-cols-2 gap-2">
							<Button variant="outline" onclick={() => copySvg(i)} class="gap-2">
								<Copy class="size-4" /> Copy
							</Button>
							<Button variant="outline" onclick={() => resetTile(i)} class="gap-2">
								<RotateCcw class="size-4" /> Reset
							</Button>
						</div>
						<Button variant="ghost" onclick={() => toggleLock(i)} class="w-full gap-2">
							{#if locked[i]}<Lock class="size-4" /> Unlock{:else}<LockOpen class="size-4" /> Lock{/if}
						</Button>
					</div>
				</div>
			{/if}
		</GlassCard>
	</div>
{/if}

<div
	class="pointer-events-none fixed bottom-6 left-1/2 z-60 -translate-x-1/2 rounded-lg border border-primary/60 bg-card px-4 py-2.5 text-xs text-foreground shadow-lg transition-all duration-200
		{toastOn ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}"
	role="status"
	aria-live="polite"
>
	{toastMsg}
</div>

<style>
	.mark :global(svg) {
		width: 100%;
		height: 100%;
		display: block;
	}
	.group {
		background: radial-gradient(120% 120% at 50% 40%, #0f1220 0%, #090a10 70%, #07080b 100%);
	}
	.tool {
		position: absolute;
		top: 0.5rem;
		display: flex;
		height: 1.6rem;
		width: 1.6rem;
		align-items: center;
		justify-content: center;
		border-radius: 0.4rem;
		border: 1px solid var(--border);
		background: color-mix(in oklab, var(--card) 70%, transparent);
		color: var(--muted-foreground);
		backdrop-filter: blur(4px);
		transition:
			opacity 0.16s ease,
			color 0.16s ease,
			border-color 0.16s ease;
	}
	.tool:hover:not(:disabled) {
		color: var(--primary);
		border-color: var(--primary);
	}
	.tool:disabled {
		cursor: not-allowed;
		opacity: 0.25 !important;
	}
	.range {
		width: 100%;
		height: 2px;
		appearance: none;
		border-radius: 2px;
		background: color-mix(in oklab, var(--foreground) 18%, transparent);
		accent-color: var(--primary);
		cursor: pointer;
	}
	.range::-webkit-slider-thumb {
		appearance: none;
		width: 13px;
		height: 13px;
		border-radius: 50%;
		background: var(--primary);
		border: 2px solid var(--background);
		cursor: pointer;
	}
	.range::-moz-range-thumb {
		width: 13px;
		height: 13px;
		border-radius: 50%;
		background: var(--primary);
		border: 2px solid var(--background);
		cursor: pointer;
	}

	/* Editor (lightbox) controls */
	.edlabel {
		font-size: 0.66rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: color-mix(in oklab, var(--foreground) 46%, transparent);
	}
	.edval {
		font-family: ui-monospace, monospace;
		font-size: 0.72rem;
		color: var(--primary);
		font-variant-numeric: tabular-nums;
	}
	.edrow {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 0.35rem;
	}
	.edselect {
		margin-top: 0.25rem;
		width: 100%;
		border-radius: 0.375rem;
		border: 1px solid var(--border);
		background: color-mix(in oklab, var(--foreground) 5%, transparent);
		padding: 0.4rem 0.55rem;
		font-size: 0.8rem;
		color: var(--foreground);
	}
	.edselect:focus {
		outline: none;
		border-color: var(--primary);
	}
	.chip {
		border: 1px solid var(--border);
		background: color-mix(in oklab, var(--foreground) 5%, transparent);
		color: color-mix(in oklab, var(--foreground) 62%, transparent);
		border-radius: 0.375rem;
		padding: 0.26rem 0.6rem;
		font-size: 0.72rem;
		transition:
			color 0.15s ease,
			background 0.15s ease,
			border-color 0.15s ease;
	}
	.chip:hover {
		color: var(--foreground);
	}
	.chip[aria-pressed='true'] {
		border-color: var(--primary);
		background: var(--primary);
		color: var(--primary-foreground);
	}
	.sw {
		height: 1.6rem;
		width: 1.6rem;
		border-radius: 9999px;
		border: 2px solid transparent;
		transition: transform 0.15s ease;
	}
	.sw:hover {
		transform: scale(1.1);
	}
	.sw[aria-pressed='true'] {
		border-color: var(--foreground);
	}
</style>
