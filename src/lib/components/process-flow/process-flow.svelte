<script lang="ts">
	import {
		ArrowDown,
		ArrowRight,
		Bot,
		Eye,
		MessagesSquare,
		MessageCircle,
		RefreshCw,
		Rocket
	} from '@lucide/svelte';
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';
	import { AFTER_LAUNCH, FLOW } from '$lib/content/websites.js';

	// The loop (build, see, tell us) runs as a row from md up, with its return arrow
	// drawn as a U-shaped border under its first and last nodes. The outer steps
	// ("We talk" in, "It goes live" out) only join that row on 2xl screens, where
	// all five fit; below that they stack above and below the loop.
	const LOOP_ICONS = [Bot, Eye, MessageCircle];
</script>

{#snippet node(Icon: typeof Bot, title: string, body: string)}
	<GlassCard class="h-full gap-2 p-5">
		<span class="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
			<Icon class="size-[18px]" aria-hidden="true" />
		</span>
		<h3 class="pt-1 font-semibold">{title}</h3>
		<p class="text-sm leading-relaxed text-foreground/65">{body}</p>
	</GlassCard>
{/snippet}

{#snippet arrow(inner: boolean)}
	<div class="flex shrink-0 items-center justify-center text-foreground/35" aria-hidden="true">
		{#if inner}
			<ArrowRight class="hidden size-5 md:block" />
			<ArrowDown class="size-5 md:hidden" />
		{:else}
			<ArrowRight class="hidden size-5 2xl:block" />
			<ArrowDown class="size-5 2xl:hidden" />
		{/if}
	</div>
{/snippet}

<ol
	class="flex flex-col items-center gap-3 2xl:flex-row 2xl:items-center"
	aria-label="How a project runs"
>
	<li class="w-full max-w-md 2xl:w-52 2xl:shrink-0">
		{@render node(MessagesSquare, FLOW.start.title, FLOW.start.body)}
	</li>
	<li class="contents" aria-hidden="true">{@render arrow(false)}</li>

	<li
		class="w-full rounded-3xl border border-dashed border-primary/40 bg-primary/[0.04] p-3 sm:p-4 2xl:flex-1"
	>
		<div class="relative md:pb-16">
			<ol
				class="flex flex-col gap-3 md:flex-row md:items-stretch"
				aria-label="Repeats until you're happy"
			>
				{#each FLOW.loop as step, i (step.title)}
					{#if i > 0}<li class="contents" aria-hidden="true">{@render arrow(true)}</li>{/if}
					<li class="md:flex-1">{@render node(LOOP_ICONS[i], step.title, step.body)}</li>
				{/each}
			</ol>
			<!-- Return arrow: spans the centers of the first and last of the three equal
			     columns (arrows between them are narrow, so ~1/6 from each edge). -->
			<div
				class="pointer-events-none absolute right-[16%] bottom-5 left-[16%] hidden h-9 rounded-b-3xl border-2 border-t-0 border-dashed border-primary/60 md:block"
				aria-hidden="true"
			>
				<span
					class="absolute -top-2 -left-[7px] size-3 rotate-45 border-t-2 border-l-2 border-primary/80"
				></span>
			</div>
		</div>
		<p
			class="flex items-center justify-center gap-2 pt-3 text-center text-sm font-medium text-primary md:-mt-12 md:pt-0"
		>
			<RefreshCw class="size-4 shrink-0" aria-hidden="true" />
			<span class="rounded-full bg-background/80 px-2 md:px-3">{FLOW.loopLabel}</span>
		</p>
	</li>

	<li class="contents" aria-hidden="true">{@render arrow(false)}</li>
	<li class="w-full max-w-md 2xl:w-52 2xl:shrink-0">
		{@render node(Rocket, FLOW.end.title, FLOW.end.body)}
	</li>
</ol>

<div
	class="mt-6 flex flex-col gap-5 rounded-3xl border border-dashed border-primary/40 bg-primary/[0.04] p-6 sm:p-8 lg:flex-row lg:items-center lg:gap-10"
>
	<span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
		<RefreshCw class="size-6" aria-hidden="true" />
	</span>
	<div class="flex flex-1 flex-col gap-2">
		<h3 class="text-xl font-semibold">{AFTER_LAUNCH.title}</h3>
		<p class="leading-relaxed text-foreground/65">{AFTER_LAUNCH.body}</p>
	</div>
	<ul class="flex flex-wrap gap-2 lg:max-w-xs lg:justify-end">
		{#each AFTER_LAUNCH.examples as ex (ex)}
			<li class="rounded-full border border-primary/30 bg-background/60 px-3.5 py-1.5 text-sm">
				{ex}
			</li>
		{/each}
	</ul>
</div>
