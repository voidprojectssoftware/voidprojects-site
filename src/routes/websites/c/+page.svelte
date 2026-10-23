<script lang="ts">
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import { Section } from '$lib/components/voidprojects/section/index.js';
	import { BrowserFrame } from '$lib/components/browser-frame/index.js';
	import { ContactForm } from '$lib/components/contact-form/index.js';
	import { SHOWCASE, MARGIN_PERCENT } from '$lib/content/websites.js';

	const [cause, business] = SHOWCASE;

	const STEPS = [
		{ who: 'You and us', what: 'We talk through what your site needs to do, person to person.' },
		{ who: 'Us, with AI', what: 'Our AI augmented process turns that into a working site, fast.' },
		{
			who: 'You and us',
			what: 'We review it together and refine until it’s right. Then it’s live.'
		}
	];
</script>

<svelte:head>
	<title>Websites by Void Projects</title>
	<meta
		name="description"
		content="Websites built by people, sped up by AI. Openly billed at cost plus 30%, $0 for our work, and free for causes."
	/>
</svelte:head>

<SiteHeader />

<Section class="pt-14 pb-20 sm:pt-24">
	<div class="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
		<div>
			<h1 class="text-4xl font-bold tracking-tight text-balance sm:text-6xl">
				Every site we build starts with a conversation.
			</h1>
			<p class="max-w-xl pt-6 text-lg leading-relaxed text-foreground/70">
				AI speeds up how we work. It never takes the human out of talking with you. You pay our
				costs plus {MARGIN_PERCENT}%, and nothing for the work itself.
			</p>
			<a
				href="#contact"
				class="mt-9 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-white hover:bg-primary/85"
				>Start yours</a
			>
		</div>
		<div class="relative mx-auto hidden w-full max-w-sm lg:block" aria-hidden="true">
			<img
				src={business.mobile}
				alt=""
				width="390"
				height="844"
				class="absolute top-10 left-0 w-[58%] -rotate-6 rounded-[1.75rem] border-[6px] border-[oklch(0.21_0.015_285)] opacity-80 shadow-2xl"
			/>
			<img
				src={cause.mobile}
				alt=""
				width="390"
				height="844"
				fetchpriority="high"
				class="relative ml-auto w-[62%] rotate-3 rounded-[1.75rem] border-[6px] border-[oklch(0.21_0.015_285)] shadow-2xl"
			/>
		</div>
	</div>
</Section>

<Section class="pb-24">
	<div
		class="grid items-center gap-10 rounded-3xl border border-primary/25 bg-primary/[0.06] p-6 sm:p-10 lg:grid-cols-[1fr_1.2fr]"
	>
		<div class="flex flex-col gap-4">
			<span class="text-sm font-semibold tracking-[0.16em] text-primary uppercase"
				>Built free, for a cause</span
			>
			<h2 class="text-3xl font-bold tracking-tight sm:text-4xl">{cause.name}</h2>
			<p class="leading-relaxed text-foreground/75">
				Hallie is the mother of one of our own. When she began treatment for breast cancer, we built
				a place for her to share her journey in her own words, keep family and friends close with
				every update, and sell shirts that help fund her care.
			</p>
			<p class="leading-relaxed text-foreground/75">
				Sites that serve a cause, we build for free. That’s not a promotion; it’s how we work.
			</p>
			<a
				href={cause.url}
				target="_blank"
				rel="noopener"
				class="w-fit text-sm font-semibold text-primary hover:underline">Visit {cause.host} ↗</a
			>
		</div>
		<a href={cause.url} target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">
			<BrowserFrame src={cause.desktop} host={cause.host} alt="" />
		</a>
	</div>
</Section>

<Section class="pb-24">
	<div class="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
		<a href={business.url} target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">
			<BrowserFrame src={business.desktop} host={business.host} alt="" />
		</a>
		<div class="flex flex-col gap-4">
			<span class="text-sm font-semibold tracking-[0.16em] text-foreground/50 uppercase"
				>{business.kind}</span
			>
			<h2 class="text-3xl font-bold tracking-tight sm:text-4xl">{business.name}</h2>
			<p class="leading-relaxed text-foreground/75">{business.blurb}</p>
			<a
				href={business.url}
				target="_blank"
				rel="noopener"
				class="w-fit text-sm font-semibold hover:text-primary">Visit {business.host} ↗</a
			>
		</div>
	</div>
</Section>

<Section class="pb-24">
	<h2 class="text-3xl font-bold tracking-tight">How it works</h2>
	<ol class="grid gap-6 pt-8 md:grid-cols-3">
		{#each STEPS as step, i (i)}
			<li class="flex flex-col gap-2 border-t border-foreground/15 pt-5">
				<span class="text-sm text-foreground/45">Step {i + 1} · {step.who}</span>
				<p class="text-lg leading-snug">{step.what}</p>
			</li>
		{/each}
	</ol>
	<p class="max-w-2xl pt-12 text-lg leading-relaxed text-foreground/70">
		<span class="font-semibold text-foreground">The bill is simple:</span> what it costs us,
		itemized, plus {MARGIN_PERCENT}%. Zero dollars for our work. Simple sites can come to nothing at
		all.
	</p>
</Section>

<Section class="pb-28">
	<div id="contact" class="mx-auto w-full max-w-2xl scroll-mt-24">
		<h2 class="text-3xl font-bold tracking-tight sm:text-4xl">What should we build for you?</h2>
		<p class="pt-3 pb-8 text-foreground/70">
			Business, cause, or something personal. Tell us, and a person writes back.
		</p>
		<ContactForm />
	</div>
</Section>
