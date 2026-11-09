<script lang="ts">
	import './theme.css';
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

	// Syne, the live site's heading face and the one the rebuild's chosen "Field record"
	// system sets in capitals, as that system ships it: one variable file, weights 400 to 800
	// (dronex92-website src/design/systems/field-record/fonts/, SIL OFL; the licence is
	// beside the file in public/fonts/).
	const FONT_FACES =
		'<style>' +
		`@font-face{font-family:'Syne';font-weight:400 800;font-style:normal;font-display:swap;src:url(${asset('fonts/syne-latin-wght-normal.woff2')}) format('woff2')}` +
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

	const QR_INK = '#000000'; // the brand's black (brand.md --black-hsl), dark on white so phones read it
</script>

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
			<!-- The preview carries every page, drawn in "Field record" (client PR #19; client
			     src/theme/choice.ts: the owner's choice, 2026-11-09), which keeps the live beige,
			     black and Syne and leads with the photographs. -->
			<p class="max-w-2xl text-lg text-(--offer-muted)">
				We have built a new website for Dronex, led by your aerial photographs and kept in the
				beige, black and lettering you already use. It is live as a preview now, so you can see how
				it looks and how quickly it opens on a phone before you decide anything. We would host it,
				keep it secure and up to date, and make your changes.
			</p>
			<p class="links">
				<a class="preview" href={offer.previewUrl} rel="noreferrer"
					>See your new site at {previewHost}</a
				>
				<!-- Part 2 (dronex92-website issue #10, after client #7 part 2): a second link here
				     to {previewUrl}/site-comparison/, and the figures section below. -->
			</p>
			<p class="max-w-2xl">
				Open it on your phone first. Below is what we found about your website today, and what the
				plan includes.
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

		<!-- Part 2: the "Measured" figures section goes here, from figures.json, as in
		     offers/orebabrmoseow8vsknfk/page.svelte. -->

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
		class="flex flex-wrap items-center justify-between gap-3 border-t-2 border-(--offer-border) pt-6 text-sm text-(--offer-muted)"
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
	/* A black band, as Field record paints its footer and the live site its logo tiles, the
	   name in Syne capitals in beige, the byline in spaced Syne capitals in the cool grey, as
	   the system sets its labels (dronex92-website src/design/systems/field-record/index.ts). */
	.band {
		padding: 1.5rem 1rem 1.25rem;
		background: var(--dx-black);
		color: var(--dx-beige);
		text-align: center;
	}
	.name {
		margin: 0;
		font-family: var(--dx-display);
		font-size: clamp(2.25rem, 6vw + 1rem, 4.5rem);
		font-weight: 700;
		text-transform: uppercase;
		line-height: 1.05;
		letter-spacing: 0.01em;
	}
	.byline,
	.eyebrow {
		margin: 0;
		font-family: var(--dx-display);
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--dx-olive);
	}
	.byline {
		margin-top: 0.5rem;
		color: var(--dx-grey);
	}
	h1 {
		margin: 0;
	}
	a {
		color: var(--dx-black);
		text-underline-offset: 0.15em;
	}
	a:focus-visible {
		outline: 3px solid var(--dx-black);
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
		font-family: var(--dx-display);
		font-size: 2.5rem;
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
		background: var(--dx-black);
		color: var(--dx-white);
		font-family: var(--dx-display);
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
	.renewal {
		max-width: 42rem;
		font-size: 0.9375rem;
		color: var(--offer-muted);
	}
</style>
