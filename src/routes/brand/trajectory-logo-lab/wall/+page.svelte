<!--
	Capture page for video: the orbit-mark lab as a fullscreen wall that reshuffles
	itself. Tiles sit on the root layout's star field (no backing fill), and the grid
	is sized to cover the viewport exactly, so a screen recording sees only marks.

	Two kinds of churn run off one jittered timer: a *reroll* swaps one tile's mark
	(crossfade, keyed on the seed) and a *shuffle* exchanges two tiles' positions
	(FLIP). The controls fade out while the pointer is idle so they stay out of frame.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import type { TransitionConfig } from 'svelte/transition';
	import { Maximize, Pause, Play } from '@lucide/svelte';
	import { CRAFT_META } from '$lib/trajectory';
	import { brandColor } from '$lib/brand/colors.js';
	import {
		deriveSpec,
		renderSpec,
		type TLGlobals,
		type TLPalette,
		type TLSymmetry
	} from '$lib/brand/labs/trajectory-logo.js';

	const SWAP_MS = 720; // mark crossfade
	const FLIP_MS = 620; // position exchange
	const INTRO_STEP_MS = 14; // per-tile stagger of the opening cascade

	let tile = $state(180); // target cell size (px); the grid rounds to fill the viewport
	let churn = $state(3.4); // reshuffle actions per second
	let shuffleBias = $state(0.4); // share of actions that move tiles rather than reroll them
	let paused = $state(false);

	let stroke = $state(1.15);
	let palette = $state<TLPalette>('brand');
	let symmetry = $state<TLSymmetry>('emblem');
	const pool = CRAFT_META.map((c) => c.id);

	// Resolved from --color-primary once mounted; until then the engine's own fallback
	// violet stands in, so the first paint is never the wrong hue.
	let ink = $state<string | undefined>(undefined);

	const globals = $derived<TLGlobals>({
		stroke,
		palette,
		ink,
		frameMode: 'random',
		symmetry,
		pool
	});

	let vw = $state(1600);
	let vh = $state(900);
	const cols = $derived(Math.max(1, Math.round(vw / tile)));
	const rows = $derived(Math.max(1, Math.round(vh / tile)));
	const count = $derived(cols * rows);

	// Rendering a mark is pure over (seed, globals), so memoize it: a reshuffle touches
	// one tile but re-derives the whole array, and every unchanged tile hits the cache.
	const gkey = $derived(`${stroke}|${palette}|${ink}|${symmetry}`);
	let cache: Record<string, string> = {}; // plain object: a cache hit must not create a reactive read
	let cacheKey = '';
	function svgFor(seed: number, key: string): string {
		if (key !== cacheKey) {
			cache = {};
			cacheKey = key;
		}
		let svg = cache[seed];
		if (!svg) {
			svg = renderSpec(deriveSpec(seed, globals)).svg;
			if (Object.keys(cache).length > 400) cache = {};
			cache[seed] = svg;
		}
		return svg;
	}

	const rand = () => (Math.random() * 1e9) | 0;
	let nextId = 0;
	let items = $state<{ id: number; seed: number }[]>([]);
	// Only the opening cascade staggers; later swaps must not inherit its delay.
	let intro = $state(true);

	// Grow or trim the wall to the current grid, keeping the marks already on screen.
	$effect(() => {
		const n = count;
		if (items.length === n) return;
		items =
			items.length < n
				? [
						...items,
						...Array.from({ length: n - items.length }, () => ({ id: nextId++, seed: rand() }))
					]
				: items.slice(0, n);
	});

	const pick = () => Math.floor(Math.random() * items.length);
	function reroll() {
		const i = pick();
		items[i] = { ...items[i], seed: rand() };
	}
	function shuffle() {
		if (items.length < 2) return;
		const a = pick();
		let b = pick();
		if (b === a) b = (a + 1 + Math.floor(Math.random() * (items.length - 1))) % items.length;
		const next = [...items];
		[next[a], next[b]] = [next[b], next[a]];
		items = next;
	}

	// Jittered self-scheduling tick: a fixed interval reads as a metronome on camera.
	onMount(() => {
		ink = brandColor() || undefined;
		let timer: ReturnType<typeof setTimeout>;
		const introTimer = setTimeout(() => (intro = false), 1200);
		const tick = () => {
			if (!paused && items.length) (Math.random() < shuffleBias ? shuffle : reroll)();
			const base = 1000 / Math.max(0.2, churn);
			timer = setTimeout(tick, base * (0.55 + Math.random() * 0.9));
		};
		timer = setTimeout(tick, 900);
		return () => {
			clearTimeout(timer);
			clearTimeout(introTimer);
		};
	});

	// Crossfade a mark in or out through a slight scale + spin. `t` runs 1→0 on exit,
	// so one function serves both directions.
	function swap(_node: Element, { delay = 0, spin = 0 } = {}): TransitionConfig {
		return {
			delay,
			duration: SWAP_MS,
			easing: cubicOut,
			css: (t, u) => `opacity:${t}; transform: scale(${0.84 + 0.16 * t}) rotate(${u * spin}deg)`
		};
	}

	let uiVisible = $state(true);
	let idleTimer: ReturnType<typeof setTimeout>;
	function wake() {
		uiVisible = true;
		clearTimeout(idleTimer);
		idleTimer = setTimeout(() => (uiVisible = false), 2600);
	}

	const enterFullscreen = () => document.documentElement.requestFullscreen?.();

	const palettes: { id: TLPalette; label: string; swatch: string }[] = [
		{ id: 'brand', label: 'Brand', swatch: 'var(--color-primary)' },
		{ id: 'aurum', label: 'Aurum', swatch: '#e8c58a' },
		{ id: 'argent', label: 'Argent', swatch: '#d8dee9' },
		{ id: 'mono', label: 'Mono', swatch: '#e6e3da' },
		{ id: 'duo', label: 'Duo', swatch: 'linear-gradient(90deg,#b79cf5,#e8c58a)' },
		{ id: 'spectral', label: 'Spectral', swatch: 'linear-gradient(90deg,#e8c58a,#7fd7e8)' }
	];
	const symmetries: { id: TLSymmetry; label: string }[] = [
		{ id: 'mixed', label: 'Mixed' },
		{ id: 'emblem', label: 'Emblem' },
		{ id: 'single', label: 'Single' }
	];
