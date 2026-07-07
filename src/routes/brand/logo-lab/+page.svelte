<script lang="ts">
	import { Button } from '$lib/components/shadcn/ui/button/index.js';
	import { Switch } from '$lib/components/shadcn/ui/switch/index.js';
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';
	import { ArrowLeft, Copy, Download, Lock, LockOpen, RefreshCw, Shuffle, X } from '@lucide/svelte';
	import {
		buildLogo,
		seedFor,
		PALETTES,
		FRAME_KINDS,
		type FrameKind,
		type Palette,
		type LogoOptions
	} from '$lib/logo/index.js';

	const N = 12;
	// A fixed base so the first paint is identical on the server and the client (no
	// hydration mismatch). Randomness only enters on user action (Regenerate/reroll).
	const INITIAL_SEED = 20260706;

	let baseSeed = $state(INITIAL_SEED);
	let seeds = $state<number[]>(Array.from({ length: N }, (_, i) => seedFor(INITIAL_SEED, i)));
	let locked = $state<boolean[]>(new Array(N).fill(false));

	let density = $state(1);
	let stroke = $state(1);
	let frame = $state<FrameKind | 'random'>('random');
	let palette = $state<Palette>('aurum');
	let wordmark = $state(true);
	let wordmarkText = $state('VOIDPROJECTS');

	const options = $derived<LogoOptions>({
		density,
		stroke,
		frame,
		palette,
		wordmark,
		wordmarkText
	});

	// Rebuilding all twelve marks on any option change is cheap (pure string work).
	const tiles = $derived(seeds.map((s) => buildLogo(s, options)));

	const FRAME_LABELS: Record<FrameKind | 'random', string> = {
		random: 'Surprise me',
		diamond: 'Diamond',
		circle: 'Circle',
		hex: 'Hexagon',
		triangle: 'Triangle',
		diamondDouble: 'Double',
		vesica: 'Vesica',
		octagon: 'Octagon',
		arch: 'Arch',
		rings: 'Rings',
		compass: 'Compass',
		brackets: 'Brackets',
		none: 'None'
	};
	const frameChoices: (FrameKind | 'random')[] = ['random', ...FRAME_KINDS];

	const PALETTE_LABELS: Record<Palette, string> = {
		brand: 'Brand',
		aurum: 'Aurum',
		argent: 'Argent',
		nebula: 'Nebula',
		ember: 'Ember'
	};
	const paletteChoices = Object.keys(PALETTES) as Palette[];

	const rand = () => (Math.random() * 1e9) | 0;

	function regenerate() {
		baseSeed = rand();
		seeds = seeds.map((s, i) => (locked[i] ? s : seedFor(baseSeed, i)));
	}
	function reroll(i: number) {
		if (locked[i]) return;
		seeds = seeds.with(i, rand());
	}
	function toggleLock(i: number) {
		locked = locked.with(i, !locked[i]);
	}

	function fileName(i: number) {
		return `voidprojects-mark-${seeds[i].toString(36)}.svg`;
	}
	function downloadSvg(i: number) {
		const blob = new Blob([tiles[i].svg], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = fileName(i);
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
		toast(`Downloaded mark #${String(i + 1).padStart(2, '0')}`);
	}
	async function copySvg(i: number) {
		try {
			await navigator.clipboard.writeText(tiles[i].svg);
			toast('SVG markup copied');
		} catch {
			toast('Copy blocked by the browser');
		}
	}

	// Lightbox
	let lbIndex = $state<number | null>(null);
	const openTile = (i: number) => (lbIndex = i);
	const closeTile = () => (lbIndex = null);

	// Toast
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
</script>

<svelte:head>
	<title>Logo Lab · Void Projects</title>
	<meta name="robots" content="noindex" />
	<meta
		name="description"
		content="A generative lab that brute-forces thin-line, space-themed constellation marks for Void Projects."
	/>
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
	<span class="text-xs tracking-[0.22em] text-foreground/40 uppercase">Logo Lab</span>
</header>

<main
	class="mx-auto grid max-w-[1400px] gap-6 px-6 pb-24 sm:px-12 lg:grid-cols-[300px_1fr] lg:px-20"
>
	<!-- Control rail -->
	<aside class="lg:sticky lg:top-20 lg:h-fit">
		<GlassCard class="flex flex-col gap-6 p-6">
			<div>
				<h1 class="text-lg font-semibold tracking-tight">Candidate marks</h1>
				<p class="mt-1 text-[13px] leading-relaxed text-foreground/55">
					Twelve constellations, each seeded on its own. Stars land on the golden angle; lines are
					either a real asterism, the shortest tree, or a traced path. Lock the keepers before you
					regenerate.
				</p>
			</div>

			<div class="flex flex-col gap-4">
				<div>
					<div class="mb-1.5 flex items-baseline justify-between">
						<span class="text-[13px]">Star density</span>
						<span class="font-mono text-xs text-primary tabular-nums">{density.toFixed(2)}×</span>
					</div>
					<input type="range" min="0.5" max="1.6" step="0.05" bind:value={density} class="range" />
				</div>
				<div>
					<div class="mb-1.5 flex items-baseline justify-between">
						<span class="text-[13px]">Stroke weight</span>
						<span class="font-mono text-xs text-primary tabular-nums">{stroke.toFixed(2)}×</span>
					</div>
					<input type="range" min="0.6" max="1.8" step="0.05" bind:value={stroke} class="range" />
				</div>
			</div>

			<div>
				<h2 class="mb-2 text-[11px] font-semibold tracking-[0.16em] text-foreground/45 uppercase">
					Frame
				</h2>
				<div class="flex flex-wrap gap-1.5">
					{#each frameChoices as choice (choice)}
						<button
							type="button"
							onclick={() => (frame = choice)}
							aria-pressed={frame === choice}
							class="rounded-md border px-2.5 py-1 text-xs transition-colors
								{frame === choice
								? 'border-primary bg-primary text-primary-foreground'
								: 'border-border bg-foreground/5 text-foreground/60 hover:text-foreground'}"
						>
							{FRAME_LABELS[choice]}
						</button>
					{/each}
				</div>
			</div>

			<div>
				<h2 class="mb-2 text-[11px] font-semibold tracking-[0.16em] text-foreground/45 uppercase">
					Palette
				</h2>
				<div class="flex gap-2">
					{#each paletteChoices as p (p)}
						<button
							type="button"
							onclick={() => (palette = p)}
							aria-pressed={palette === p}
							title={PALETTE_LABELS[p]}
							aria-label={PALETTE_LABELS[p]}
							class="size-7 rounded-full border-2 transition-transform hover:scale-110
								{palette === p ? 'border-foreground' : 'border-transparent'}"
							style="background:{PALETTES[p].stroke}"
						></button>
					{/each}
				</div>
			</div>

			<div class="flex flex-col gap-3">
				<label class="flex items-center justify-between">
					<span class="text-[13px]">Show wordmark</span>
					<Switch bind:checked={wordmark} />
				</label>
				<input
					bind:value={wordmarkText}
					maxlength="18"
					spellcheck="false"
					aria-label="Wordmark text"
					class="w-full rounded-md border border-border bg-foreground/5 px-3 py-2 text-xs tracking-[0.16em] uppercase focus:border-primary focus:outline-none"
				/>
			</div>

			<Button onclick={regenerate} class="gap-2">
				<RefreshCw class="size-4" />
				Regenerate all
			</Button>
			<p class="text-center font-mono text-[11px] text-foreground/35">
				seed base · {seedCode(baseSeed)}
			</p>
		</GlassCard>
	</aside>

	<!-- Gallery -->
	<section class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
		{#each tiles as tile, i (i)}
			<div
				class="group relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl border transition-all hover:-translate-y-0.5
					{locked[i] ? 'border-primary/50' : 'border-border hover:border-primary/40'}"
			>
				<button
					type="button"
					onclick={() => openTile(i)}
					class="mark flex size-full items-center justify-center p-[9%]"
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
					class="tool right-11 opacity-0 group-hover:opacity-100"
				>
					<Download class="size-3.5" />
				</button>
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
					disabled={locked[i]}
				>
					<Shuffle class="size-3.5" />
				</button>

				<span
					class="pointer-events-none absolute bottom-2 left-3 font-mono text-[10px] tracking-wider text-foreground/35 tabular-nums"
				>
					#{String(i + 1).padStart(2, '0')} · {seedCode(seeds[i])}
				</span>
			</div>
		{/each}
	</section>
</main>

<!-- Lightbox -->
{#if lbIndex !== null}
	{@const tile = tiles[lbIndex]}
	{@const i = lbIndex}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-md"
		role="button"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) closeTile();
		}}
		onkeydown={() => {}}
	>
		<GlassCard class="grid w-full max-w-[760px] gap-0 overflow-hidden sm:grid-cols-[1fr_260px]">
			<div class="mark flex items-center justify-center bg-black/40 p-10">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html tile.svg}
			</div>
			<div class="flex flex-col gap-1 border-t border-border p-6 sm:border-t-0 sm:border-l">
				<div class="mb-3 flex items-center justify-between">
					<h2 class="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Mark</h2>
					<button
						type="button"
						onclick={closeTile}
						aria-label="Close"
						class="text-foreground/50 hover:text-foreground"><X class="size-4" /></button
					>
				</div>
				<dl class="mb-5 flex flex-col gap-2 text-xs">
					{#each [['Index', `#${String(i + 1).padStart(2, '0')}`], ['Seed', seedCode(tile.meta.seed)], ['Frame', tile.meta.frame], ['Figure', tile.meta.constellation], ['Stars', `${tile.meta.stars} · ${tile.meta.bright} bright`], ['Planet', tile.meta.planet ? 'yes' : '—']] as [k, v] (k)}
						<div class="flex justify-between gap-3 border-b border-dashed border-border pb-1.5">
							<dt class="text-foreground/50">{k}</dt>
							<dd class="text-right font-medium tabular-nums">{v}</dd>
						</div>
					{/each}
				</dl>
				<div class="mt-auto flex flex-col gap-2">
					<Button onclick={() => downloadSvg(i)} class="gap-2">
						<Download class="size-4" /> Download SVG
					</Button>
					<Button variant="outline" onclick={() => copySvg(i)} class="gap-2">
						<Copy class="size-4" /> Copy markup
					</Button>
					<Button variant="ghost" onclick={() => toggleLock(i)} class="gap-2">
						{#if locked[i]}<Lock class="size-4" /> Unlock{:else}<LockOpen class="size-4" /> Lock{/if}
					</Button>
				</div>
			</div>
		</GlassCard>
	</div>
{/if}

<!-- Toast -->
<div
	class="pointer-events-none fixed bottom-6 left-1/2 z-60 -translate-x-1/2 rounded-lg border border-primary/60 bg-card px-4 py-2.5 text-xs text-foreground shadow-lg transition-all duration-200
		{toastOn ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}"
	role="status"
	aria-live="polite"
>
	{toastMsg}
</div>

<style>
	/* Injected marks carry only a viewBox; let them fill their button box. */
	.mark :global(svg) {
		width: 100%;
		height: 100%;
		display: block;
	}

	/* Give each tile canvas its own dark, faintly-lit ground so the thin strokes
	   read the same way they will on the marketing site. */
	.group {
		background: radial-gradient(120% 120% at 50% 30%, #0f1220 0%, #090a10 70%, #07080b 100%);
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

	@media (prefers-reduced-motion: reduce) {
		.group,
		.tool,
		.range {
			transition: none;
		}
	}
</style>
