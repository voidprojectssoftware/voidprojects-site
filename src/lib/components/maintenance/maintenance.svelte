<script lang="ts">
	import { ShieldCheck } from '@lucide/svelte';
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';
	import { MAINTENANCE } from '$lib/content/websites.js';

	const { counts, exposures } = MAINTENANCE;
	const max = Math.max(...counts.years.map((y) => y.count));
	const fmt = (n: number) => n.toLocaleString('en-US');
	const linkClass = 'font-medium text-primary underline-offset-4 hover:underline';
</script>

<div class="flex flex-col gap-12">
	<div class="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:gap-16">
		<div class="flex flex-col gap-4">
			<span class="grid size-12 place-items-center rounded-2xl bg-primary/20 text-primary">
				<ShieldCheck class="size-6" aria-hidden="true" />
			</span>
			<h2 class="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
				{MAINTENANCE.title}
			</h2>
			{#each MAINTENANCE.body as para, i (para)}
				<p
					class={i === 0
						? 'text-lg leading-relaxed text-foreground/70'
						: 'leading-relaxed text-foreground/65'}
				>
					{para}
				</p>
			{/each}
		</div>
		<GlassCard class="p-6 sm:p-8">
			<figure class="flex flex-col gap-5">
				<figcaption class="flex flex-col gap-1">
					<span class="text-sm font-semibold tracking-[0.14em] text-primary uppercase"
						>{counts.title}</span
					>
					<span class="text-xs text-foreground/50"
						>Source: <a href={counts.source.href} class={linkClass} target="_blank" rel="noopener"
							>{counts.source.label}</a
						></span
					>
				</figcaption>
				<ol class="flex flex-col gap-2">
					{#each counts.years as y (y.year)}
						<li class="grid grid-cols-[2.75rem_1fr_3.75rem] items-center gap-3 text-sm">
							<span class="text-foreground/60 tabular-nums">{y.year}</span>
							<span class="h-2.5 rounded-full bg-foreground/8" aria-hidden="true">
								<span
									class="block h-full rounded-full bg-primary/70"
									style:width="{(y.count / max) * 100}%"
								></span>
							</span>
							<span class="text-right font-semibold tabular-nums">{fmt(y.count)}</span>
						</li>
					{/each}
				</ol>
				<p class="text-sm text-foreground/65">{counts.note}</p>
			</figure>
		</GlassCard>
	</div>

	<div class="flex flex-col gap-6">
		<div class="flex flex-col gap-2">
			<h3 class="text-xl font-semibold">{exposures.title}</h3>
			<p class="leading-relaxed text-foreground/65">{exposures.intro}</p>
		</div>
		<ul class="grid gap-5 md:grid-cols-3">
			{#each exposures.items as item (item.links[0].href)}
				<li class="flex">
					<GlassCard class="w-full gap-3 p-6">
						<p class="text-xs font-medium tracking-wide text-foreground/50">{item.when}</p>
						<h4 class="text-lg font-semibold">{item.what}</h4>
						<p class="text-sm leading-relaxed text-foreground/65">{item.body}</p>
						<p class="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm">
							{#each item.links as link (link.href)}
								<a href={link.href} class={linkClass} target="_blank" rel="noopener">{link.label}</a
								>
							{/each}
						</p>
					</GlassCard>
				</li>
			{/each}
		</ul>
		<p class="text-xs text-foreground/50">
			“Exploited” means listed in the <a
				href={exposures.source.href}
				class={linkClass}
				target="_blank"
				rel="noopener">{exposures.source.label}</a
			> catalog.
		</p>
	</div>
</div>
