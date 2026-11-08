<script lang="ts">
	import './theme.css';
	import figures from './figures.json';
	import { ENGINEER } from '$lib/content/websites.js';
	import {
		ConcernsList,
		OfferGate,
		PlanPicker,
		QrCode,
		SignUpButton,
		initialSelection
	} from '$lib/offers/blocks/index.js';
	import { formatAmount, formatDate, priceFor } from '$lib/offers/offer.js';
	import type { OfferPageProps } from '$lib/offers/page.js';

	let { offer, context }: OfferPageProps = $props();

	// Files from offers/<id>/public/, by path from the page's own URL (a prop), so the
	// offer id is in the HTML but never in the page script or CSS.
	const asset = (path: string) => new URL(path, context.url).pathname;

	// Haven teal's three faces, as that system ships them (pottery-haven-website
	// src/design/systems/haven-teal/fonts/, SIL OFL; the licences are beside the files).
	const FONT_FACES =
		'<style>' +
		[
			['Kalam', '700', 'fonts/kalam-latin-700-normal.woff2'],
			['Cabin', '400', 'fonts/cabin-latin-400-normal.woff2'],
			['Yesteryear', '400', 'fonts/yesteryear-latin-400-normal.woff2']
		]
			.map(
				([family, weight, file]) =>
					`@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;font-display:swap;src:url(${asset(file)}) format('woff2')}`
			)
			.join('') +
		'</style>';

	// svelte-ignore state_referenced_locally
	let selection = $state(initialSelection(offer));

	let plan = $derived(offer.plans[0]);
	let monthly = $derived(priceFor(plan, 'month')?.amount ?? 0);
	let yearly = $derived(priceFor(plan, 'year')?.amount ?? 0);
	const money = (cents: number) => formatAmount(cents, offer.currency);
	const previewHost = $derived(new URL(offer.previewUrl).host);
	const comparisonUrl = $derived(new URL('site-comparison/', offer.previewUrl).href);

	const NOW = 'Your site today';
	const NEXT = 'Your new site';

	interface Row {
		label: string;
		why: string;
		fine: string;
		before: string;
		after: string;
		bar: { before: number; after: number; max: number };
		impact?: string; // the consequence, shown as a callout after `why`
		target?: { value: number; label: string; good: string; text: string; source: string }; // benchmark line, see figures.mjs
	}

	const width = (value: number, max: number) => `${Math.max(1.5, (100 * value) / max)}%`;
	const at = (value: number, max: number) => `min(${(100 * value) / max}%, 100% - 2px)`;
	const skipped = figures.notRebuilt;
	// Set when shop pages in the run show the preview's sample products (figures.mjs).
	const filler = figures.filler as { pages: number; note: string } | null;

	// What the plan keeps running, beyond hosting: pottery-haven-website ADR 0007
	// (lines 30-33: products from the studio's Square catalog, Square-hosted checkout, card
	// data never touches the site) and ADR 0008 (stock read from Square when the page is
	// opened, cached sixty seconds).
	const SHOP = [
		{
			title: 'Your products, from Square',
			detail:
				'The shop is built from your own Square catalog, so you keep managing items where you do now.'
		},
		{
			title: 'Stock that is current',
			detail:
				'Each product page checks your Square stock when it opens, so a sold-out piece shows as sold out.'
		},
		{
			title: 'Checkout through Square',
			detail: 'Buyers pay on Square’s own checkout. Card details never touch the website.'
		},
		{
			title: 'Kept working',
			detail:
				'We keep the connection to Square, its updates and the checkout working, and fix it if anything breaks.'
		}
	];

	// The hero's "Accept offer" jumps to the plan picker, where monthly or annual is chosen
	// first, and moves focus to its heading. Without JavaScript it is a plain anchor link.
	function toPlans(e: MouseEvent) {
		const heading = document.getElementById('offer-plans');
		if (!heading) return;
		e.preventDefault();
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		heading.setAttribute('tabindex', '-1');
		heading.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
		heading.focus({ preventScroll: true });
	}

	const QR_INK = '#2c435c'; // the navy, dark on white so phones read it
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html FONT_FACES}
	<title>Website proposal for {offer.prospect} | Void Projects</title>
</svelte:head>

