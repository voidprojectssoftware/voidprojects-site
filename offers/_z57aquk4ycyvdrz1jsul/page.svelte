<script lang="ts">
	import './theme.css';
	import { ENGINEER } from '$lib/content/websites.js';
	import figures from './figures.json';
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

	// Cormorant Garamond, the live site's heading face (brand.md), as the client's
	// "Brass and ivory" candidate ships it: one variable file, weights 300 to 700
	// (integrityrealestateservices-website src/design/systems/brass-and-ivory/fonts/,
	// SIL OFL; the licence is beside the file in public/fonts/).
	const FONT_FACES =
		'<style>' +
		`@font-face{font-family:'Cormorant Garamond';font-weight:300 700;font-style:normal;font-display:swap;src:url(${asset('fonts/cormorant-garamond-latin-wght-normal.woff2')}) format('woff2')}` +
		'</style>';

	// svelte-ignore state_referenced_locally
	let selection = $state(initialSelection(offer));

	let plan = $derived(offer.plans[0]);
	let monthly = $derived(priceFor(plan, 'month')?.amount ?? 0);
	let yearly = $derived(priceFor(plan, 'year')?.amount ?? 0);
	const money = (cents: number) => formatAmount(cents, offer.currency);
	const previewHost = $derived(new URL(offer.previewUrl).host);

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

	// A card from figures.json, which figures.mjs computes with integrityrealestateservices-
	// website's own comparison code, so each title, figure and note is the string its
	// /site-comparison/ page prints.
	interface Card {
		id: string;
		title: string;
		before: string;
		after: string;
		note: string;
	}
	const glance: Card[] = figures.glance.cards;
	const aiCards: Card[] = figures.ai.cards;

	const QR_INK = '#0a0a0a'; // the brand's black, dark on white so phones read it
</script>

