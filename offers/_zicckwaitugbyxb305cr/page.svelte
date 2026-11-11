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

	// Bevan, the face of Murphy's Storefront design (murphysmemphis-website
	// src/assets/fonts/, its printable ASCII subset, SIL OFL; the licence is beside the file
	// in public/fonts/).
	const FONT_FACES = `<style>@font-face{font-family:'Bevan';font-weight:400;font-style:normal;font-display:swap;src:url(${asset('fonts/bevan-subset-400-normal.woff2')}) format('woff2')}</style>`;

	// svelte-ignore state_referenced_locally
	let selection = $state(initialSelection(offer));

	let plan = $derived(offer.plans[0]);
	let monthly = $derived(priceFor(plan, 'month')?.amount ?? 0);
	let yearly = $derived(priceFor(plan, 'year')?.amount ?? 0);
	const money = (cents: number) => formatAmount(cents, offer.currency);
	const previewHost = $derived(new URL(offer.previewUrl).host);

	// The hero's "Accept offer" jumps to the plan picker and moves focus to its heading.
	// Without JavaScript it is a plain anchor link.
	function toPlans(e: MouseEvent) {
		const heading = document.getElementById('offer-plans');
		if (!heading) return;
		e.preventDefault();
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		heading.setAttribute('tabindex', '-1');
		heading.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
		heading.focus({ preventScroll: true });
	}

	// Cards from figures.json, which figures.mjs computes with murphysmemphis-website's own
	// comparison code: each value and note is the string its /site-comparison/ prints. The
	// order is this page's. The phone speed score, where the Wix site is ahead, is shown
	// with that page's explanation, last rather than first.
	interface Card {
		title: string;
		before: string;
		after: string;
		note: string;
	}
	const g = figures.glance.cards;
	const glance: Card[] = [g.lcp, g.weight, g.requests, g.seo, g.axe, g.performance];
	const aiCards: Card[] = figures.ai.cards;

	const QR_INK = '#20393a'; // the boards' teal, dark on white so phones read it
</script>

{#snippet cards(list: Card[])}
	<ul class="cards">
		{#each list as card (card.title)}
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

<header class="sign">
	<div class="board">
		<p class="name">{offer.prospect}</p>
	</div>
	<div class="band">
		<p>A proposal from Void Projects</p>
	</div>
</header>

<main class="mx-auto grid max-w-4xl grid-cols-1 gap-14 px-4 pt-10 pb-12 sm:px-8 sm:py-16">
	<OfferGate {offer} builtAt={context.builtAt}>
		<section class="grid gap-4" aria-labelledby="offer-title">
			<p class="eyebrow">Proposal</p>
			<h1 id="offer-title" class="text-[2rem] min-[30rem]:text-[2.75rem] sm:text-5xl">
				A new website for {offer.prospect}
			</h1>
			<p class="max-w-2xl text-lg text-(--offer-muted)">
				We have built a new website for the bar. It is online as a preview now, so you can look
				through it before you decide anything. We would host it, keep it secure and up to date, and
				make your changes. Below is what we found about the bar’s web presence today, and what the
				plan includes.
			</p>
			<p class="links">
				<a class="preview" href={offer.previewUrl} rel="noreferrer"
					>See your new site at {previewHost}</a
				>
				<a href={figures.comparison} rel="noreferrer">Your Wix site and the new one, compared</a>
			</p>
			<!-- The price is offer.ts's. "Domain at cost", "no build fee" and "no contract":
			     /terms #who-owns-what and #what-you-get. -->
			<p class="price">
				<strong>{money(monthly)}</strong> a month, or {money(yearly)} a year. Your domain at cost. No
				build fee. No contract.
			</p>
			{#if offer.addOns.length}
				<p class="max-w-2xl text-(--offer-muted)">
					Looking after your Google listing and other listings, posting your shows, email at your
					own domain and answering reviews are optional extras, priced below.
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
				<h2 id="offer-figures">Your Wix site, and the new one</h2>
				<p class="max-w-2xl text-(--offer-muted)">
					We ran the same tests on both, on {figures.measured.after}, as a phone loads them. {figures
						.glance.lead}
				</p>
			</div>
			{@render cards(glance)}

			<div class="grid gap-3">
				<h3 class="sub">What AI assistants can read about the bar</h3>
				<p class="max-w-2xl text-(--offer-muted)">{figures.ai.lead}</p>
				{@render cards(aiCards)}
				<p class="fine max-w-2xl">{figures.ai.geoctl}</p>
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
	/* The board over the door in the boards' teal with the name in cream, and a mustard
	   plaster band under it, from the Storefront design. */
	.sign {
		text-align: center;
	}
	.board {
		padding: 1.25rem 1rem;
		background: var(--m-board);
		border-bottom: 4px solid var(--m-sign-teal);
		color: var(--m-cream);
	}
	.name {
		margin: 0;
		font-family: var(--m-display);
		font-size: clamp(2.25rem, 6vw + 1rem, 4rem);
		line-height: 1.1;
		letter-spacing: 0.02em;
	}
	.band {
		padding: 0.45rem 1rem;
		background: var(--m-plaster);
		color: var(--m-board);
	}
	.band p {
		margin: 0;
		font-family: var(--m-display);
		font-size: 1rem;
		letter-spacing: 0.03em;
	}
	.eyebrow {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--m-deep-teal);
	}
	h1 {
		margin: 0;
	}
	a {
		color: var(--m-deep-teal);
		text-underline-offset: 0.15em;
	}
	a:focus-visible {
		outline: 2px solid var(--m-board);
		outline-offset: 2px;
	}
	.preview {
		font-weight: 700;
	}
	.price {
		font-size: 1.125rem;
	}
	.price strong {
		font-family: var(--m-display);
		font-size: 2.25rem;
		font-weight: 400;
		color: var(--m-deep-teal);
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
		padding: 0 1.5rem;
		border-radius: var(--offer-radius);
		background: var(--m-deep-teal);
		color: #fff;
		font-family: var(--m-display);
		font-size: 1.125rem;
		text-decoration: none;
	}
	.engineer {
		display: flex;
		align-items: flex-start;
		gap: 1.25rem;
		padding: 1.25rem 1.5rem;
		border: 1px solid var(--offer-border);
		border-top: 5px solid var(--m-plaster);
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
		font-size: 1.5rem;
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.5rem;
	}
	.sub {
		margin: 0.5rem 0 0;
		font-family: var(--m-display);
		font-size: 1.375rem;
		font-weight: 400;
		line-height: 1.2;
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
		gap: 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.card {
		display: grid;
		align-content: start;
		gap: 0.75rem;
		padding: 1rem 1.125rem;
		border: 1px solid var(--offer-border);
		border-top: 5px solid var(--m-sign-teal);
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
		font-family: var(--m-display);
		font-size: 1.625rem;
		line-height: 1.1;
		font-variant-numeric: tabular-nums;
	}
	.val.after {
		color: var(--m-deep-teal);
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
