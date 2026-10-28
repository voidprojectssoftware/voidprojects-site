<script lang="ts">
	import { tick } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade, fly } from 'svelte/transition';
	import { ArrowRight, Check, CircleAlert, RotateCcw, Sparkles } from '@lucide/svelte';
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';
	import { DIY } from '$lib/content/websites.js';

	const P = DIY.plates;
	const AD = [
		'from-sky-400 via-blue-500 to-indigo-600',
		'from-emerald-400 via-teal-500 to-cyan-600',
		'from-fuchsia-500 via-pink-500 to-orange-400'
	]; // parallel to DIY.options
	const PILE = [
		'-rotate-2 ml-1',
		'rotate-[1.5deg] ml-5',
		'-rotate-1 ml-0',
		'rotate-2 ml-4',
		'-rotate-[2.5deg] ml-2',
		'rotate-1 ml-6'
	]; // parallel to DIY.chores

	let flipped = $state(DIY.options.map(() => false));
	let ours = $state(false);
	let touched = $state(false);
	let plates: HTMLElement;

	const yourChores = $derived(ours ? [] : DIY.chores);
	const ourChores = $derived(ours ? DIY.chores : []);
	const still = () => prefersReducedMotion.current;

	// Each chore is a fresh node in whichever list now holds it, so the move is a
	// manual FLIP: measure every chore, swap lists, then play each new node from
	// its old spot. No outros means the layout settles before measuring, which
	// keeps the motion right when the plates stack on narrow screens.
	async function toggle() {
		touched = true;
		const before: Record<string, { rect: DOMRect; rotate: string }> = {};
		if (!still()) {
			for (const el of plates.querySelectorAll<HTMLElement>('[data-chore]')) {
				const rotate = getComputedStyle(el).rotate;
				before[el.dataset.chore!] = {
					rect: el.getBoundingClientRect(),
					rotate: rotate === 'none' ? '0deg' : rotate
				};
			}
		}
		ours = !ours;
		if (still()) return;
		await tick();
		let i = 0;
		for (const el of plates.querySelectorAll<HTMLElement>('[data-chore]')) {
			const from = before[el.dataset.chore!];
			if (!from) continue;
			const to = el.getBoundingClientRect();
			const rotate = getComputedStyle(el).rotate;
			el.animate(
				[
					{
						translate: `${from.rect.left - to.left}px ${from.rect.top - to.top}px`,
						rotate: from.rotate
					},
					{ translate: '0px 0px', rotate: rotate === 'none' ? '0deg' : rotate }
				],
				{
					duration: 650,
					delay: i++ * 70,
					easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
					fill: 'backwards'
				}
			);
		}
	}

	// A mouse already flipped the card on hover, so its click would only undo that.
	function hover(i: number, e: PointerEvent, on: boolean) {
		if (e.pointerType === 'mouse') flipped[i] = on;
	}
	function flip(i: number, e: MouseEvent) {
		if ((e as PointerEvent).pointerType !== 'mouse') flipped[i] = !flipped[i];
	}
</script>