{#snippet tiles(list: Row[])}
	<ul class="tiles">
		{#each list as row (row.label)}
			<li class="tile">
				<p class="tile-label">{row.label}</p>
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
				<p class="why">
					{row.why}
					{#if row.impact}
						<strong class="callout">{row.impact}</strong>{/if}
				</p>
				<p class="fine">
					{row.fine}{row.target ? ` Line: ${row.target.source}` : ''}
				</p>
			</li>
		{/each}
	</ul>
{/snippet}

<header class="band">
	<p class="name"><span class="script">Pottery</span> <span class="caps">Haven</span></p>
	<p class="from">A proposal from Void Projects</p>
</header>

<main class="mx-auto grid max-w-4xl grid-cols-1 gap-14 px-4 pt-10 pb-12 sm:px-8 sm:py-16">
	<OfferGate {offer} builtAt={context.builtAt}>
		<section class="grid gap-4" aria-labelledby="offer-title">
			<p class="eyebrow">Proposal</p>
			<h1 id="offer-title" class="text-[2.25rem] min-[30rem]:text-5xl">
				A faster website and shop, for {offer.prospect}
			</h1>
			<p class="max-w-2xl text-lg text-(--offer-muted)">
				We have built a new website for your studio. It is live as a preview now, so you can see it
				before you decide anything. Connected to your Square account, its shop sells your own
				products, shows your stock as it is, and sends buyers to Square’s checkout. We would host
				it, keep it secure, keep the Square connection working, and make your changes.
			</p>
			<p>
				<a class="preview" href={offer.previewUrl} rel="noreferrer"
					>See your new site at {previewHost}</a
				>
			</p>
			<!-- /terms #what-you-get ("no build fee and no minimum term") and #who-owns-what
			     (the domain at the registrar's price). -->
			<p class="price">
				<strong>{money(monthly)}</strong> a month, or {money(yearly)} a year. Your domain at the registrar’s
				price. No build fee. No contract.
			</p>
			<p class="cta">
				<a class="accept" href="#offer-plans" onclick={toPlans}>Accept offer</a>
				<a href="mailto:{ENGINEER.email}">Questions? Email {ENGINEER.name.split(' ')[0]}</a>
			</p>
		</section>

		<section class="engineer" aria-labelledby="offer-engineer">
			<img
				class="face"
				src={asset('engineer.webp')}
				alt={ENGINEER.name}
				width="96"
				height="96"
				decoding="async"
			/>
			<div class="grid gap-1">
				<p class="eyebrow">Your engineer</p>
				<h2 id="offer-engineer" class="engineer-name">{ENGINEER.name}</h2>
				<p>
					{ENGINEER.name.split(' ')[0]} built your new site and is your contact for anything you need.
					When you write to us, a person answers.
				</p>
				<p class="text-sm"><a href="mailto:{ENGINEER.email}">{ENGINEER.email}</a></p>
			</div>
		</section>

		<section class="grid gap-6" aria-labelledby="offer-figures">
			<div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
				<h2 id="offer-figures">Your site today and the new one, measured</h2>
				<a class="text-sm font-semibold" href={comparisonUrl} rel="noreferrer">Full comparison</a>
			</div>
			<p class="legend">
				<span><span class="swatch now"></span>{NOW}</span>
				<span><span class="swatch next"></span>{NEXT}</span>
			</p>
			{#if filler}<p class="filler">{filler.note}</p>{/if}
			{@render tiles(figures.rows)}
			{#if figures.ai}
				<h3 class="text-xl">What AI assistants can read about you</h3>
				{@render tiles(figures.ai.rows)}
				{#if filler}
					<p class="fine">
						The shop pages’ sample products are not yours, so facts about a product itself, such as
						a party package’s price, are not on them. The new site states the party packages on its
						Parties page.
					</p>
				{/if}
			{/if}
			<p class="fine">
				Measured {figures.measured} as a phone loads the pages: {figures.pages.before} pages of your current
				site against the {figures.pages.after} new pages that replace them.{skipped > 0
					? skipped === 1
						? ' One more page of your current site has no new page in this measurement, so it is not counted.'
						: ` ${skipped} more pages of your current site have no new page in this measurement, so they are not counted.`
					: ''}
			</p>
		</section>

		<ConcernsList concerns={offer.concerns} title="What we found on your current site" />

		<section class="grid gap-4" aria-labelledby="offer-shop">
			<h2 id="offer-shop">Your shop, kept running</h2>
			<p>
				The preview shows sample products until it is connected to your Square account. Once it is:
			</p>
			<ul class="shop">
				{#each SHOP as item (item.title)}
					<li>
						<p class="font-semibold">{item.title}</p>
						<p>{item.detail}</p>
					</li>
				{/each}
			</ul>
		</section>

		<section class="grid gap-8" aria-label="Accept the offer">
			<PlanPicker {offer} bind:selection title="Monthly or a year ahead" renewalNote={false} />
			<div class="grid items-center gap-8 sm:grid-cols-[1fr_auto]">
				<SignUpButton offerId={offer.id} {selection} endpoint={context.checkoutEndpoint}
					>Accept offer</SignUpButton
				>
				<QrCode
					qr={context.qr}
					url={context.url}
					title="Accept on your phone"
					fg={QR_INK}
					bg="#fff"
				/>
			</div>
			<!-- /terms #billing and #cancelling-and-refunds. -->
			<p class="renewal">
				Your plan renews automatically each month, or each year on the annual plan, until you
				cancel. Cancel any time from your billing page. Your site stays up until the end of the
				period you paid for, and we email you a reminder before each annual renewal.
			</p>
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
	/* The logo's lettering on the teal-black band: "Pottery" in a connected script, "HAVEN"
	   in hand-lettered capitals, over the logo's field of dots (Haven teal's band texture). */
	.band {
		padding: 1.5rem 1rem 1.25rem;
		background-color: var(--ht-band);
		background-image: radial-gradient(
			circle,
			color-mix(in srgb, var(--ht-on-band-muted) 22%, transparent) 1.4px,
			transparent 2px
		);
		background-size: 18px 18px;
		color: var(--ht-on-band);
		text-align: center;
	}
	.name {
		margin: 0;
		line-height: 1;
	}
	.script {
		font-family: var(--ht-hand);
		font-size: clamp(2.25rem, 5vw + 1rem, 3.5rem);
	}
	.caps {
		font-family: var(--ht-display);
		font-size: clamp(2.25rem, 5vw + 1rem, 3.5rem);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.from {
		margin: 0.5rem 0 0;
		color: var(--ht-on-band-muted);
		font-size: 0.9375rem;
		letter-spacing: 0.02em;
	}
	.eyebrow {
		margin: 0;
		font-family: var(--ht-hand);
		font-size: 1.5rem;
		color: var(--ht-terracotta);
	}
	h1 {
		margin: 0;
	}
	a {
		color: var(--offer-fg);
		text-underline-offset: 0.15em;
	}
	a:focus-visible {
		outline: 2px solid var(--offer-fg);
		outline-offset: 2px;
	}
	.preview {
		font-weight: 700;
	}
	.price {
		font-size: 1.125rem;
	}
	.price strong {
		font-family: var(--ht-display);
		font-size: 2.25rem;
		font-weight: 700;
	}
	.cta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1.5rem;
	}
	.accept {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		padding: 0 1.75rem;
		border-radius: 999px;
		background: var(--offer-accent);
		color: var(--offer-accent-fg);
		font-weight: 700;
		text-decoration: none;
		letter-spacing: 0.02em;
	}
	.engineer {
		display: flex;
		align-items: flex-start;
		gap: 1.25rem;
		padding: 1.25rem 1.5rem;
		border: 2px solid var(--ht-pale);
		border-radius: var(--offer-radius);
		background: var(--offer-surface);
	}
	.engineer p {
		margin: 0;
	}
	.face {
		flex: none;
		width: 4.5rem;
		height: 4.5rem;
		border-radius: 999px;
		object-fit: cover;
	}
	.engineer-name {
		margin: 0;
		font-size: 1.6rem;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 600;
	}
	.swatch {
		display: inline-block;
		width: 0.875rem;
		height: 0.875rem;
		margin-right: 0.4rem;
		border-radius: 999px;
		vertical-align: -0.1rem;
	}
	.tiles,
	.shop {
		display: grid;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.tile,
	.shop li {
		display: grid;
		gap: 0.5rem;
		padding: 1rem 1.25rem;
		border: 2px solid var(--ht-pale);
		border-radius: var(--offer-radius);
		background: var(--offer-surface);
	}
	.shop {
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
	}
	.shop p {
		margin: 0;
	}
	.tile p {
		margin: 0;
	}
	.tile-label {
		font-weight: 700;
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
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--offer-muted);
		white-space: nowrap;
	}
	.track {
		position: relative;
		display: block;
		height: 0.75rem;
		border-radius: 999px;
		background: var(--ht-panel);
	}
	.fill {
		display: block;
		height: 100%;
		border-radius: 999px;
	}
	.now {
		background: var(--ht-rule);
	}
	.next {
		background: var(--offer-fg);
	}
	.line {
		position: absolute;
		top: -0.25rem;
		bottom: -0.25rem;
		width: 2px;
		border-radius: 1px;
		background: var(--ht-terracotta);
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
		font-size: 0.8125rem;
		font-weight: 600;
		white-space: nowrap;
		color: var(--ht-terracotta);
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
		color: var(--offer-fg);
	}
	.filler {
		margin: 0;
		padding: 0.75rem 1rem;
		border-radius: 1rem;
		background: #e2b89f; /* Haven teal's notice fill, with the navy ink on it */
		color: var(--offer-fg);
		font-size: 0.9375rem;
	}
	.callout {
		color: var(--offer-callout);
	}
	.fine {
		margin: 0;
		font-size: 0.875rem;
		color: var(--offer-muted);
	}
	.renewal {
		max-width: 42rem;
		font-size: 0.9375rem;
		color: var(--offer-muted);
	}
</style>
