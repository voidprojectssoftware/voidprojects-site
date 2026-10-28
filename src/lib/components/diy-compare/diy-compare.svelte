<script lang="ts">
	import { tick } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade, fly } from 'svelte/transition';
	import { Check, CircleAlert } from '@lucide/svelte';
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';
	import { DIY } from '$lib/content/websites.js';

	const P = DIY.plates;
	const PILE = [
		'-rotate-2 ml-1',
		'rotate-[1.5deg] ml-5',
		'-rotate-1 ml-0',
		'rotate-2 ml-4',
		'-rotate-[2.5deg] ml-2',
		'rotate-1 ml-6'
	]; // parallel to DIY.chores

	let ours = $state(false);
	let plates: HTMLElement;

	const yourChores = $derived(ours ? [] : DIY.chores);
	const ourChores = $derived(ours ? DIY.chores : []);
	const still = () => prefersReducedMotion.current;

	// Each chore is a fresh node in whichever list now holds it, so the move is a
	// manual FLIP: measure every chore, swap lists, then play each new node from
	// its old spot. No outros means the layout settles before measuring, which
	// keeps the motion right when the plates stack on narrow screens.
	async function handOver() {
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
		ours = true;
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

	// Plays once when the plates are mostly on screen; the pause lets the messy
	// pile register before the chores leave it.
	$effect(() => {
		let timer: ReturnType<typeof setTimeout>;
		const io = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				io.disconnect();
				timer = setTimeout(handOver, still() ? 0 : 900);
			},
			{ threshold: 0.6 }
		);
		io.observe(plates);
		return () => {
			io.disconnect();
			clearTimeout(timer);
		};
	});
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
	<div class="grid gap-5 md:grid-cols-3">
		{#each DIY.options as o (o.name)}
			<GlassCard class="gap-4 p-6">
				<div class="flex flex-col gap-1">
					<h3 class="text-lg font-semibold">{o.name}</h3>
					<p class="text-xs tracking-wide text-foreground/45">{o.examples}</p>
				</div>
				<p
					class="text-xl font-semibold text-foreground/40 italic line-through decoration-foreground/30"
				>
					{o.pitch}
				</p>
				<p class="text-sm leading-relaxed text-foreground/70">{o.reality}</p>
			</GlassCard>
		{/each}
	</div>

	<GlassCard class="mx-auto w-full max-w-4xl gap-8 p-5 sm:p-10">
		<div class="flex flex-col items-center gap-4 text-center">
			<h3 class="text-sm font-semibold tracking-[0.14em] text-foreground/50 uppercase">
				{P.heading}
			</h3>
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
