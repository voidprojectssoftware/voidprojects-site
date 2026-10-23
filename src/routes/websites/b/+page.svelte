<script lang="ts">
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import { Section } from '$lib/components/voidprojects/section/index.js';
	import { BrowserFrame } from '$lib/components/browser-frame/index.js';
	import { ContactForm } from '$lib/components/contact-form/index.js';
	import { SHOWCASE, MARGIN_PERCENT } from '$lib/content/websites.js';

	const RECEIPT = [
		{ item: 'What your site costs us', note: 'itemized, nothing hidden', amount: 'at cost' },
		{ item: 'Our margin', note: 'flat, on cost only', amount: `+${MARGIN_PERCENT}%` },
		{ item: 'Our time and work', note: 'design, build, revisions', amount: '$0.00' }
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
	<div class="max-w-4xl">
		<h1 class="text-5xl leading-[1.02] font-bold tracking-tight sm:text-7xl">
			We build websites.<br /><span class="text-foreground/40">You see every dollar.</span>
		</h1>
		<p class="max-w-xl pt-8 text-lg leading-relaxed text-foreground/70">
			Void Projects builds sites with an AI augmented process that keeps a person on every
			conversation. AI makes us faster. It never stands in for us.
		</p>
		<a
			href="#contact"
			class="mt-9 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-white hover:bg-primary/85"
			>Start your site →</a
		>
	</div>
</Section>

<Section class="pb-24">
	<div class="flex items-baseline justify-between border-b border-foreground/10 pb-4">
		<h2 class="text-sm font-semibold tracking-[0.18em] text-foreground/50 uppercase">
			Recent work
		</h2>
		<span class="text-sm text-foreground/40">{SHOWCASE.length} sites</span>
	</div>
	{#each SHOWCASE as site, i (site.url)}
		<article
			class="grid items-center gap-8 border-b border-foreground/10 py-12 lg:gap-16 {i % 2
				? 'lg:grid-cols-[1.4fr_1fr]'
				: 'lg:grid-cols-[1fr_1.4fr]'}"
		>
			<div class="flex flex-col gap-4 {i % 2 ? 'lg:order-2' : ''}">
				<span class="text-sm text-foreground/45"
					>0{i + 1} · {site.kind}{site.free ? ' · built free' : ''}</span
				>
				<h3 class="text-3xl font-bold tracking-tight sm:text-4xl">{site.name}</h3>
				<p class="leading-relaxed text-foreground/70">{site.blurb}</p>
				<a
					href={site.url}
					target="_blank"
					rel="noopener"
					class="w-fit border-b border-primary pb-0.5 text-sm font-semibold hover:text-primary"
					>{site.host} ↗</a
				>
			</div>
			<a
				href={site.url}
				target="_blank"
				rel="noopener"
				class="relative block pr-10 pb-10 sm:pr-16"
				tabindex="-1"
				aria-hidden="true"
			>
				<BrowserFrame src={site.desktop} host={site.host} alt="" eager={i === 0} />
				<img
					src={site.mobile}
					alt=""
					width="390"
					height="844"
					loading="lazy"
					decoding="async"
					class="absolute right-0 bottom-0 w-[24%] rounded-2xl border-4 border-[oklch(0.21_0.015_285)] shadow-[0_20px_40px_-15px_oklch(0_0_0/0.9)]"
				/>
			</a>
		</article>
	{/each}
</Section>

<Section class="pb-24">
	<div class="grid gap-12 lg:grid-cols-2 lg:gap-16">
		<div class="flex flex-col gap-5">
			<h2 class="text-4xl font-bold tracking-tight">Open billing.</h2>
			<p class="leading-relaxed text-foreground/70">
				Every invoice shows what we paid and what we added. We charge for the cost of your site plus
				{MARGIN_PERCENT}%, and nothing for the work.
			</p>
			<p class="leading-relaxed text-foreground/70">
				If your site is simple enough, that cost can be zero. If it’s for a cause, we build it free,
				like <a
					class="underline underline-offset-4 hover:text-primary"
					href="https://rally4hallie.com"
					target="_blank"
					rel="noopener">Rally4Hallie</a
				>.
			</p>
		</div>
		<div
			class="rounded-2xl border border-foreground/10 bg-background/70 p-6 font-mono text-sm backdrop-blur-sm sm:p-8"
		>
			<p class="pb-5 text-xs tracking-[0.2em] text-foreground/45 uppercase">How every bill reads</p>
			{#each RECEIPT as line (line.item)}
				<div class="flex items-baseline gap-3 py-2.5">
					<div class="flex flex-col">
						<span>{line.item}</span>
						<span class="text-xs text-foreground/40">{line.note}</span>
					</div>
					<span class="flex-1 translate-y-[-0.3em] border-b border-dotted border-foreground/20"
					></span>
					<span class="text-foreground/85">{line.amount}</span>
				</div>
			{/each}
			<div
				class="mt-4 flex items-baseline justify-between border-t border-foreground/20 pt-4 text-base"
			>
				<span class="font-semibold">You pay</span>
				<span class="font-semibold text-primary"
					>cost × {(1 + MARGIN_PERCENT / 100).toFixed(2)}</span
				>
			</div>
			<p class="pt-3 text-xs text-foreground/45">Simple site or a cause? Often $0.</p>
		</div>
	</div>
</Section>

<Section class="pb-28">
	<div
		id="contact"
		class="grid scroll-mt-24 gap-10 border-t border-foreground/10 pt-16 lg:grid-cols-[1fr_1.4fr] lg:gap-16"
	>
		<div class="flex flex-col gap-4">
			<h2 class="text-4xl font-bold tracking-tight">Tell us about your site.</h2>
			<p class="leading-relaxed text-foreground/70">
				A person on our team reads it and writes back. No bots, no sales funnel.
			</p>
		</div>
		<ContactForm />
	</div>
</Section>