<div class="flex w-full flex-col gap-12">
	<div class="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
		<h2 class="flex flex-col gap-1 text-3xl font-bold tracking-tight sm:text-4xl">
			<span>{DIY.title}</span>
			<span class="text-primary">{DIY.accent}</span>
		</h2>
		<p class="text-lg leading-relaxed text-balance text-foreground/65">{DIY.body}</p>
	</div>

	<!-- Both faces share one grid cell, so the card is as tall as its taller face.
	     Both stay in the accessibility tree: a screen reader hears the pitch, then
	     the reality, and the overlay button only drives the visual flip. -->
	<ul class="grid gap-5 md:grid-cols-3">
		{#each DIY.options as o, i (o.name)}
			<li
				class="flip relative grid"
				data-flipped={flipped[i]}
				onpointerenter={(e) => hover(i, e, true)}
				onpointerleave={(e) => hover(i, e, false)}
			>
				<div
					class="face relative flex flex-col gap-4 overflow-hidden rounded-4xl bg-linear-to-br p-6 text-white shadow-[0_24px_50px_-24px_oklch(0_0_0/0.9)] {AD[
						i
					]}"
				>
					<span
						class="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/30 to-transparent"
						aria-hidden="true"
					></span>
					<Sparkles
						class="twinkle absolute top-20 right-6 size-6 text-white/90"
						aria-hidden="true"
					/>
					<Sparkles
						class="twinkle absolute right-16 bottom-20 size-4 text-white/70"
						style="animation-delay: -1.1s"
						aria-hidden="true"
					/>
					<div class="relative flex items-start justify-between gap-3">
						<div class="flex flex-col gap-0.5">
							<h3 class="text-lg font-semibold">{o.name}</h3>
							<p class="text-xs tracking-wide text-white/80">{o.examples}</p>
						</div>
						<span
							class="shrink-0 rotate-6 rounded-full bg-yellow-300 px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-slate-900 uppercase shadow-md"
							aria-hidden="true">{DIY.adBadge}</span
						>
					</div>
					<p
						class="relative pr-6 text-3xl leading-tight font-extrabold tracking-tight text-balance drop-shadow-md"
					>
						{o.pitch}
					</p>
					<div class="relative mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
						<span
							class="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-900 shadow-lg"
							aria-hidden="true">{o.cta}<ArrowRight class="size-4" /></span
						>
						<span class="inline-flex items-center gap-1 text-xs font-medium text-white/85"
							><RotateCcw class="size-3.5" aria-hidden="true" />{DIY.flipHint}</span
						>
					</div>
				</div>

				<div class="face back flex">
					<GlassCard class="w-full gap-4 p-6">
						<div class="flex items-start justify-between gap-3">
							<p class="text-lg font-semibold" aria-hidden="true">{o.name}</p>
							<span
								class="shrink-0 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary"
								>{DIY.realityLabel}</span
							>
						</div>
						<p
							class="text-lg font-semibold text-foreground/40 italic line-through decoration-foreground/30"
							aria-hidden="true"
						>
							{o.pitch}
						</p>
						<p class="text-sm leading-relaxed text-foreground/75">{o.reality}</p>
					</GlassCard>
				</div>

				<button
					type="button"
					class="absolute inset-0 z-10 cursor-pointer rounded-4xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background focus-visible:outline-none"
					aria-pressed={flipped[i]}
					onclick={(e) => flip(i, e)}
				>
					<span class="sr-only">{DIY.realityLabel}: {o.name}</span>
				</button>
			</li>
		{/each}
	</ul>

	<GlassCard class="mx-auto w-full max-w-4xl gap-8 p-5 sm:p-10">
		<div class="flex flex-col items-center gap-4 text-center">
			<h3 class="text-sm font-semibold tracking-[0.14em] text-foreground/50 uppercase">
				{P.heading}
			</h3>
			<button
				type="button"
				role="switch"
				aria-checked={ours}
				aria-label={P.toggleLabel}
				onclick={toggle}
				class="relative grid cursor-pointer grid-cols-2 rounded-full bg-foreground/8 p-1 text-sm font-semibold ring-1 ring-foreground/12 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none sm:text-base"
			>
				{#if !touched}
					<span
						class="nudge pointer-events-none absolute -inset-1 rounded-full ring-2 ring-primary/50"
						aria-hidden="true"
					></span>
				{/if}
				<span
					class="thumb absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full shadow-md {ours
						? 'translate-x-full bg-primary'
						: 'bg-foreground/15'}"
					aria-hidden="true"
				></span>
				<span
					class="relative px-4 py-2 transition-colors sm:px-6 {ours
						? 'text-foreground/50'
						: 'text-foreground'}">{P.diyLabel}</span
				>
				<span
					class="relative px-4 py-2 transition-colors sm:px-6 {ours
						? 'text-white'
						: 'text-foreground/50'}">{P.oursLabel}</span
				>
			</button>
			<p class="text-sm text-foreground/55">{P.prompt}</p>
		</div>

		<div bind:this={plates} class="grid gap-5 sm:grid-cols-2">
			<section aria-labelledby="plate-yours" class="flex flex-col gap-3">
				<div class="flex items-center justify-between gap-3 px-1">
					<h4 id="plate-yours" class="font-semibold">{P.yours}</h4>
					<span
						class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors {ours
							? 'bg-primary/15 text-primary'
							: 'bg-red-400/15 text-red-300'}">{P.count(ours ? 1 : DIY.chores.length)}</span
					>
				</div>
				<div
					class="flex flex-col gap-4 rounded-[1.75rem] bg-foreground/[0.03] p-3 ring-1 ring-foreground/10 sm:min-h-80"
				>
					<ul class="flex flex-col gap-1.5">
						{#each yourChores as chore, i (chore)}
							<li
								data-chore={chore}
								class="flex w-[calc(100%-1.5rem)] items-center gap-2.5 rounded-xl bg-background/80 px-3.5 py-2.5 text-sm text-foreground/80 shadow-[0_10px_24px_-14px_oklch(0_0_0/0.9)] ring-1 ring-red-400/25 {PILE[
									i
								]}"
							>
								<CircleAlert class="size-4 shrink-0 text-red-400/80" aria-hidden="true" />{chore}
							</li>
						{/each}
						{#if ours}
							<li
								in:fly={{ y: 8, delay: still() ? 0 : 450, duration: still() ? 0 : 400 }}
								class="flex items-center gap-2.5 rounded-xl bg-primary/10 px-3.5 py-3 font-medium ring-1 ring-primary/30"
							>
								<span
									class="grid size-6 place-items-center rounded-full bg-primary/20 text-primary"
								>
									<Check class="size-3.5" strokeWidth={3} aria-hidden="true" />
								</span>
								{P.yourJob}
							</li>
						{/if}
					</ul>
					{#if ours}
						<p
							in:fade={{ delay: still() ? 0 : 700, duration: still() ? 0 : 400 }}
							class="px-1 leading-relaxed text-foreground/75"
						>
							{DIY.glove}
						</p>
					{/if}
				</div>
			</section>

			<section aria-labelledby="plate-ours" class="flex flex-col gap-3">
				<div class="flex items-center justify-between gap-3 px-1">
					<h4 id="plate-ours" class="font-semibold text-primary">{P.ours}</h4>
					<span class="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary"
						>{P.count(ourChores.length)}</span
					>
				</div>
				<div
					class="flex min-h-24 flex-col rounded-[1.75rem] bg-primary/[0.04] p-3 ring-1 ring-primary/20 sm:min-h-80"
				>
					{#if !ours}
						<p
							in:fade={{ duration: still() ? 0 : 300 }}
							class="m-auto px-4 text-center text-sm text-foreground/40"
						>
							{P.empty}
						</p>
					{/if}
					<ul class="flex flex-col gap-1.5">
						{#each ourChores as chore (chore)}
							<li
								data-chore={chore}
								class="flex items-center gap-2.5 rounded-xl bg-primary/10 px-3.5 py-2.5 text-sm text-foreground/85 ring-1 ring-primary/25"
							>
								<Check class="size-4 shrink-0 text-primary" aria-hidden="true" />{chore}
							</li>
						{/each}
					</ul>
				</div>
			</section>
		</div>
	</GlassCard>
</div>

<style>
	/* Each face turns on its own instead of sharing a preserve-3d parent: the back
	   face is a GlassCard, and backdrop-filter flattens a preserve-3d context. It
	   also defeats backface-visibility, so the turned-away face drops to opacity 0
	   at the halfway point (opacity, not visibility, so both faces stay readable to
	   screen readers). */
	.flip {
		perspective: 1400px;
	}
	.face {
		grid-area: 1 / 1;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
		transition:
			transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1),
			opacity 0s linear 0.1s;
	}
	.back {
		transform: rotateY(180deg);
		opacity: 0;
	}
	.flip[data-flipped='true'] .face:not(.back) {
		transform: rotateY(-180deg);
		opacity: 0;
	}
	.flip[data-flipped='true'] .back {
		transform: rotateY(0deg);
		opacity: 1;
	}

	.thumb {
		transition:
			translate 0.45s cubic-bezier(0.2, 0.8, 0.2, 1),
			background-color 0.3s ease;
	}

	.nudge {
		animation: nudge 2.4s ease-out infinite;
	}
	@keyframes nudge {
		0% {
			opacity: 0.9;
			scale: 1;
		}
		70%,
		100% {
			opacity: 0;
			scale: 1.12;
		}
	}

	:global(.twinkle) {
		animation: twinkle 2.6s ease-in-out infinite;
	}
	@keyframes twinkle {
		0%,
		100% {
			opacity: 0.35;
			scale: 0.8;
		}
		50% {
			opacity: 1;
			scale: 1.1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.face,
		.back,
		.flip[data-flipped='true'] .face:not(.back),
		.flip[data-flipped='true'] .back {
			transform: none;
			transition: opacity 0.3s ease;
		}
		.back,
		.flip[data-flipped='true'] .face:not(.back) {
			opacity: 0;
		}
		.flip[data-flipped='true'] .back {
			opacity: 1;
		}
		.thumb {
			transition: none;
		}
		.nudge,
		:global(.twinkle) {
			animation: none;
		}
	}
</style>
