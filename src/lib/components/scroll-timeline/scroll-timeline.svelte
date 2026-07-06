<script lang="ts">
	// A slim scroll-progress rail pinned to the right edge. One marker per waypoint,
	// each placed at the scroll fraction where that moment happens in the hero; the
	// rail fills as the page scrolls and a marker lights up the instant its position
	// is reached. Clicking a marker scrolls to it. Fades in once the user leaves the
	// very top, so it reads as "there's more below" without cluttering the hero.
	//
	// Layout contract: position:fixed on the right edge. The page owns the scroll math
	// and passes normalized progress (0-1) plus each waypoint's threshold (0-1).
	//
	// `arrivalOffset` nudges a marker down a touch past its threshold for things that
	// animate in a beat after their trigger (the cards fly up into view); leave it 0
	// for an instant trigger (the glyphs start drifting right at theirs).
	type Point = { title: string; threshold: number; arrivalOffset?: number };

	let {
		progress,
		points,
		visible,
		onSeek
	}: {
		progress: number; // current scroll progress, 0 (top) to 1 (bottom)
		points: Point[]; // waypoints, in scroll order
		visible: boolean; // fade in once the user has left the very top
		onSeek?: (threshold: number) => void; // jump the page to a waypoint's scroll position
	} = $props();

	const clamped = $derived(progress < 0 ? 0 : progress > 1 ? 1 : progress);
	const at = (p: Point) => Math.min(1, p.threshold + (p.arrivalOffset ?? 0)); // effective scroll spot
</script>

<nav
	aria-label="Project timeline"
	class="fixed top-1/2 right-5 z-20 hidden -translate-y-1/2 transition-opacity duration-500 sm:block lg:right-8"
	class:opacity-0={!visible}
	class:pointer-events-none={!visible}
	aria-hidden={!visible}
>
	<div class="relative h-[min(60vh,26rem)] w-px">
		<!-- The track, the filled-so-far portion, and a glowing head at the current spot. -->
		<div class="absolute inset-0 w-px rounded-full bg-foreground/15"></div>
		<div
			class="absolute top-0 left-0 w-px rounded-full bg-primary/70"
			style="height: {clamped * 100}%"
		></div>
		<span
			class="absolute left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
			style="top: {clamped * 100}%"
			aria-hidden="true"
		></span>

		{#each points as p, i (p.title)}
			{@const spot = at(p)}
			{@const visualPos = points.length > 1 ? i / (points.length - 1) : 0.5}
			{@const reached = clamped >= spot}
			<button
				type="button"
				onclick={() => onSeek?.(spot)}
				aria-label="Scroll to {p.title}"
				class="dot-btn absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center p-1.5"
				style="top: {visualPos * 100}%"
			>
				<span
					class="label absolute top-1/2 right-[calc(100%+0.6rem)] -translate-y-1/2 text-right text-xs whitespace-nowrap"
					class:reached>{p.title}</span
				>
				<span class="dot block size-2 rounded-full transition-all duration-300" class:reached
				></span>
			</button>
		{/each}
	</div>
</nav>

<style>
	.dot {
		border: 1px solid var(--color-foreground);
		opacity: 0.35;
	}
	.dot-btn:hover .dot {
		opacity: 0.75;
	}
	.dot.reached {
		border-color: var(--color-primary);
		background: var(--color-primary);
		opacity: 1;
		transform: scale(1.4);
	}

	.label {
		color: var(--color-foreground);
		opacity: 0;
		transition: opacity 0.3s ease;
	}
	.dot-btn:hover .label {
		opacity: 0.85;
	}
	.label.reached {
		opacity: 0.9;
		color: var(--color-primary);
	}

	@media (prefers-reduced-motion: reduce) {
		.dot,
		.label {
			transition: none;
		}
	}
</style>