{#snippet cards(list: Card[])}
	<ul class="cards">
		{#each list as card (card.id)}
			<li class="card">
				<p class="card-title">{card.title}</p>
				<dl class="pair">
					<div class="side">
						<dt>{figures.sides.before}</dt>
						<dd class="val">{card.before}</dd>
					</div>
					<div class="side">
						<dt>{figures.sides.after}</dt>
						<dd class="val after">{card.after}</dd>
					</div>
				</dl>
				<p class="fine">{card.note}</p>
			</li>
		{/each}
	</ul>
{/snippet}

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html FONT_FACES}
	<title>Website proposal for {offer.prospect} | Void Projects</title>
</svelte:head>

<header class="band">
	<p class="name">{offer.prospect}</p>
	<p class="byline">A proposal from Void Projects</p>
</header>

<main class="mx-auto grid max-w-4xl grid-cols-1 gap-14 px-4 pt-10 pb-12 sm:px-8 sm:py-16">
	<OfferGate {offer} builtAt={context.builtAt}>
		<section class="grid gap-4" aria-labelledby="offer-title">
			<p class="eyebrow">Proposal</p>
			<h1 id="offer-title" class="text-[2.5rem] min-[30rem]:text-5xl sm:text-6xl">
				A new website for {offer.prospect}
			</h1>
			<!-- The owner's framing for this client (issue #10): look and feel plus speed, pointing
			     at the preview (client #5 put the rebuilt pages on it). The look is a draft until
			     the owner picks a design (client ADR 0010); the sentence holds either way. -->
			<p class="max-w-2xl text-lg text-(--offer-muted)">
				We have built a new website for your brokerage. It is live as a preview now, so you can see
				how it looks and feels, and how quickly it opens on a phone, before you decide anything. We
				would host it, keep it secure and up to date, and make your changes.
			</p>
			<p class="links">
				<a class="preview" href={offer.previewUrl} rel="noreferrer"
					>See your new site at {previewHost}</a
				>
				<a href={figures.comparison} rel="noreferrer">Your current site and the new one, compared</a
				>
			</p>
			<p class="max-w-2xl">
				Open it on your phone first. Below are the two sites measured side by side, what we found
				about your website today, and what the plan includes.
			</p>
			<!-- OWNER: the price is offer.ts's placeholder. "Domain at cost", "no build fee" and
			     "no contract": /terms #who-owns-what and #what-you-get. -->
			<p class="price">
				<strong>{money(monthly)}</strong> a month, or {money(yearly)} a year. Your domain at cost. No
				build fee. No contract.
			</p>
			{#if offer.addOns.length}
				<p class="text-(--offer-muted)">
					Email at your own domain and a Google Business Profile, set up and looked after, are
					optional extras, priced below.
				</p>
			{/if}
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
			<div class="grid gap-2">
				<p class="eyebrow">Measured</p>
				<h2 id="offer-figures">Your website today, and the new one</h2>
				<p class="max-w-2xl text-(--offer-muted)">
					We tested your current site on {figures.measured.before} and the new one on {figures
						.measured.after}, as a phone ({figures.measured.phone}) loads them, with the same tools
					Google and accessibility reviewers use.
					{figures.glance.lead}
				</p>
			</div>
			{@render cards(glance)}

			<div class="grid gap-3">
				<h3 class="sub">What AI assistants can find out about your brokerage</h3>
				{#if figures.ai.today}<p class="max-w-2xl">{figures.ai.today}</p>{/if}
				{@render cards(aiCards)}
				{#if figures.ai.missed}<p class="fine max-w-2xl">{figures.ai.missed}</p>{/if}
			</div>

			<p>
				<a class="preview" href={figures.comparison} rel="noreferrer"
					>Every figure, page by page, on the full comparison</a
				>
			</p>
		</section>

		<ConcernsList concerns={offer.concerns} title="What we found" />

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
	/* A black band with a gold hairline under it, the name in the live site's serif and the
	   byline in spaced gold capitals, as the live site sets its labels (brand.md). */
	.band {
		padding: 1.5rem 1rem 1.25rem;
		background: var(--ires-band);
		border-bottom: 1px solid var(--ires-gold);
		text-align: center;
	}
	.name {
		margin: 0;
		font-family: var(--ires-display);
		font-size: clamp(2.25rem, 6vw + 1rem, 4.5rem);
		font-weight: 600;
		line-height: 1.05;
		letter-spacing: -0.005em;
	}
	.byline,
	.eyebrow {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--ires-gold);
	}
	.byline {
		margin-top: 0.5rem;
		color: var(--offer-muted);
	}
	h1 {
		margin: 0;
	}
	a {
		color: var(--ires-gold);
		text-underline-offset: 0.15em;
	}
	a:focus-visible {
		outline: 2px solid var(--ires-gold);
		outline-offset: 3px;
	}
	.preview {
		font-weight: 700;
		font-size: 1.125rem;
	}
	.price {
		font-size: 1.125rem;
	}
	.price strong {
		font-family: var(--ires-display);
		font-size: 2.5rem;
		font-weight: 600;
		color: var(--ires-gold);
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
		background: var(--ires-gold);
		color: var(--ires-black);
		font-weight: 700;
		text-decoration: none;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-size: 0.9375rem;
	}
	.engineer {
		display: flex;
		align-items: flex-start;
		gap: 1.25rem;
		padding: 1.25rem 1.5rem;
		border: 1px solid var(--offer-border);
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
		font-size: 2rem;
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.5rem;
	}
	.sub {
		margin: 0.5rem 0 0;
		font-family: var(--ires-display);
		font-size: 1.625rem;
		font-weight: 600;
		line-height: 1.15;
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(18rem, 100%), 1fr));
		gap: 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.card {
		display: grid;
		align-content: start;
		gap: 0.75rem;
		padding: 1.125rem 1.25rem;
		border: 1px solid var(--offer-border);
		border-radius: var(--offer-radius);
		background: var(--offer-surface);
	}
	.card-title {
		margin: 0;
		font-size: 1.0625rem;
		font-weight: 700;
		line-height: 1.3;
	}
	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin: 0;
	}
	.side {
		display: grid;
		align-content: start;
		gap: 0.25rem;
	}
	.side dt {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--offer-muted);
	}
	.val {
		margin: 0;
		font-family: var(--ires-display);
		font-size: 2.25rem;
		font-weight: 600;
		line-height: 1.05;
		font-variant-numeric: tabular-nums;
		white-space: nowrap; /* "4,034 KB" and "82.7 of 92" stay on one line; the 18rem cards leave room */
	}
	.val.after {
		color: var(--ires-gold);
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