</script>

<svelte:head>
	<title>Orbit Mark Wall · Void Projects</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<svelte:window
	bind:innerWidth={vw}
	bind:innerHeight={vh}
	onpointermove={wake}
	onkeydown={(e) => {
		if (e.key === ' ') {
			e.preventDefault();
			paused = !paused;
			wake();
		}
	}}
/>

<div
	class="wall"
	style="--cols:{cols}; --rows:{rows}"
	role="presentation"
	onpointerdown={() => (paused = !paused)}
>
	{#each items as item, i (item.id)}
		<div class="cell" animate:flip={{ duration: FLIP_MS, easing: cubicOut }}>
			{#key item.seed}
				<div
					class="mark"
					in:swap={{ delay: intro ? i * INTRO_STEP_MS : 0, spin: -10 }}
					out:swap={{ spin: 10 }}
				>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html svgFor(item.seed, gkey)}
				</div>
			{/key}
		</div>
	{/each}
</div>

<div
	class="ui"
	class:hidden={!uiVisible}
	role="presentation"
	onpointerdown={(e) => e.stopPropagation()}
>
	<button class="icon" onclick={() => (paused = !paused)} aria-label={paused ? 'Play' : 'Pause'}>
		{#if paused}<Play class="size-3.5" />{:else}<Pause class="size-3.5" />{/if}
	</button>

	<label class="field">
		<span>Size</span>
		<input type="range" min="90" max="360" step="5" bind:value={tile} />
	</label>
	<label class="field">
		<span>Churn</span>
		<input type="range" min="0.4" max="14" step="0.2" bind:value={churn} />
	</label>
	<label class="field">
		<span>Move</span>
		<input type="range" min="0" max="1" step="0.05" bind:value={shuffleBias} />
	</label>
	<label class="field">
		<span>Stroke</span>
		<input type="range" min="0.5" max="2" step="0.05" bind:value={stroke} />
	</label>

	<div class="group">
		{#each symmetries as s (s.id)}
			<button class="chip" aria-pressed={symmetry === s.id} onclick={() => (symmetry = s.id)}>
				{s.label}
			</button>
		{/each}
	</div>

	<div class="group">
		{#each palettes as p (p.id)}
			<button
				class="sw"
				aria-pressed={palette === p.id}
				aria-label={p.label}
				title={p.label}
				style="background:{p.swatch}"
				onclick={() => (palette = p.id)}
			></button>
		{/each}
	</div>

	<button class="icon" onclick={enterFullscreen} aria-label="Fullscreen">
		<Maximize class="size-3.5" />
	</button>
</div>

<style>
	:global(html) {
		overflow: hidden;
	}

	.wall {
		position: fixed;
		inset: 0;
		z-index: 1;
		display: grid;
		grid-template-columns: repeat(var(--cols), 1fr);
		grid-template-rows: repeat(var(--rows), 1fr);
	}

	.cell {
		position: relative;
	}

	/* Both marks of a crossfade occupy the cell at once, so they must not reserve
	   layout space from each other. */
	.mark {
		position: absolute;
		inset: 12%;
		will-change: transform, opacity;
	}
	.mark :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}

	.ui {
		position: fixed;
		bottom: 1.25rem;
		left: 50%;
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 0.85rem;
		transform: translateX(-50%);
		padding: 0.6rem 0.9rem;
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		background: color-mix(in oklab, var(--card) 72%, transparent);
		backdrop-filter: blur(8px);
		transition:
			opacity 0.35s ease,
			transform 0.35s ease;
	}
	.ui.hidden {
		opacity: 0;
		transform: translate(-50%, 0.75rem);
		pointer-events: none;
	}

	.field {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.field span {
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: color-mix(in oklab, var(--foreground) 45%, transparent);
	}

	input[type='range'] {
		width: 5.5rem;
		height: 2px;
		appearance: none;
		border-radius: 2px;
		background: color-mix(in oklab, var(--foreground) 18%, transparent);
		cursor: pointer;
	}
	input[type='range']::-webkit-slider-thumb {
		appearance: none;
		width: 11px;
		height: 11px;
		border-radius: 50%;
		background: var(--primary);
		border: 2px solid var(--background);
		cursor: pointer;
	}
	input[type='range']::-moz-range-thumb {
		width: 11px;
		height: 11px;
		border-radius: 50%;
		background: var(--primary);
		border: 2px solid var(--background);
		cursor: pointer;
	}

	.group {
		display: flex;
		gap: 0.3rem;
	}

	.icon {
		display: flex;
		height: 1.7rem;
		width: 1.7rem;
		align-items: center;
		justify-content: center;
		border-radius: 0.4rem;
		border: 1px solid var(--border);
		color: var(--muted-foreground);
	}
	.icon:hover {
		color: var(--primary);
		border-color: var(--primary);
	}

	.chip {
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		padding: 0.2rem 0.5rem;
		font-size: 0.68rem;
		color: color-mix(in oklab, var(--foreground) 62%, transparent);
	}
	.chip[aria-pressed='true'] {
		border-color: var(--primary);
		background: var(--primary);
		color: var(--primary-foreground);
	}

	.sw {
		height: 1.25rem;
		width: 1.25rem;
		border-radius: 9999px;
		border: 2px solid transparent;
	}
	.sw[aria-pressed='true'] {
		border-color: var(--foreground);
	}
</style>
