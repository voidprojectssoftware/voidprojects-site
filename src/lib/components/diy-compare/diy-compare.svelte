<script lang="ts">
	import { Check, X } from '@lucide/svelte';
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';
	import { DIY } from '$lib/content/websites.js';
</script>

<div class="flex w-full flex-col gap-12">
	<div class="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
		<h2 class="flex flex-col gap-1 text-3xl font-bold tracking-tight sm:text-4xl">
			<span>{DIY.title}</span>
			<span class="text-primary">{DIY.accent}</span>
		</h2>
		<p class="text-lg leading-relaxed text-balance text-foreground/65">{DIY.body}</p>
	</div>

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

	<GlassCard class="mx-auto w-full max-w-3xl gap-6 p-6 sm:p-10">
		<div class="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-3 sm:gap-x-8">
			<h3 class="text-sm font-semibold tracking-[0.14em] text-foreground/50 uppercase">
				Who does the work?
			</h3>
			<span class="text-center text-xs font-semibold text-foreground/50">DIY builder</span>
			<span class="text-center text-xs font-semibold text-primary">Void Projects</span>
			{#each DIY.chores as chore (chore)}
				<span class="border-t border-foreground/8 pt-3 text-foreground/80">{chore}</span>
				<span
					class="flex items-center justify-center gap-1.5 border-t border-foreground/8 pt-3 text-sm text-foreground/55"
					><X class="size-4 text-red-400/80" aria-hidden="true" />You</span
				>
				<span
					class="flex items-center justify-center gap-1.5 border-t border-foreground/8 pt-3 text-sm font-medium text-primary"
					><Check class="size-4" aria-hidden="true" />Us</span
				>
			{/each}
		</div>
		<p
			class="rounded-2xl bg-primary/10 p-5 leading-relaxed text-foreground/80 ring-1 ring-primary/25"
		>
			{DIY.glove}
		</p>
	</GlassCard>
</div>
