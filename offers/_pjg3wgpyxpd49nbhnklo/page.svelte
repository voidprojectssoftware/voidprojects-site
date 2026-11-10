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

	// Fredoka, The Livery's one face, as the client's system ships it: one variable file,
	// weights 300 to 700 (auntmimiscakepops-website src/design/systems/livery/fonts/, SIL
	// OFL; the licence is beside the file in public/fonts/).
	const FONT_FACES =
		'<style>' +
		`@font-face{font-family:'Fredoka';font-weight:300 700;font-style:normal;font-display:swap;src:url(${asset('fonts/fredoka-latin-wght-normal.woff2')}) format('woff2')}` +
		'</style>';

	// The icing drip, drawn as the client's own src/lib/candy.ts `dripPath` draws it (main
	// 887a54f, ADR 0015 decision 2): a band along the top with rounded tongues hanging from
	// it, from a fixed seed so every build draws the same shape. Our own SVG, never traced
	// from the truck's wrap (client ADR 0010 decision 4).
	function random(start: number) {
		let a = start >>> 0;
		return () => {
			a = (a + 0x6d2b79f5) >>> 0;
			let t = a;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	function dripPath(seed: number, band: number, aspect: number): string {
		const next = random(seed);
		const width = aspect * 100;
		const height = 100;
		const parts: string[] = [`M0 0 H${width} V${band}`];
		let x = width;
		while (x > 0) {
			const gap = 18 + next() * 40;
			const w = 16 + next() * 22;
			const depth = band + 14 + next() * (height - band - 22);
			const right = x - gap;
			const left = right - w * 2;
			if (left < 0) break;
			const cx = (right + left) / 2;
			parts.push(
				`Q${((x + right) / 2).toFixed(1)} ${band + 6} ${right.toFixed(1)} ${band}`,
				`C${right.toFixed(1)} ${(depth - w * 0.4).toFixed(1)} ${(right - w * 0.15).toFixed(1)} ${depth.toFixed(1)} ${cx.toFixed(1)} ${depth.toFixed(1)}`,
				`C${(left + w * 0.15).toFixed(1)} ${depth.toFixed(1)} ${left.toFixed(1)} ${(depth - w * 0.4).toFixed(1)} ${left.toFixed(1)} ${band}`
			);
			x = left;
		}
		parts.push(`Q${(x / 2).toFixed(1)} ${band + 6} 0 ${band} Z`);
		return parts.join(' ');
	}
	const DRIP_ASPECT = 12;
	const drip = dripPath(11, 22, DRIP_ASPECT);

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

	// A card from figures.json, which figures.mjs computes from the client's committed
	// before-side runs (client ADR 0012). `after` is null on every card until client #7
	// part 2 measures the launch build; the card then shows both sides.
	interface Card {
		id: string;
		title: string;
		before: string;
		after: string | null;
		note: string;
	}
	const cards: Card[] = figures.cards;
	// TODO(client #7 part 2): figures.comparison is null until the client's /site-comparison/
	// page exists; the link to it appears by itself once figures.mjs fills it.
	const comparison: string | null = figures.comparison;

	const QR_INK = '#2a1631'; // the plum ink, dark on white so phones read it
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html FONT_FACES}
	<title>A website for {offer.prospect} | Void Projects</title>
</svelte:head>

<header class="trim">
	<p class="name">{offer.prospect}</p>
	<p class="byline">A proposal from Void Projects</p>
</header>

<OfferGate {offer} builtAt={context.builtAt}>
	<section class="hero" aria-labelledby="offer-title">
		<svg
			class="drip"
			viewBox="0 0 {DRIP_ASPECT * 100} 100"
			preserveAspectRatio="none"
			aria-hidden="true"
			focusable="false"><path d={drip} /></svg
		>
		<div class="mx-auto grid max-w-4xl gap-4 px-4 pb-12 sm:px-8 sm:pb-16">
			<h1 id="offer-title" class="text-[2.5rem] min-[30rem]:text-5xl sm:text-6xl">
				Your first website
			</h1>
			<!-- OWNER: the preview has no Pages project yet (client #8, an owner gate), so the
			     link below does not resolve until it is created. -->
			<p class="max-w-2xl text-lg">
				We have built a website for your shop and your truck, in the truck’s own lime, pink and
				plum. It is ready as a preview, so you can see it on your phone before you decide anything.
				We would host it, keep it safe and up to date, and make your changes.
			</p>
			<p class="links">
				<a class="preview" href={offer.previewUrl} rel="noreferrer"
					>See your new site at {previewHost}</a
				>
				{#if comparison}<a href={comparison} rel="noreferrer">Today and the new site, compared</a
					>{/if}
			</p>
			<!-- OWNER: the price is offer.ts's placeholder. "No build fee" and "no contract":
			     /terms #what-you-get; the domain line: /terms #who-owns-what. -->
			<p class="price">
				<strong>{money(monthly)}</strong> a month, or {money(yearly)} a year. No build fee. No contract.
			</p>
			{#if offer.addOns.length}
				<p class="extras">
					A web address of your own, email at it, and your Google listing looked after are optional
					extras, priced below.
				</p>
			{/if}
			<p class="cta">
				<a class="accept" href="#offer-plans" onclick={toPlans}>Accept offer</a>
				<a href="mailto:{ENGINEER.email}">Questions? Email {ENGINEER.name.split(' ')[0]}</a>
			</p>
		</div>
	</section>

	<main class="mx-auto grid max-w-4xl grid-cols-1 gap-14 px-4 pt-12 pb-12 sm:px-8 sm:py-16">
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
				<h2 id="offer-engineer" class="engineer-name">{ENGINEER.name}, your engineer</h2>
				<p>
					{ENGINEER.name.split(' ')[0]} built your new site and is your contact for anything you need.
					When you write to us, a person answers.
				</p>
				<p class="text-sm"><a href="mailto:{ENGINEER.email}">{ENGINEER.email}</a></p>
			</div>
		</section>

		<section class="grid gap-6" aria-labelledby="offer-figures">
			<div class="grid gap-2">
				<h2 id="offer-figures">What a customer can find out about you today</h2>
				<p class="max-w-2xl text-(--offer-muted)">
					You have no website, so there is no site to score. Instead we measured what a search, an
					AI assistant and your own pages tell someone about you right now. We read your Facebook,
					Instagram and Google pages on {formatDate(figures.measured.presence)} and asked the assistants
					on {formatDate(figures.measured.assistants)}, counting against {figures.measured.facts} things
					a customer might want to know: your address and phone, what you sell, your flavors and prices,
					the truck and how to order.
				</p>
			</div>
			<ul class="cards">
				{#each cards as card (card.id)}
					<li class="card">
						<p class="card-title">{card.title}</p>
						<dl class="pair" class:single={card.after === null}>
							<div class="side">
								<dt>{figures.sides.before}</dt>
								<dd class="val">{card.before}</dd>
							</div>
							{#if card.after !== null}
								<div class="side">
									<dt>{figures.sides.after}</dt>
									<dd class="val after">{card.after}</dd>
								</div>
							{/if}
						</dl>
						<p class="fine">{card.note}</p>
					</li>
				{/each}
			</ul>
			{#if comparison}
				<p>
					<a class="preview" href={comparison} rel="noreferrer"
						>Every figure, and how we measured it, on the full comparison</a
					>
				</p>
			{/if}
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
</OfferGate>

<style>
	/* The plum trim along the top of the truck's box, the name on it in the warm white. */
	.trim {
		padding: 1.5rem 1rem 1.25rem;
		background: var(--mimi-ink);
		color: var(--mimi-on-plum);
		text-align: center;
	}
	.name {
		margin: 0;
		font-size: clamp(2rem, 5vw + 1rem, 4rem);
		font-weight: 650;
		line-height: 1.05;
		letter-spacing: -0.01em;
	}
	.byline {
		margin: 0.5rem 0 0;
		color: var(--mimi-on-plum-muted);
	}
	/* One pink drip hangs from the trim into the lime, the only lime on the page, and every
	   word on the lime is plum (ADR 0010 in the client repo: "Text on lime is dark plum"). */
	.hero {
		background: var(--mimi-lime);
		color: var(--mimi-ink);
	}
	.drip {
		display: block;
		width: 100%;
		height: clamp(3rem, 7vw, 5.5rem);
		margin-bottom: 0.5rem;
		fill: var(--mimi-drip);
	}
	.hero a {
		color: var(--mimi-ink);
	}
	.hero a:focus-visible {
		outline: 2px solid var(--mimi-ink);
		outline-offset: 3px;
	}
	h1 {
		margin: 0;
	}
	a:focus-visible {
		outline: 2px solid var(--mimi-pink);
		outline-offset: 3px;
	}
	.preview {
		font-weight: 600;
		font-size: 1.125rem;
	}
	.price {
		font-size: 1.125rem;
	}
	.price strong {
		font-size: 2.5rem;
		font-weight: 650;
	}
	.extras {
		max-width: 42rem;
		color: var(--mimi-on-lime-muted);
	}
	.cta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1.5rem;
	}
	.hero .accept {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		padding: 0 1.75rem;
		border-radius: 999px;
		background: var(--mimi-ink);
		color: var(--mimi-on-plum);
		font-weight: 600;
		text-decoration: none;
	}
	.engineer {
		display: flex;
		align-items: flex-start;
		gap: 1.25rem;
		padding: 1.25rem 1.5rem;
		border: 2px solid var(--offer-border);
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
		font-size: 1.75rem;
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.5rem;
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
		border: 2px solid var(--offer-border);
		border-radius: var(--offer-radius);
		background: var(--offer-surface);
		box-shadow: 0 0.75rem 2rem -1rem rgb(42 22 49 / 0.35);
	}
	.card-title {
		margin: 0;
		font-size: 1.0625rem;
		font-weight: 600;
		line-height: 1.3;
	}
	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin: 0;
	}
	.pair.single {
		grid-template-columns: 1fr;
	}
	.side {
		display: grid;
		align-content: start;
		gap: 0.25rem;
	}
	.side dt {
		font-size: 0.9375rem;
		color: var(--offer-muted);
	}
	.val {
		margin: 0;
		font-size: 2.25rem;
		font-weight: 650;
		line-height: 1.05;
		font-variant-numeric: tabular-nums;
		white-space: nowrap; /* "6.3 of 34" stays on one line; the 18rem cards leave room */
	}
	.val.after {
		color: var(--mimi-pink);
	}
	.fine {
		margin: 0;
		font-size: 0.9375rem;
		color: var(--offer-muted);
	}
	.renewal {
		max-width: 42rem;
		font-size: 0.9375rem;
		color: var(--offer-muted);
	}
</style>
