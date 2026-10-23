<script lang="ts">
	import { Bot, Check, MessagesSquare, X, Zap } from '@lucide/svelte';
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import { Section } from '$lib/components/voidprojects/section/index.js';
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';
	import { BrowserFrame } from '$lib/components/browser-frame/index.js';
	import { ContactForm } from '$lib/components/contact-form/index.js';
	import { SHOWCASE, PRINCIPLES, NEVER, HOW, MARGIN_PERCENT } from '$lib/content/websites.js';

	const HOW_ICONS = [Bot, Zap, MessagesSquare];
</script>

<svelte:head>
	<title>Websites by Void Projects</title>
	<meta
		name="description"
		content="Custom websites from engineers with years of enterprise experience, sped up by our own AI tooling. You talk to a person, never touch the technical side, and pay our costs plus 30%."
	/>
</svelte:head>

<SiteHeader />

<Section class="items-center pt-16 pb-20 text-center sm:pt-24">
	<p class="text-sm font-semibold tracking-[0.18em] text-primary uppercase">Void Projects</p>
	<h1 class="max-w-3xl pt-4 text-4xl font-bold tracking-tight text-balance sm:text-6xl">
		Websites made by people, built faster with AI.
	</h1>
	<p class="max-w-2xl pt-6 text-lg text-balance text-foreground/65">
		Years of enterprise software experience, multiplied by AI tooling we built ourselves. You pay
		what your site costs us plus {MARGIN_PERCENT}%, and nothing for our time.
	</p>
	<div class="flex flex-wrap justify-center gap-3 pt-9">
		<a
			href="#contact"
			class="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-white hover:bg-primary/85"
			>Get a website</a
		>
		<a
			href="#work"
			class="inline-flex h-11 items-center rounded-full border border-foreground/15 px-6 text-sm font-semibold hover:bg-foreground/5"
			>See our work</a
		>
	</div>
</Section>

<Section class="pb-24">
	<div id="work" class="grid scroll-mt-24 gap-8 lg:grid-cols-2">
		{#each SHOWCASE as site, i (site.url)}
			<a href={site.url} target="_blank" rel="noopener" class="group block">
				<GlassCard class="h-full gap-5 p-4 sm:p-5">
					<BrowserFrame
						src={site.screenshot}
						host={site.host}
						alt="The {site.name} homepage"
						eager={i === 0}
					/>
					<div class="flex flex-col gap-2 px-1 pb-1">
						<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
							<h2 class="text-xl font-semibold">{site.name}</h2>
							<span
								class="rounded-full bg-foreground/8 px-2.5 py-0.5 text-xs font-medium text-foreground/65"
								>{site.kind}</span
							>
							{#if site.free}
								<span
									class="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary"
									>Built free</span
								>
							{/if}
						</div>
						<p class="text-sm leading-relaxed text-foreground/65">{site.blurb}</p>
						<span class="pt-1 text-sm font-medium text-foreground/80 group-hover:text-primary"
							>Visit {site.host} ↗</span
						>
					</div>
				</GlassCard>
			</a>
		{/each}
	</div>
</Section>

<Section class="pb-24">
	<GlassCard class="grid gap-8 p-6 sm:p-10 md:grid-cols-2 md:items-center md:gap-12">
		<div class="flex flex-col gap-4">
			<h2 class="text-3xl font-bold tracking-tight text-balance">
				You bring the vision. We handle everything else.
			</h2>
			<p class="leading-relaxed text-foreground/65">
				Tell a person on our team what you need, in your own words. We take it from there and build
				it with you, one conversation at a time.
			</p>
		</div>
		<div class="flex flex-col gap-4">
			<p class="text-sm font-semibold tracking-[0.14em] text-foreground/50 uppercase">
				You’ll never have to
			</p>
			<ul class="flex flex-col gap-3">
				{#each NEVER as item (item)}
					<li class="flex items-start gap-3">
						<span
							class="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-foreground/8 text-foreground/45"
							><X class="size-3.5" aria-hidden="true" /></span
						>
						<span class="text-foreground/55 line-through decoration-foreground/30">{item}</span>
					</li>
				{/each}
				<li class="flex items-start gap-3">
					<span
						class="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/20 text-primary"
						><Check class="size-3.5" aria-hidden="true" /></span
					>
					<span class="font-medium">Just talk with us about what you need</span>
				</li>
			</ul>
		</div>
	</GlassCard>
</Section>

<Section class="pb-24">
	<h2 class="pb-8 text-center text-3xl font-bold tracking-tight">How we work</h2>
	<div class="grid gap-5 md:grid-cols-3">
		{#each PRINCIPLES as p, i (p.title)}
			<GlassCard class="gap-3 p-6">
				<span class="text-sm font-semibold text-primary">0{i + 1}</span>
				<h3 class="text-lg font-semibold">{p.title}</h3>
				<p class="text-sm leading-relaxed text-foreground/65">{p.body}</p>
			</GlassCard>
		{/each}
	</div>
</Section>

<Section class="items-center pb-24">
	<div class="flex max-w-2xl flex-col items-center gap-4 pb-10 text-center">
		<h2 class="text-3xl font-bold tracking-tight text-balance">
			Sounds too good to be true? Here’s how we do it.
		</h2>
		<p class="text-lg leading-relaxed text-balance text-foreground/65">
			Everyone on the Void Projects team has years of enterprise application development behind
			them. We didn’t replace that experience with AI. We built tools that multiply it, to make
			custom websites financially feasible again.
		</p>
	</div>
	<div class="grid w-full gap-5 md:grid-cols-3">
		{#each HOW as h, i (h.title)}
			{@const Icon = HOW_ICONS[i]}
			<GlassCard class="gap-3 p-6">
				<span class="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
					<Icon class="size-5" aria-hidden="true" />
				</span>
				<h3 class="pt-1 text-lg font-semibold">{h.title}</h3>
				<p class="text-sm leading-relaxed text-foreground/65">{h.body}</p>
			</GlassCard>
		{/each}
	</div>
</Section>

<Section class="items-center pb-28">
	<div id="contact" class="w-full max-w-2xl scroll-mt-24">
		<GlassCard class="gap-6 p-6 sm:p-10">
			<div class="flex flex-col gap-2">
				<h2 class="text-3xl font-bold tracking-tight">Let’s build yours</h2>
				<p class="text-foreground/65">
					Tell us what you need. A person reads every message and writes back.
				</p>
			</div>
			<ContactForm />
		</GlassCard>
	</div>
</Section>
