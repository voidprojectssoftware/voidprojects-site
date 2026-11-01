<script lang="ts">
	import { Check, HandHeart } from '@lucide/svelte';
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import { Section } from '$lib/components/voidprojects/section/index.js';
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';
	import { BrowserFrame } from '$lib/components/browser-frame/index.js';
	import { ContactForm } from '$lib/components/contact-form/index.js';
	import { CAUSE_ICONS } from '$lib/content/cause-icons.js';
	import { CAUSES, SHOWCASE } from '$lib/content/websites.js';
	import { JsonLd } from '$lib/components/json-ld/index.js';
	import { PageMeta } from '$lib/components/page-meta/index.js';
	import { causesJsonLd, PAGES } from '$lib/seo/site.js';

	const rally = SHOWCASE.find((s) => s.free)!;
	const link = 'font-medium text-primary underline-offset-4 hover:underline';

	let contactSent = $state(false);
</script>

<svelte:head>
	<PageMeta meta={PAGES.causes} />
	<JsonLd data={causesJsonLd()} />
</svelte:head>

<SiteHeader />

<main id="main-content" class="flex flex-col">
	<Section wide class="items-center pt-20 pb-24 text-center sm:pt-28">
		<span class="grid size-14 place-items-center rounded-2xl bg-primary/20 text-primary">
			<HandHeart class="size-7" aria-hidden="true" />
		</span>
		<h1 class="max-w-3xl pt-6 text-4xl font-bold tracking-tight text-balance sm:text-6xl">
			Websites for causes, free when we can.
		</h1>
		<p class="max-w-2xl pt-6 text-lg leading-relaxed text-balance text-foreground/70 sm:text-xl">
			If your site exists to help people, remember someone, or rally a community, we’ll do our best
			to
			<a href="/websites" class={link}>build it for you</a> at no cost.
		</p>
		<a
			href="#contact"
			class="mt-10 inline-flex h-11 items-center rounded-full bg-primary-strong px-6 text-sm font-semibold text-white hover:bg-primary-strong/85"
			>Tell us about your cause</a
		>
	</Section>

	<Section wide class="pb-24">
		<div class="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:gap-16">
			<div class="flex flex-col gap-4">
				<p class="text-sm font-semibold tracking-[0.14em] text-primary uppercase">
					Where this started
				</p>
				<h2 class="text-3xl font-bold tracking-tight sm:text-4xl">{rally.name}</h2>
				<p class="text-lg leading-relaxed text-foreground/70">
					Hallie is the mother of one of our own. We <a href="/websites" class={link}
						>built her a site</a
					> so family and friends could follow her journey through breast cancer, never miss an update,
					and help fund her care.
				</p>
				<p class="leading-relaxed text-foreground/65">
					We built it free, and we want to do the same for others.
				</p>
				<a
					href={rally.url}
					target="_blank"
					rel="noopener"
					class="pt-1 text-sm font-medium text-foreground/80 hover:text-primary"
					>Visit {rally.host} ↗</a
				>
				<a href="/websites" class="text-sm {link}">Website by Void Projects</a>
			</div>
			<a href={rally.url} target="_blank" rel="noopener" class="block">
				<BrowserFrame
					src={rally.screenshot}
					host={rally.host}
					alt="The {rally.name} homepage"
					eager
				/>
			</a>
		</div>
	</Section>

	<Section wide class="pb-24">
		<div class="mx-auto flex max-w-2xl flex-col items-center gap-3 pb-10 text-center">
			<h2 class="text-3xl font-bold tracking-tight">Causes we’d love to help</h2>
		</div>
		<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each CAUSES.kinds as k (k.title)}
				{@const CauseIcon = CAUSE_ICONS[k.title]}
				<GlassCard class="gap-3 p-6">
					<span class="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
						<CauseIcon class="size-5" aria-hidden="true" />
					</span>
					<h3 class="pt-1 text-lg font-semibold">{k.title}</h3>
					<p class="text-sm leading-relaxed text-foreground/65">{k.body}</p>
				</GlassCard>
			{/each}
		</div>
		<p class="pt-8 text-center text-lg text-foreground/70">
			If yours isn’t here, <a href="#contact" class={link}>ask anyway</a>.
		</p>
	</Section>

	<Section wide class="items-center pb-24">
		<GlassCard class="w-full max-w-3xl gap-6 p-6 sm:p-10">
			<h2 class="text-3xl font-bold tracking-tight">What you can count on</h2>
			<ul class="flex flex-col gap-4">
				{#each CAUSES.promise as line (line)}
					<li class="flex items-start gap-3">
						<span
							class="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/20 text-primary"
							><Check class="size-3.5" aria-hidden="true" /></span
						>
						<span class="text-lg leading-relaxed text-foreground/80">{line}</span>
					</li>
				{/each}
			</ul>
		</GlassCard>
	</Section>

	<Section wide class="items-center pb-28">
		<div id="contact" class="w-full max-w-2xl scroll-mt-24">
			<GlassCard class="gap-6 p-6 sm:p-10">
				{#if !contactSent}
					<div class="flex flex-col gap-2">
						<h2 class="text-3xl font-bold tracking-tight">Tell us about your cause</h2>
						<p class="text-foreground/65">
							Who it’s for and what it needs to do. A person reads every message and writes back.
						</p>
					</div>
				{/if}
				<ContactForm bind:sent={contactSent} initialKind="A cause" />
			</GlassCard>
			<p class="pt-6 text-center text-sm">
				<a href="/websites" class={link}>Website by Void Projects</a>
			</p>
		</div>
	</Section>
</main>
