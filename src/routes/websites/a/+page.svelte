<script lang="ts">
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import { Section } from '$lib/components/voidprojects/section/index.js';
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';
	import { BrowserFrame } from '$lib/components/browser-frame/index.js';
	import { ContactForm } from '$lib/components/contact-form/index.js';
	import { SHOWCASE, PRINCIPLES } from '$lib/content/websites.js';
</script>

<svelte:head>
	<title>Websites by Void Projects</title>
	<meta
		name="description"
		content="Websites built by people, sped up by AI. Openly billed at cost plus 30%, $0 for our work, and free for causes."
	/>
</svelte:head>

<SiteHeader />

<Section class="items-center pt-16 pb-20 text-center sm:pt-24">
	<p class="text-sm font-semibold tracking-[0.18em] text-primary uppercase">Void Projects</p>
	<h1 class="max-w-3xl pt-4 text-4xl font-bold tracking-tight text-balance sm:text-6xl">
		Websites made by people, built faster with AI.
	</h1>
	<p class="max-w-2xl pt-6 text-lg text-balance text-foreground/65">
		You pay what it costs us plus 30%. Our work is free. Sites for a cause are free entirely.
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
						src={site.desktop}
						host={site.host}
						alt="The {site.name} homepage"
						eager={i === 0}
					/>
					<div class="flex flex-col gap-2 px-1 pb-1">
						<div class="flex items-center gap-3">
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
