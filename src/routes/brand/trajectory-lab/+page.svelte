<script lang="ts">
	import { Button } from '$lib/components/shadcn/ui/button/index.js';
	import { Switch } from '$lib/components/shadcn/ui/switch/index.js';
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';
	import { ArrowLeft, Download } from '@lucide/svelte';
	import {
		buildTrajectory,
		CRAFT_META,
		CRAFT_IDS,
		type RadialScale,
		type TrajectoryPalette
	} from '$lib/trajectory';

	// Default to the four probes that left the solar system; the rest toggle on.
	const OUTBOUND = ['pioneer10', 'pioneer11', 'voyager1', 'voyager2'];
	let selected = $state<string[]>(CRAFT_IDS.filter((id) => OUTBOUND.includes(id)));
	let scale = $state<RadialScale>('log');
	let maxAU = $state(70);
	let rotation = $state(0);
	let stroke = $state(1);
	let smoothing = $state(0.6);
	let palette = $state<TrajectoryPalette>('spectral');
	let planetRings = $state(true);
	let yearDots = $state(true);
	let yearEvery = $state(1);
	let sun = $state(true);

	const built = $derived(
		buildTrajectory({
			craft: selected,
			scale,
			maxAU,
			rotation,
			stroke,
			smoothing,
			palette,
			planetRings,
			yearDots,
			yearEvery,
			sun
		})
	);

	const scales: { id: RadialScale; label: string }[] = [
		{ id: 'linear', label: 'Linear' },
		{ id: 'sqrt', label: 'Root' },
		{ id: 'log', label: 'Log' }
	];
	const palettes: { id: TrajectoryPalette; label: string; swatch: string }[] = [
		{ id: 'spectral', label: 'Spectral', swatch: 'linear-gradient(90deg,#e8c58a,#b79cf5,#7fd7e8)' },
		{ id: 'aurum', label: 'Aurum', swatch: '#e8c58a' },
		{ id: 'brand', label: 'Brand', swatch: '#b79cf5' },
		{ id: 'mono', label: 'Mono', swatch: '#e6e3da' }
	];

	function toggleCraft(id: string) {
		selected = selected.includes(id) ? selected.filter((c) => c !== id) : [...selected, id];
	}

	function download() {
		const blob = new Blob([built.svg], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `voidprojects-trajectory-${scale}-${maxAU}au.svg`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}
</script>

<svelte:head>
	<title>Trajectory Lab · Void Projects</title>
	<meta name="robots" content="noindex" />
</svelte:head>

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
	<span class="text-xs tracking-[0.22em] text-foreground/40 uppercase">Trajectory Lab</span>
</header>

<main class="mx-auto grid max-w-[1200px] gap-6 px-6 pb-24 sm:px-12 lg:grid-cols-[300px_1fr] lg:px-20">
	<aside class="lg:sticky lg:top-20 lg:h-fit">
		<GlassCard class="flex flex-col gap-6 p-6">
			<div>
				<h1 class="text-lg font-semibold tracking-tight">Trajectory mark</h1>
				<p class="mt-1 text-[13px] leading-relaxed text-foreground/55">
					Real heliocentric paths of the four probes that left the solar system, from JPL HORIZONS,
					viewed down the north ecliptic pole. A log radial scale blooms the gravity-assist swirl
					into the mark.
				</p>
			</div>

			<div>
				<h2 class="mb-2 text-[11px] font-semibold tracking-[0.16em] text-foreground/45 uppercase">
					Spacecraft
				</h2>
				<div class="flex flex-wrap gap-1.5">
					{#each CRAFT_META as c (c.id)}
						<button
							type="button"
							onclick={() => toggleCraft(c.id)}
							aria-pressed={selected.includes(c.id)}
							class="rounded-md border px-2.5 py-1 text-xs transition-colors
								{selected.includes(c.id)
								? 'border-primary bg-primary text-primary-foreground'
								: 'border-border bg-foreground/5 text-foreground/60 hover:text-foreground'}"
						>
							{c.name}
						</button>
					{/each}
				</div>
			</div>

			<div>
				<h2 class="mb-2 text-[11px] font-semibold tracking-[0.16em] text-foreground/45 uppercase">
					Radial scale
				</h2>
				<div class="flex gap-1.5">
					{#each scales as s (s.id)}
						<button
							type="button"
							onclick={() => (scale = s.id)}
							aria-pressed={scale === s.id}
							class="flex-1 rounded-md border px-2 py-1 text-xs transition-colors
								{scale === s.id
								? 'border-primary bg-primary text-primary-foreground'
								: 'border-border bg-foreground/5 text-foreground/60 hover:text-foreground'}"
						>
							{s.label}
						</button>
					{/each}
				</div>
			</div>

			<div class="flex flex-col gap-4">
				<div>
					<div class="mb-1.5 flex items-baseline justify-between">
						<span class="text-[13px]">Reach</span>
						<span class="font-mono text-xs text-primary tabular-nums">{maxAU} AU</span>
					</div>
					<input type="range" min="6" max="74" step="1" bind:value={maxAU} class="range" />
				</div>
				<div>
					<div class="mb-1.5 flex items-baseline justify-between">
						<span class="text-[13px]">Rotation</span>
						<span class="font-mono text-xs text-primary tabular-nums">{rotation}°</span>
					</div>
					<input type="range" min="0" max="360" step="1" bind:value={rotation} class="range" />
				</div>
				<div>
					<div class="mb-1.5 flex items-baseline justify-between">
						<span class="text-[13px]">Stroke weight</span>
						<span class="font-mono text-xs text-primary tabular-nums">{stroke.toFixed(2)}×</span>
					</div>
					<input type="range" min="0.5" max="2" step="0.05" bind:value={stroke} class="range" />
				</div>
				<div>
					<div class="mb-1.5 flex items-baseline justify-between">
						<span class="text-[13px]">Smoothing</span>
						<span class="font-mono text-xs text-primary tabular-nums">{smoothing.toFixed(2)}</span>
					</div>
					<input type="range" min="0" max="1.5" step="0.05" bind:value={smoothing} class="range" />
				</div>
			</div>

			<div>
				<h2 class="mb-2 text-[11px] font-semibold tracking-[0.16em] text-foreground/45 uppercase">
					Palette
				</h2>
				<div class="flex gap-2">
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

			<div class="flex flex-col gap-3">
				<label class="flex items-center justify-between">
					<span class="text-[13px]">Planet rings</span>
					<Switch bind:checked={planetRings} />
				</label>
				<label class="flex items-center justify-between">
					<span class="text-[13px]">Year dots</span>
					<Switch bind:checked={yearDots} />
				</label>
				<label class="flex items-center justify-between">
					<span class="text-[13px]">Sun</span>
					<Switch bind:checked={sun} />
				</label>
			</div>

			<Button onclick={download} class="gap-2">
				<Download class="size-4" />
				Download SVG
			</Button>
		</GlassCard>
	</aside>

	<section class="flex items-center justify-center">
		<div class="mark aspect-square w-full max-w-[560px] rounded-2xl border border-border p-8">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html built.svg}
		</div>
	</section>
</main>

<style>
	.mark {
		background: radial-gradient(120% 120% at 50% 40%, #0f1220 0%, #090a10 70%, #07080b 100%);
	}
	.mark :global(svg) {
		width: 100%;
		height: 100%;
		display: block;
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
</style>
