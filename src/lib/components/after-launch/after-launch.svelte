<script lang="ts">
	import { ImageIcon, LayoutTemplate, Type } from '@lucide/svelte';
	import { AFTER_LAUNCH } from '$lib/content/websites.js';

	// "Live doesn't mean done": the loop keeps running after launch. Three
	// treatments under review; the page uses one, /websites/after-launch shows all.
	let { variant = 'a' }: { variant?: 'a' | 'b' | 'c' } = $props();

	const ICONS = [ImageIcon, Type, LayoutTemplate];
</script>

{#if variant === 'a'}
	<div class="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
		<div class="flex flex-col gap-4">
			<h3 class="text-3xl font-bold tracking-tight">{AFTER_LAUNCH.title}</h3>
			<p class="text-lg leading-relaxed text-foreground/65">{AFTER_LAUNCH.body}</p>
		</div>
		<div>
			<p class="pb-4 text-sm font-semibold tracking-[0.14em] text-foreground/50 uppercase">
				After launch, for example
			</p>
			<ol class="relative flex flex-col gap-6 border-l border-dashed border-primary/40 pl-7">
				{#each AFTER_LAUNCH.requests as req (req)}
					<li class="relative">
						<span
							class="absolute top-1.5 -left-[33px] size-3 rounded-full bg-primary ring-4 ring-background"
						></span>
						<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
							<span class="text-lg">“{req}”</span>
							<span
								class="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary"
								>Live same day</span
							>
						</div>
					</li>
				{/each}
			</ol>
		</div>
	</div>
{:else if variant === 'b'}
	<div class="mx-auto flex max-w-4xl flex-col items-center text-center">
		<h3 class="text-4xl font-bold tracking-tight sm:text-5xl">{AFTER_LAUNCH.title}</h3>
		<p class="max-w-2xl pt-5 text-lg leading-relaxed text-balance text-foreground/65">
			{AFTER_LAUNCH.body}
		</p>
		<ul
			class="mt-10 grid w-full divide-y divide-foreground/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
		>
			{#each AFTER_LAUNCH.examples as ex, i (ex)}
				{@const Icon = ICONS[i]}
				<li class="flex flex-col items-center gap-3 px-6 py-5">
					<Icon class="size-7 text-primary" aria-hidden="true" />
					<span class="font-medium">{ex}</span>
				</li>
			{/each}
		</ul>
		<p class="pt-6 text-sm font-medium text-primary">Same day. Often within the hour.</p>
	</div>
{:else}
	<div class="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
		<div class="flex flex-col gap-4">
			<h3 class="text-3xl font-bold tracking-tight">{AFTER_LAUNCH.title}</h3>
			<p class="text-lg leading-relaxed text-foreground/65">{AFTER_LAUNCH.body}</p>
			<ul class="flex flex-wrap gap-2 pt-2">
				{#each AFTER_LAUNCH.examples as ex (ex)}
					<li
						class="rounded-full border border-foreground/12 px-3.5 py-1.5 text-sm text-foreground/75"
					>
						{ex}
					</li>
				{/each}
			</ul>
		</div>
		<!-- A skeleton site whose photo, heading font and middle section swap on a
		     loop; purely decorative. -->
		<div
			class="mockup relative mx-auto w-full max-w-md overflow-hidden rounded-xl border border-foreground/10 bg-[oklch(0.21_0.015_285)] shadow-[0_24px_60px_-30px_oklch(0_0_0/0.8)]"
			aria-hidden="true"
		>
			<div class="flex items-center gap-1.5 border-b border-foreground/8 px-3 py-2">
				<span class="size-2 rounded-full bg-foreground/15"></span>
				<span class="size-2 rounded-full bg-foreground/15"></span>
				<span class="size-2 rounded-full bg-foreground/15"></span>
				<span
					class="updated ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary"
					>Updated today</span
				>
			</div>
			<div class="flex flex-col gap-3 bg-[#fdf6f8] p-4">
				<div class="photo relative h-24 overflow-hidden rounded-md">
					<span class="photo-a absolute inset-0 bg-linear-to-br from-[#f3b6c8] to-[#c98fe0]"></span>
					<span class="photo-b absolute inset-0 bg-linear-to-br from-[#8fd3e0] to-[#7f9cf5]"></span>
				</div>
				<div class="relative h-7">
					<span class="font-a absolute inset-0 font-sans text-xl font-bold text-[#2b1d27]"
						>Your Business</span
					>
					<span class="font-b absolute inset-0 font-serif text-xl text-[#2b1d27] italic"
						>Your Business</span
					>
				</div>
				<div class="h-2 w-3/4 rounded bg-[#2b1d27]/15"></div>
				<div class="h-2 w-1/2 rounded bg-[#2b1d27]/15"></div>
				<div class="relative h-14">
					<div class="section-a absolute inset-0 grid grid-cols-3 gap-2">
						<span class="rounded bg-[#2b1d27]/10"></span>
						<span class="rounded bg-[#2b1d27]/10"></span>
						<span class="rounded bg-[#2b1d27]/10"></span>
					</div>
					<div class="section-b absolute inset-0 grid grid-cols-2 gap-2">
						<span class="rounded bg-[#c2185b]/20"></span>
						<span class="rounded bg-[#2b1d27]/10"></span>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Variant c: each pair crossfades on the same 9s cycle, staggered so the
	   photo, then the font, then the section change, like a run of requests. */
	.photo-b,
	.font-b,
	.section-b {
		opacity: 0;
		animation: swap 9s ease-in-out infinite;
	}
	.photo-a,
	.font-a,
	.section-a {
		animation: swap-out 9s ease-in-out infinite;
	}
	.font-a,
	.font-b {
		animation-delay: 1.5s;
	}
	.section-a,
	.section-b {
		animation-delay: 3s;
	}
	.updated {
		animation: blink 9s ease-in-out infinite;
	}
	@keyframes swap {
		0%,
		20% {
			opacity: 0;
		}
		30%,
		70% {
			opacity: 1;
		}
		80%,
		100% {
			opacity: 0;
		}
	}
	@keyframes swap-out {
		0%,
		20% {
			opacity: 1;
		}
		30%,
		70% {
			opacity: 0;
		}
		80%,
		100% {
			opacity: 1;
		}
	}
	@keyframes blink {
		0%,
		25% {
			opacity: 0.35;
		}
		32%,
		70% {
			opacity: 1;
		}
		80%,
		100% {
			opacity: 0.35;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.photo-a,
		.photo-b,
		.font-a,
		.font-b,
		.section-a,
		.section-b,
		.updated {
			animation: none;
		}
	}
</style>
