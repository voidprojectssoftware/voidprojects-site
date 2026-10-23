<script lang="ts">
	import { Bot, Check, MessagesSquare, X, Zap } from '@lucide/svelte';
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import OrbitMark from '$lib/brand/OrbitMark.svelte';
	import { Section } from '$lib/components/voidprojects/section/index.js';
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';
	import { BrowserFrame } from '$lib/components/browser-frame/index.js';
	import { ContactForm } from '$lib/components/contact-form/index.js';
	import { ProcessFlow } from '$lib/components/process-flow/index.js';
	import { SHOWCASE, PRICING, NEVER, HOW } from '$lib/content/websites.js';

	const HOW_ICONS = [Bot, Zap, MessagesSquare];
</script>

<svelte:head>
	<title>Websites by Void Projects</title>
	<meta
		name="description"
		content="Custom websites from engineers with years of enterprise experience, sped up by our own AI tooling. You talk to a person, never touch the technical side, and pay our costs plus 30%."
	/>
</svelte:head>

<SiteHeader wide />

<!-- Order follows the visitor's questions: what is it, what's it like for me, how
     does it run, what does it cost, how is that possible, show me, let's talk. -->

<Section wide class="items-center pt-16 pb-20 text-center sm:pt-24">
	<OrbitMark size={64} />
	<h1 class="max-w-4xl pt-4 text-4xl font-bold tracking-tight text-balance sm:text-6xl">
		The website you need, without the price tag or the headache.
	</h1>
	<p class="pt-6 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
		Free if we can. Fair if we can’t.
	</p>
	<div class="flex flex-wrap justify-center gap-3 pt-10">
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

<Section wide class="pb-24">
	<GlassCard class="grid gap-8 p-6 sm:p-10 md:grid-cols-2 md:items-center md:gap-12">
		<div class="flex flex-col gap-4">
			<h2 class="text-3xl font-bold tracking-tight text-balance">
				You bring the vision. We handle everything else.
			</h2>
			<p class="leading-relaxed text-foreground/65">
				Tell a person on our team what you need, in your own words. We take it from there and build
				it with you, one conversation at a time. AI speeds up the build; it never replaces the
				conversation.
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

<Section wide class="pb-24">
	<div class="mx-auto flex max-w-2xl flex-col items-center gap-3 pb-10 text-center">
		<h2 class="text-3xl font-bold tracking-tight">How we work</h2>
		<p class="text-lg leading-relaxed text-balance text-foreground/65">
			You see your site at every step, and every round of your feedback shapes the next one.
		</p>
	</div>
	<ProcessFlow />
</Section>

<Section wide class="pb-24">
	<GlassCard class="grid gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_1.4fr] lg:items-center lg:gap-16">
		<div class="flex flex-col gap-4">
			<h2 class="text-3xl font-bold tracking-tight">What it costs</h2>
			<p class="text-2xl font-semibold tracking-tight text-primary">
				Free if we can. Fair if we can’t.
			</p>
			<p class="leading-relaxed text-foreground/65">
				If we can build your site for free, we will. If we can’t, you pay what it costs us, plus a
				flat margin, and nothing for our time.
			</p>
		</div>
		<dl class="flex flex-col divide-y divide-foreground/10">
			{#each PRICING as row (row.figure)}
				<div
					class="flex flex-col gap-1 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-6"
				>
					<dt class="w-28 shrink-0 text-4xl font-bold tracking-tight text-primary">{row.figure}</dt>
					<dd class="leading-relaxed text-foreground/70">{row.body}</dd>
				</div>
			{/each}
		</dl>
	</GlassCard>
</Section>

<Section wide class="items-center pb-24">
	<div class="flex max-w-3xl flex-col items-center gap-6 pb-12 text-center">
		<h2 class="flex flex-col gap-2 font-bold tracking-tight">
			<span class="text-2xl text-foreground/55 sm:text-3xl">Sounds too good to be true?</span>
			<span
				class="bg-linear-to-r from-primary via-[oklch(0.78_0.14_330)] to-primary bg-clip-text pb-1 text-5xl text-transparent sm:text-7xl"
				>Here’s how we do it.</span
			>
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

<Section wide class="pb-24">
	<div
		id="work"
		class="mx-auto flex max-w-2xl scroll-mt-24 flex-col items-center gap-3 pb-10 text-center"
	>
		<h2 class="text-3xl font-bold tracking-tight">Our work</h2>
		<p class="text-lg leading-relaxed text-balance text-foreground/65">
			Sites we’ve built, live today.
		</p>
	</div>
	<div class="grid gap-8 lg:grid-cols-2">
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
							<h3 class="text-xl font-semibold">{site.name}</h3>
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

<Section wide class="items-center pb-28">
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
