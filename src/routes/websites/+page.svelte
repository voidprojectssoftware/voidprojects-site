<script lang="ts">
	import { ArrowRight, Bot, HandHeart, MessagesSquare, Zap } from '@lucide/svelte';
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import OrbitMark from '$lib/brand/OrbitMark.svelte';
	import { Section } from '$lib/components/voidprojects/section/index.js';
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';
	import { BrowserFrame } from '$lib/components/browser-frame/index.js';
	import { ContactForm } from '$lib/components/contact-form/index.js';
	import { ProcessFlow } from '$lib/components/process-flow/index.js';
	import { Splash } from '$lib/components/splash/index.js';
	import { AfterLaunch } from '$lib/components/after-launch/index.js';
	import { NeverGrid } from '$lib/components/never-grid/index.js';
	import { ProfileCard } from '$lib/components/profile-card/index.js';
	import { headshots } from '$lib/assets/headshots.js';
	import {
		SHOWCASE,
		PRICING,
		HOW,
		SPLASHES,
		CAUSES,
		INSTEAD,
		ENGINEER
	} from '$lib/content/websites.js';
	import { CAUSE_ICONS } from '$lib/content/cause-icons.js';
	import { JsonLd } from '$lib/components/json-ld/index.js';
	import { PageMeta } from '$lib/components/page-meta/index.js';
	import { PAGES, websitesJsonLd } from '$lib/seo/site.js';

	const HOW_ICONS = [Bot, Zap, MessagesSquare];

	let contactSent = $state(false);
</script>

<svelte:head>
	<PageMeta meta={PAGES.websites} />
	<JsonLd data={websitesJsonLd()} />
</svelte:head>

<SiteHeader />

<!-- Order follows the visitor's questions: what is it, what's it like for me, how
     does it run, what does it cost (and is it free for causes), how is that possible, show me, let's talk. -->

<Section
	wide
	class="relative isolate items-center overflow-x-clip pt-24 pb-24 text-center sm:pt-36 sm:pb-32"
>
	<!-- This visit's orbit mark, oversized and faint behind the headline. -->
	<div
		class="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden"
		aria-hidden="true"
	>
		<OrbitMark class="size-[22rem] opacity-[0.06] sm:size-[34rem]" />
	</div>
	<!-- Explicit lines + w-fit so the box ends where the text does, giving the
	     splash a real corner to sit on. -->
	<h1 class="relative w-fit text-4xl font-bold tracking-tight sm:text-6xl">
		<span class="block">The website you</span>
		<span class="block">need, without effort.</span>
		<Splash lines={SPLASHES} />
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
	<div class="grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:items-center lg:gap-16">
		<div class="flex flex-col gap-4">
			<h2 class="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
				AI doesn’t have to replace people. It can make room for them.
			</h2>
			<p class="text-lg leading-relaxed text-foreground/70">
				Building a website no longer takes significant engineering time. So we spend that time where
				it matters: on you.
			</p>
			<p class="leading-relaxed text-foreground/65">
				From the first conversation to launch, you talk with an actual engineer who listens, builds
				what you need, and shows you every step. You bring the vision. We handle everything else.
			</p>
		</div>
		<NeverGrid />
	</div>
	<div class="flex flex-col items-center gap-3 pt-20 text-center">
		<p class="text-sm font-semibold tracking-[0.14em] text-primary uppercase">Instead</p>
		<h3 class="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{INSTEAD}</h3>
		<GlassCard class="mt-8 items-center p-6 sm:p-10">
			<ProfileCard
				src={headshots.blake}
				alt={ENGINEER.name}
				name={ENGINEER.name}
				role={ENGINEER.role}
				subrole={ENGINEER.subrole}
				skills={ENGINEER.skills}
				email={ENGINEER.email}
				linkedin={ENGINEER.linkedin}
			>
				{#snippet desc()}
					{#each ENGINEER.bio as line (line)}<span>{line}</span>{/each}
				{/snippet}
			</ProfileCard>
		</GlassCard>
	</div>
</Section>

<Section wide class="pb-24">
	<div class="mx-auto flex max-w-2xl flex-col items-center gap-3 pb-10 text-center">
		<h2 class="text-3xl font-bold tracking-tight">How we work</h2>
		<p class="text-lg leading-relaxed text-balance text-foreground/65">
			You see your site at every step, and every round of your feedback shapes the next one.
		</p>
	</div>
	<ProcessFlow />
	<div class="pt-20">
		<AfterLaunch />
	</div>
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
					class="flex flex-col gap-1 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-6"
				>
					<dt class="w-28 shrink-0 text-4xl font-bold tracking-tight text-primary">{row.figure}</dt>
					<dd class="leading-relaxed text-foreground/70">
						{row.body}
						{#if row.link}
							<a
								href={row.link.href}
								class="font-medium text-primary underline-offset-4 hover:underline"
								>{row.link.label}</a
							>
						{/if}
					</dd>
				</div>
			{/each}
		</dl>
	</GlassCard>
</Section>

<Section wide class="pb-24">
	<a
		href={CAUSES.href}
		class="group flex flex-col gap-6 rounded-4xl bg-linear-to-br from-primary/18 via-primary/6 to-transparent p-6 ring-1 ring-primary/30 transition-colors hover:ring-primary/60 sm:p-10 lg:flex-row lg:items-center lg:gap-16"
	>
		<div class="flex flex-col gap-4 lg:max-w-xl">
			<span class="grid size-12 place-items-center rounded-2xl bg-primary/20 text-primary">
				<HandHeart class="size-6" aria-hidden="true" />
			</span>
			<h2 class="text-3xl font-bold tracking-tight">{CAUSES.title}</h2>
			<p class="text-lg leading-relaxed text-foreground/70">{CAUSES.body}</p>
			<span
				class="inline-flex items-center gap-2 pt-1 text-sm font-semibold text-primary group-hover:gap-3"
				>How we help causes <ArrowRight class="size-4 transition-all" aria-hidden="true" /></span
			>
		</div>
		<ul class="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
			{#each CAUSES.kinds as k (k.title)}
				{@const CauseIcon = CAUSE_ICONS[k.title]}
				<li
					class="flex flex-col gap-2 rounded-2xl bg-background/40 p-4 ring-1 ring-foreground/10 transition duration-300 group-hover:ring-primary/25 hover:-translate-y-1 hover:bg-primary/10 hover:ring-primary/50"
				>
					<span class="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
						<CauseIcon class="size-4.5" aria-hidden="true" />
					</span>
					<span class="text-sm leading-snug font-semibold">{k.title}</span>
					<span class="text-xs leading-relaxed text-foreground/60">{k.hook}</span>
				</li>
			{/each}
		</ul>
	</a>
</Section>

<Section wide class="items-center pb-24">
	<div class="flex max-w-3xl flex-col items-center gap-6 pb-12 text-center">
		<h2 class="text-3xl font-bold tracking-tight sm:text-4xl">
			This sounds too good to be true...
		</h2>
		<p class="text-lg leading-relaxed text-balance text-foreground/65">
			Everyone on the Void Projects Team has years of enterprise application development experience.
			We amplify that experience with our own tools and AI to make website building financially
			feasible again.
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
			{#if !contactSent}
				<div class="flex flex-col gap-2">
					<h2 class="text-3xl font-bold tracking-tight">Let’s build yours</h2>
					<p class="text-foreground/65">
						Tell us what you need. A person reads every message and writes back.
					</p>
				</div>
			{/if}
			<ContactForm bind:sent={contactSent} />
		</GlassCard>
	</div>
</Section>
