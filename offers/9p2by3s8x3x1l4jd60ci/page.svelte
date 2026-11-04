<script lang="ts">
	import './theme.css';
	// Inlined so no asset path, which carries the offer id, sits in the script.
	import logo from './logo.png?inline';
	import { generateMarkSvg } from '$lib/brand/mark.js';
	import { TRAJECTORIES } from '$lib/trajectory/source.js';
	import figures from './figures.json';
	import {
		ConcernsList,
		OfferGate,
		PlanPicker,
		QrCode,
		SignUpButton,
		initialSelection
	} from '$lib/offers/blocks/index.js';
	import {
		formatAmount,
		formatDate,
		priceFor,
		type Interval,
		type Plan
	} from '$lib/offers/offer.js';
	import type { OfferPageProps } from '$lib/offers/page.js';

	let { offer, context }: OfferPageProps = $props();

	// svelte-ignore state_referenced_locally
	let selection = $state(initialSelection(offer));

	let plan = $derived(offer.plans[0]);
	let monthly = $derived(priceFor(plan, 'month')?.amount ?? 0);
	let yearly = $derived(priceFor(plan, 'year')?.amount ?? 0);
	const money = (cents: number) => formatAmount(cents, offer.currency);

	// Display-only breakdown of the one plan; checkout still prices the plan from offer.ts.
	// The parts are monthly cents; each interval's part is scaled by that interval's plan
	// price, and the render throws (failing the build) unless the parts add up exactly.
	const PARTS = [
		{
			site: 'First Touch Payment Solutions',
			detail:
				'The agents that keep it secure, current and competitive, content edits of any size, and hosting.',
			monthly: 20000
		},
		{
			site: 'Software Earnings',
			detail:
				'Only the added cost of running the same agents on a second site, since everything is already set up.',
			monthly: 7500
		}
	];
	function breakdown(p: Plan, interval: Interval) {
		const base = PARTS.reduce((sum, part) => sum + part.monthly, 0);
		const price = priceFor(p, interval)?.amount ?? 0;
		const parts = PARTS.map((part) => ({ ...part, amount: (part.monthly * price) / base }));
		if (
			priceFor(p, 'month')?.amount !== base ||
			parts.some((part) => !Number.isInteger(part.amount)) ||
			parts.reduce((sum, part) => sum + part.amount, 0) !== price
		) {
			throw new Error(
				`offer ${offer.id}: the plan breakdown does not add up to the ${interval} price`
			);
		}
		return { parts, price };
	}
	// Checked for both intervals at render, so a price change in offer.ts that the parts
	// no longer match stops the build rather than showing a wrong sum.
	// svelte-ignore state_referenced_locally
	for (const p of offer.plans) for (const i of offer.intervals) breakdown(p, i);

	// The site's orbit mark with the favicon's fixed seed (src/routes/favicon.svg), drawn
	// on the server only so the trajectory table never ships in the page script. The
	// client reads the server's markup back before hydrating, so {@html} matches.
	const FAVICON_SEED = 42;
	const voidMark = import.meta.env.SSR
		? generateMarkSvg(TRAJECTORIES, FAVICON_SEED, __BRAND_PRIMARY__)
		: (document.querySelector('[data-void-mark]')?.innerHTML ?? '');

	const PER: Record<Interval, string> = { month: '/month', year: '/year' };

	const NOW = 'Where you are';
	const NEXT = 'Where you can be';

	interface Row {
		label: string;
		why: string;
		fine: string;
		before: string;
		after: string;
		bar: { before: number; after: number; max: number };
		target?: { value: number; label: string; good: string; text: string; source: string }; // benchmark line, see figures.mjs
	}

	const width = (value: number, max: number) => `${Math.max(1.5, (100 * value) / max)}%`;
	const at = (value: number, max: number) => `min(${(100 * value) / max}%, 100% - 2px)`;

	// "About 5 seconds" and "under 2 seconds": figures.json wait rows, 4.9 s and 5.1 s
	// today, 1.8 s and 0.8 s rebuilt. The rest restates the concerns in offer.ts.
	const STAY = [
		'Pages take about 5 seconds to show on a phone',
		'An insurance advert where your own words should be',
		'Contact details search engines and AI assistants often miss',
		'Template leftovers and broken links',
		'Dozens of outside scripts on every page'
	];
	const MOVE = [
		'Pages show in under 2 seconds on a phone',
		'Your own words on every screen',
		'Contact details every search engine and assistant can read',
		'Clean pages, and someone checking they stay that way',
		'Lean, static pages, kept secure and current by us'
	];

	const COVERS = [
		{ title: 'Security updates', detail: 'Fixes applied as soon as they come out.' },
		{ title: 'Hosting for both sites', detail: 'Fast pages on both of your domains.' },
		{ title: 'Watching both sites', detail: 'If something breaks, we notice and deal with it.' },
		{
			title: 'Content edits',
			detail:
				'Text, photos, hours and prices, whenever you need them. New features we price with you first.'
		},
		{
			title: 'Search and AI upkeep',
			detail: 'Re-measured as search engines and AI tools change.'
		}
	];

	const SECURITY = [
		{
			title: 'Nothing to break into',
			detail: 'Static pages: no database and no admin login on the web.'
		},
		{
			title: 'Fixes go in when released',
			detail: 'The tools behind each site are kept current.'
		},
		{
			title: 'No code you do not need',
			detail: 'None of the outside scripts the current sites load.'
		},
		{ title: 'HTTPS, and watched', detail: 'Served only over HTTPS, and monitored by us.' }
	];
</script>

<svelte:head>
	<title>Hosting proposal for {offer.prospect} | Void Projects</title>
</svelte:head>

{#snippet planDetails(p: Plan, interval: Interval)}
	{@const b = breakdown(p, interval)}
	<span class="breakdown">
		<span class="agents"
			>We use AI agents to watch, update and improve your sites continuously; that is where most of
			the cost goes.</span
		>
		{#each b.parts as part (part.site)}
			<span class="part">
				<span><strong>{part.site}</strong><small>{part.detail}</small></span>
				<span class="amount">{money(part.amount)}<small>{PER[interval]}</small></span>
			</span>
		{/each}
		<span class="part sum">
			<strong>Total for both sites</strong>
			<span class="amount">{money(b.price)}<small>{PER[interval]}</small></span>
		</span>
	</span>
{/snippet}

{#snippet icon(kind: 'yes' | 'no')}
	<svg class="icon {kind}" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
		<circle cx="10" cy="10" r="10" />
		{#if kind === 'yes'}
			<path d="M5.5 10.5l3 3 6-7" />
		{:else}
			<path d="M6.5 6.5l7 7M13.5 6.5l-7 7" />
		{/if}
	</svg>
{/snippet}

{#snippet tiles(list: Row[])}
	<ul class="tiles">
		{#each list as row (row.label)}
			<li class="tile">
				<p class="font-semibold">{row.label}</p>
				<div class="bars">
					<span class="who">{NOW}</span>
					<span class="track"
						><span class="fill now" style:width={width(row.bar.before, row.bar.max)}
						></span>{#if row.target}<span
								class="line"
								style:left={at(row.target.value, row.bar.max)}
							></span>{/if}</span
					>
					<span class="val">{row.before}</span>
					<span class="who">{NEXT}</span>
					<span class="track"
						><span class="fill next" style:width={width(row.bar.after, row.bar.max)}
						></span>{#if row.target}<span
								class="line"
								style:left={at(row.target.value, row.bar.max)}
							></span>{/if}</span
					>
					<span class="val next-val">{row.after}</span>
					{#if row.target}
						{@const end = row.target.value >= row.bar.max}
						<span class="marks">
							<span
								class="mark-label"
								class:toward-left={row.target.good === 'lower'}
								class:at-end={end}
								style:left={at(row.target.value, row.bar.max)}
								aria-hidden="true"
								>{#if row.target.good === 'lower'}&larr; {row.target.label}{:else if end}{row.target
										.label} &uarr;{:else}{row.target.label} &rarr;{/if}</span
							>
							<span class="sr-only">{row.target.text}</span>
						</span>
					{/if}
				</div>
				<p class="why">{row.why}</p>
				<p class="fine">
					{row.target ? `${row.fine} Line: ${row.target.source}` : row.fine}
				</p>
			</li>
		{/each}
	</ul>
{/snippet}

<header class="px-4 pt-5 sm:px-8">
	<div class="lockup mx-auto flex w-fit items-center">
		<span class="void">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<span class="mark" data-void-mark aria-hidden="true">{@html voidMark}</span>
			<span>Void Projects</span>
		</span>
		<span class="plus" aria-hidden="true">+</span>
		<img class="ftps" src={logo} alt="First Touch Payment Solutions" width="179" height="48" />
	</div>
</header>

<main class="mx-auto grid max-w-4xl gap-14 px-4 py-12 sm:px-8 sm:py-16">
	<OfferGate {offer} builtAt={context.builtAt}>
		<section class="hero relative isolate grid gap-4" aria-labelledby="offer-title">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<span class="hero-mark" aria-hidden="true">{@html voidMark}</span>
			<p class="eyebrow">Proposal</p>
			<h1 id="offer-title" class="text-4xl leading-tight sm:text-5xl">
				Hosting and maintenance proposal for your two websites
			</h1>
			<p class="max-w-2xl text-lg text-(--offer-muted)">
				Larry, we propose to host, secure and maintain both websites we rebuilt for you, First Touch
				Payment Solutions and Software Earnings, and keep them fast and easy for search engines and
				AI assistants to read. Below is where your sites are today and where they can be; sign up at
				the bottom or reply with any questions.
			</p>
			<p class="price">
				<strong>{money(monthly)}</strong> a month for both sites, or {money(yearly)} a year
			</p>
		</section>

		<section class="grid gap-6" aria-labelledby="offer-sites">
			<div class="grid gap-3">
				<h2 id="offer-sites">Your two sites, measured</h2>
				<p class="legend">
					<span><span class="swatch now"></span>{NOW}: your current site</span>
					<span><span class="swatch next"></span>{NEXT}: the site we rebuilt</span>
				</p>
			</div>

			{#each figures.sites as site (site.id)}
				<article class="site grid gap-5" aria-labelledby="site-{site.id}">
					<div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
						<h3 id="site-{site.id}" class="text-2xl">{site.name}</h3>
						<div class="flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
							<a href={site.preview} rel="noreferrer">Open the rebuilt site</a>
							<a href="{site.preview}site-comparison/" rel="noreferrer">Full comparison</a>
						</div>
					</div>

					{@render tiles(site.rows)}

					{#if site.ai}
						<div class="grid gap-3">
							<h4 class="text-lg font-semibold">What AI assistants can read about you</h4>
							{@render tiles(site.ai.rows)}
						</div>
					{:else}
						<p class="fine">
							AI assistant checks have not been run on this site yet; running them is part of the
							upkeep.
						</p>
					{/if}

					<p class="fine">
						Measured {site.measured} on {site.pages} pages of both versions, as a phone loads them.
					</p>
				</article>
			{/each}
		</section>

		<ConcernsList concerns={offer.concerns} title="What holds your current sites back" />

		<section class="grid gap-4" aria-labelledby="offer-choice">
			<h2 id="offer-choice">The difference for your business</h2>
			<div class="choice grid gap-4 sm:grid-cols-2">
				<div class="stay">
					<h3>Where you are at</h3>
					<ul>
						{#each STAY as line (line)}<li>{@render icon('no')}<span>{line}</span></li>{/each}
					</ul>
				</div>
				<div class="move">
					<h3>Where you can be</h3>
					<ul>
						{#each MOVE as line (line)}<li>{@render icon('yes')}<span>{line}</span></li>{/each}
					</ul>
				</div>
			</div>
		</section>

		<section class="grid gap-4" aria-labelledby="offer-covers">
			<h2 id="offer-covers">What {money(monthly)} a month covers</h2>
			<ul class="items">
				{#each COVERS as item (item.title)}
					<li>
						{@render icon('yes')}
						<div>
							<p class="font-semibold">{item.title}</p>
							<p class="text-(--offer-muted)">{item.detail}</p>
						</div>
					</li>
				{/each}
			</ul>
		</section>

		<section class="grid gap-4" aria-labelledby="offer-security">
			<h2 id="offer-security">Security in the age of AI</h2>
			<p class="max-w-2xl text-(--offer-muted)">
				AI makes attacks cheaper: bots scan for outdated software, copy a business's site for
				phishing and collect published contact details. No one can promise a site is never attacked;
				we keep the risk low.
			</p>
			<ul class="items">
				{#each SECURITY as item (item.title)}
					<li>
						{@render icon('yes')}
						<div>
							<p class="font-semibold">{item.title}</p>
							<p class="text-(--offer-muted)">{item.detail}</p>
						</div>
					</li>
				{/each}
			</ul>
		</section>

		<section class="grid gap-8" aria-label="Sign up">
			<PlanPicker
				{offer}
				bind:selection
				title="Monthly or a year ahead"
				renewalNote={false}
				details={planDetails}
			/>
			<div class="longer">
				<p class="font-semibold">Want to pay further ahead?</p>
				<p class="text-(--offer-muted)">
					Same rate, two months off each year: {money(yearly * 2)} for two years, {money(
						yearly * 3
					)}
					for three. Reply to the message that brought you here, or write to
					<a href="mailto:hello@voidprojects.ai">hello@voidprojects.ai</a>, and we will set it up.
				</p>
			</div>
			<div class="grid items-center gap-8 sm:grid-cols-[1fr_auto]">
				<SignUpButton offerId={offer.id} {selection} endpoint={context.checkoutEndpoint}
					>Sign up securely</SignUpButton
				>
				<QrCode qr={context.qr} url={context.url} />
			</div>
		</section>
	</OfferGate>

	<footer
		class="flex flex-wrap items-center justify-between gap-3 border-t border-(--offer-border) pt-6 text-sm text-(--offer-muted)"
	>
		<p>Offer open through {formatDate(offer.expires)}.</p>
		<!-- The standard footer badge, as docs/websites/how-to/add-the-footer-badge.md gives it. -->
		<a
			href="https://voidprojects.ai/websites"
			style="display:inline-flex;align-items:center;gap:6px"
		>
			<img src="https://voidprojects.ai/api/mark.svg" width="20" height="20" alt="" />
			<span>Made by <strong>Void Projects</strong></span>
		</a>
	</footer>
</main>

<style>
	.lockup {
		gap: 0.625rem;
		padding: 0.5rem 1.125rem;
		border-radius: 999px;
		background: var(--void-night);
		color: #fff;
		box-shadow: 0 10px 30px -12px oklch(0.17 0.018 285 / 0.45);
	}
	.void {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		white-space: nowrap;
	}
	.mark {
		display: block;
		width: 28px;
		height: 28px;
	}
	.mark :global(svg),
	.hero-mark :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}
	.plus {
		font-size: 1.25rem;
		font-weight: 300;
		line-height: 1;
		opacity: 0.7;
	}
	.ftps {
		display: block;
		height: 34px;
		width: auto;
	}
	p {
		margin: 0;
	}
	a {
		color: var(--void-primary-text);
		font-weight: 600;
		text-underline-offset: 0.25em;
	}
	a:hover {
		text-decoration: underline;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	/* Hero: the site's own move, a faint oversized orbit mark behind the heading. */
	.hero {
		padding-top: 1rem;
	}
	.hero-mark {
		position: absolute;
		z-index: -1;
		top: -2rem;
		right: -3rem;
		width: 18rem;
		height: 18rem;
		opacity: 0.07;
		pointer-events: none;
	}
	.eyebrow {
		font-size: 0.8125rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--void-primary-text);
	}
	.price {
		font-size: 1.125rem;
		color: var(--offer-muted);
	}
	.price strong {
		font-size: 2rem;
		letter-spacing: -0.02em;
		color: var(--void-primary-text);
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
		font-size: 0.875rem;
		color: var(--offer-muted);
	}
	.legend > span {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
	.swatch {
		display: inline-block;
		width: 1.5rem;
		height: 0.625rem;
		border-radius: 999px;
	}
	.now {
		background: var(--void-neutral);
	}
	.next {
		background: var(--void-primary);
	}

	.site {
		padding: 1.5rem;
		border: 1px solid var(--offer-border);
		border-radius: 1.5rem;
		background: var(--offer-surface);
		box-shadow: 0 20px 40px -28px oklch(0.4 0.1 300 / 0.35);
	}
	.tiles,
	.choice ul,
	.items {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.tiles {
		display: grid;
		gap: 0.75rem;
	}
	.tile {
		display: grid;
		gap: 0.5rem;
		padding: 1rem 1.125rem;
		border-radius: 1rem;
		background: var(--offer-bg);
	}
	.bars {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 0.125rem 0.75rem;
	}
	.bars .who {
		grid-column: 1 / -1;
		margin-top: 0.25rem;
	}
	.who {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--offer-muted);
		white-space: nowrap;
	}
	.track {
		position: relative;
		display: block;
		height: 0.75rem;
		border-radius: 999px;
		background: oklch(0.145 0 0 / 0.07);
	}
	.fill {
		display: block;
		height: 100%;
		border-radius: 999px;
	}
	.line {
		position: absolute;
		top: -0.25rem;
		bottom: -0.25rem;
		width: 2px;
		border-radius: 1px;
		background: var(--offer-fg);
	}
	/* The benchmark's label sits under its line: starting at the line when good is to
	   the right, ending at it when good is to the left or the line is the full bar. */
	.marks {
		position: relative;
		grid-column: 1;
		height: 1.25rem;
	}
	.mark-label {
		position: absolute;
		top: 0.125rem;
		margin-left: -1px;
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
	}
	.mark-label.toward-left,
	.mark-label.at-end {
		margin-left: 3px;
		transform: translateX(-100%);
	}
	.val {
		min-width: 4.5rem;
		text-align: right;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		color: var(--offer-muted);
	}
	.next-val {
		color: var(--void-primary-text);
	}
	.why {
		font-size: 0.9375rem;
	}
	.fine {
		font-size: 0.75rem;
		color: var(--offer-muted);
	}

	.breakdown {
		display: grid;
		gap: 0.5rem;
		margin: 0.25rem 0;
		padding: 0.75rem 0;
		border-block: 1px solid var(--offer-border);
		font-size: 0.875rem;
	}
	.agents {
		color: var(--offer-muted);
	}
	.part {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
	}
	.part small {
		display: block;
		color: var(--offer-muted);
	}
	.part .amount {
		font-weight: 700;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.part .amount small {
		display: inline;
		font-weight: 500;
	}
	.sum {
		padding-top: 0.5rem;
		border-top: 1px dashed var(--offer-border);
	}

	.choice > div {
		padding: 1.5rem;
		border-radius: 1.5rem;
	}
	.choice .stay {
		border: 1px solid var(--offer-border);
		background: var(--offer-surface);
	}
	/* The site's highlighted-card treatment (the causes card on /websites). */
	.choice .move {
		border: 1px solid oklch(0.6534 0.1876 301.62 / 0.3);
		background: linear-gradient(
			to bottom right,
			oklch(0.6534 0.1876 301.62 / 0.18),
			oklch(0.6534 0.1876 301.62 / 0.06),
			transparent
		);
	}
	.choice h3 {
		margin: 0 0 0.875rem;
		font-size: 1.25rem;
	}
	.choice ul,
	.items {
		display: grid;
		gap: 0.625rem;
	}
	.choice li,
	.items li {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
	}
	.items {
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: 0.75rem;
	}
	.items li,
	.longer {
		padding: 1rem 1.25rem;
		border: 1px solid var(--offer-border);
		border-radius: 1rem;
		background: var(--offer-surface);
	}
	.longer {
		border-left: 3px solid var(--void-primary);
	}
	.icon {
		flex: none;
		margin-top: 0.125rem;
	}
	.icon path {
		fill: none;
		stroke: #fff;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.icon.yes circle {
		fill: var(--void-primary-strong);
	}
	.icon.no circle {
		fill: oklch(0.55 0.006 300);
	}

	@media (min-width: 40rem) {
		.lockup {
			gap: 1rem;
			padding: 0.625rem 1.5rem;
		}
		.void {
			font-size: 1.25rem;
		}
		.mark {
			width: 36px;
			height: 36px;
		}
		.plus {
			font-size: 1.625rem;
		}
		.ftps {
			height: 42px;
		}
		.hero-mark {
			width: 26rem;
			height: 26rem;
			top: -4rem;
			right: -6rem;
		}
		.tiles {
			grid-template-columns: 1fr 1fr;
		}
		.site {
			padding: 2rem;
		}
	}
</style>
