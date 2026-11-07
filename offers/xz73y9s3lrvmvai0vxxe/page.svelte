<script lang="ts">
	import './theme.css';
	import { onMount } from 'svelte';
	import { generateMarkSvg } from '$lib/brand/mark.js';
	import { TRAJECTORIES } from '$lib/trajectory/source.js';
	import { ENGINEER } from '$lib/content/websites.js';
	import {
		AcceptedPlan,
		AcceptedState,
		ConcernsList,
		OfferGate,
		PlanPicker,
		QrCode,
		SignUpButton,
		initialSelection
	} from '$lib/offers/blocks/index.js';
	import { acceptedPlan, formatAmount, formatDate, priceFor } from '$lib/offers/offer.js';
	import type { OfferPageProps } from '$lib/offers/page.js';

	let { offer, context }: OfferPageProps = $props();

	// Files from offers/<id>/public/, by path from the page's own URL (a prop), so the
	// offer id is in the HTML but never in the page script.
	const asset = (path: string) => new URL(path, context.url).pathname;

	// Light by default, as her site is; dark is remembered in localStorage when the
	// visitor picks it. THEME_SCRIPT runs in the head before first paint, so nobody sees
	// a flash of the other theme. Without JavaScript the page shows the light tokens.
	const THEME_KEY = 'didonna-offer-theme';
	const THEME_SCRIPT =
		`<script>try{if(localStorage.getItem('${THEME_KEY}')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}</` +
		'script>';
	let dark = $state(false);
	function toggleTheme() {
		dark = !dark;
		document.documentElement.dataset.theme = dark ? 'dark' : 'light';
		try {
			if (dark) localStorage.setItem(THEME_KEY, 'dark');
			else localStorage.removeItem(THEME_KEY);
		} catch {
			// storage blocked: the choice lasts for this visit only
		}
	}

	// After mount the header mark switches to a fresh one from the site's /api/mark.svg
	// endpoint, a random seed per page load, as the site header rolls a new mark each
	// visit. The fixed-seed mark below stays for no-JS visitors.
	let markSrc = $state('');
	onMount(() => {
		dark = document.documentElement.dataset.theme === 'dark';
		const seed = Math.floor(Math.random() * 0x7fffffff);
		markSrc = new URL(`/api/mark.svg?seed=${seed}`, context.url).href;
	});

	// The site's orbit mark with the favicon's fixed seed (src/routes/favicon.svg), drawn
	// on the server only so the trajectory table never ships in the page script. The
	// client reads the server's markup back before hydrating, so {@html} matches.
	const FAVICON_SEED = 42;
	const voidMark = import.meta.env.SSR
		? generateMarkSvg(TRAJECTORIES, FAVICON_SEED, __BRAND_PRIMARY__)
		: (document.querySelector('[data-void-mark] svg')?.outerHTML ?? '');

	// QR modules in her deepest magenta (primary 12) on white, the same in both themes:
	// dark on light, with the block's 4-module quiet zone, so phones read it easily.
	const QR_INK = '#47001d';

	// The hero's "Accept offer" jumps to the plan picker, since monthly or annual is
	// chosen there first; it moves focus to that section's heading for keyboard and
	// screen reader users. Without JavaScript it is a plain anchor link.
	function toPlans(e: MouseEvent) {
		const heading = document.getElementById('offer-plans');
		if (!heading) return;
		e.preventDefault();
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		heading.setAttribute('tabindex', '-1');
		heading.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
		heading.focus({ preventScroll: true });
	}

	// svelte-ignore state_referenced_locally
	let selection = $state(initialSelection(offer));

	// Once accepted (offer.ts `accepted`), the sign-up parts give way to the accepted
	// plan and a billing link; the rest stays as the record of what was proposed.
	let accepted = $derived(acceptedPlan(offer));
	const firstName = ENGINEER.name.split(' ')[0];

	let plan = $derived(offer.plans[0]);
	let monthly = $derived(priceFor(plan, 'month')?.amount ?? 0);
	let yearly = $derived(priceFor(plan, 'year')?.amount ?? 0);
	const money = (cents: number) => formatAmount(cents, offer.currency);
	// svelte-ignore state_referenced_locally
	const host = new URL(offer.previewUrl).host;

	// What she already has, each read from the didonnastudio-website repo at origin/main
	// 2af0fe7: the salon menu and booking link (src/config/services.ts, site.booking),
	// hours, address and the drawn street map (site.openingHours, site.location,
	// StudioMap.astro), her profile verbatim (site.bio, confirmed, #184), /trainer/ and
	// a page per course (unlisted at Elleebana's request, src/routes.ts, #31, #338),
	// /classes/ (src/config/classes.ts), /questions/ (ADR 0035) and the domain
	// (docs/process/deploying.md). Nothing here describes her practice.
	const ALREADY = [
		{
			title: 'Your salon menu and prices',
			detail: 'Every service from your Booksy listing, with its price and how long it takes.'
		},
		{
			title: 'Booking from every page',
			detail: '“Book an appointment” goes straight to your Booksy page.'
		},
		{
			title: 'How to find you',
			detail: 'Your hours, address and directions, over a map of the streets around the studio.'
		},
		{
			title: 'Your story, in your words',
			detail: 'The profile you wrote, exactly as you wrote it.'
		},
		{
			title: 'Your Elleebana trainer pages',
			detail:
				'A trainer page and a page for each course, kept hidden until Elleebana sign you off, as they asked.'
		},
		{
			title: 'Your own classes',
			detail: 'A page for the classes you teach under your own name.'
		},
		{
			title: 'A questions page for you',
			detail: 'Details we need from you, answered by tapping instead of typing.'
		},
		{
			title: 'Your own address',
			detail: 'didonnastudio.com, live now.'
		}
	];

	// Restates the concerns in offer.ts and the list above, line for line.
	const BEFORE = [
		'Your menu and prices only on Booksy and Facebook',
		'No website at an address of your own',
		'Nowhere for Elleebana to see your training'
	];
	const NOW = [
		'Your menu, prices and booking on your own site',
		'didonnastudio.com, built for search engines to read',
		'Trainer and course pages waiting for Elleebana’s sign-off'
	];

	// From the published terms (/terms): hosting, security updates, routine upkeep and
	// small changes are #what-you-get; pricing new features first is #adding-features.
	const COVERS = [
		{ title: 'Hosting', detail: `Your site, served on ${host}.` },
		{ title: 'Security updates', detail: 'Fixes applied as soon as they come out.' },
		{ title: 'Watching your site', detail: 'If something breaks, we notice and deal with it.' },
		{
			title: 'Changes when you need them',
			detail: 'Text, photos, hours and prices, at no extra charge.'
		},
		{
			title: 'New features, priced first',
			detail: 'Anything bigger, we agree the new plan price with you before we start.'
		}
	];
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html THEME_SCRIPT}
	<title>Hosting {accepted ? 'plan' : 'proposal'} for {offer.prospect} | Void Projects</title>
</svelte:head>

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

<header class="top px-4 pt-3 sm:px-8 sm:pt-5">
	<div class="lockup">
		<span class="void">
			<span class="mark" data-void-mark aria-hidden="true">
				{#if markSrc}
					<img src={markSrc} alt="" width="36" height="36" />
				{:else}
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html voidMark}
				{/if}
			</span>
			<span>Void Projects</span>
		</span>
		<span class="client"><span class="plus" aria-hidden="true">+</span>{offer.prospect}</span>
	</div>
	<button type="button" class="theme" aria-pressed={dark} onclick={toggleTheme}>
		<span class="sr-only">Dark theme</span>
		<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
			{#if dark}
				<circle cx="12" cy="12" r="4.5" />
				<path
					d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"
				/>
			{:else}
				<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
			{/if}
		</svg>
	</button>
</header>

<main class="mx-auto grid max-w-4xl grid-cols-1 gap-14 px-4 pt-6 pb-12 sm:px-8 sm:py-16">
	<OfferGate {offer} builtAt={context.builtAt}>
		<section class="hero grid gap-4" aria-labelledby="offer-title">
			<p class="eyebrow">{accepted ? 'Your hosting plan' : 'Proposal'}</p>
			<h1 id="offer-title" class="text-[2rem] leading-tight min-[30rem]:text-4xl sm:text-5xl">
				{accepted
					? 'Hosting and upkeep for your website'
					: 'Hosting and upkeep proposal for your website'}
			</h1>
			{#if accepted}
				<p class="lead max-w-2xl text-lg text-(--offer-muted)">
					Angela, thank you for choosing Void Projects. We will host, secure and look after
					{host}. Below is the proposal you accepted, kept for your records.
				</p>
				<AcceptedState
					class="status"
					{offer}
					portalUrl={context.billingPortalUrl}
					planLabel="Your site"
				>
					{#snippet actions()}
						<a class="ask" href="mailto:{ENGINEER.email}">Questions? Email {firstName}</a>
					{/snippet}
				</AcceptedState>
			{:else}
				<p class="lead max-w-2xl text-lg text-(--offer-muted)">
					Angela, your website is built and already live at {host}. We propose to host, secure and
					look after it from here, and to make your changes whenever you need them. Below is what
					you have today and what the plan covers. Accept the offer when you are ready, or reply
					with any questions.
				</p>
				<p class="price">
					<strong>{money(monthly)}</strong> a month, or {money(yearly)} a year
				</p>
				<p class="cta">
					<a class="accept" href="#offer-plans" onclick={toPlans}>Accept offer</a>
					<a href="mailto:{ENGINEER.email}">Questions? Email {firstName}</a>
				</p>
			{/if}
		</section>

		<section class="engineer" aria-labelledby="offer-engineer">
			<img
				class="face"
				src={asset('engineer.webp')}
				alt={ENGINEER.name}
				width="112"
				height="112"
				decoding="async"
			/>
			<div class="grid gap-1.5">
				<p class="eyebrow">Your engineer</p>
				<h2 id="offer-engineer" class="engineer-name">
					{ENGINEER.name}<span>{ENGINEER.role}, Void Projects</span>
				</h2>
				<p>
					<strong class="callout"
						>{firstName} built {host} and is your contact for anything you need.</strong
					>
				</p>
				<p class="promise">
					<span class="badge">Always a human, never a bot</span>
					When you write to us, {firstName} answers. AI agents do the upkeep in the background. Every
					conversation is with a person.
				</p>
				<p class="links flex flex-wrap gap-x-5 text-sm">
					<a href="mailto:{ENGINEER.email}">{ENGINEER.email}</a>
					<a href={ENGINEER.linkedin} rel="noreferrer">LinkedIn</a>
				</p>
			</div>
		</section>

		<section class="site grid grid-cols-1 gap-6" aria-labelledby="offer-site">
			<div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
				<h2 id="offer-site" class="site-name">Your website, already live</h2>
				<div class="links flex flex-wrap items-center gap-x-5 text-sm font-semibold">
					<a href={offer.previewUrl} rel="noreferrer">Open {host}</a>
				</div>
			</div>

			<a class="preview" href={offer.previewUrl} rel="noreferrer">
				<span class="frame">
					<span class="chrome" aria-hidden="true">
						<span class="dots"><span></span><span></span><span></span></span>
						<span class="host">{host}</span>
						<span class="spacer"></span>
					</span>
					<img
						src={asset('shots/didonna-desktop-1280.webp')}
						srcset="{asset('shots/didonna-desktop-640.webp')} 640w, {asset(
							'shots/didonna-desktop-1280.webp'
						)} 1280w"
						sizes="(min-width: 56rem) 760px, calc(100vw - 5rem)"
						alt="The Di Donna Studio home page on a computer"
						width="1280"
						height="800"
						loading="lazy"
						decoding="async"
					/>
				</span>
				<span class="phone">
					<img
						src={asset('shots/didonna-phone.webp')}
						alt="The Di Donna Studio home page on a phone"
						width="300"
						height="503"
						loading="lazy"
						decoding="async"
					/>
				</span>
			</a>

			<div class="grid gap-3">
				<h3 class="text-lg font-semibold">What is already built</h3>
				<ul class="items">
					{#each ALREADY as item (item.title)}
						<li>
							{@render icon('yes')}
							<div>
								<p class="font-semibold">{item.title}</p>
								<p class="text-(--offer-muted)">{item.detail}</p>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		</section>

		<ConcernsList concerns={offer.concerns} title="Before you had a site of your own" />

		<section class="grid gap-4" aria-labelledby="offer-choice">
			<h2 id="offer-choice">The difference for your business</h2>
			<div class="choice grid gap-4 sm:grid-cols-2">
				<div class="stay">
					<h3>Before</h3>
					<ul>
						{#each BEFORE as line (line)}<li>{@render icon('no')}<span>{line}</span></li>{/each}
					</ul>
				</div>
				<div class="move">
					<h3>Now</h3>
					<ul>
						{#each NOW as line (line)}<li>{@render icon('yes')}<span>{line}</span></li>{/each}
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

		{#if accepted}
			<AcceptedPlan {offer} title="What your plan includes" />
		{:else}
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
				<p class="renewal">
					Your plan renews automatically each month, or each year on the annual plan, until you
					cancel. Cancel any time from your billing page. Your site stays up until the end of the
					period you paid for, and we email you a reminder before each annual renewal.
				</p>
			</section>
		{/if}
	</OfferGate>

	<footer
		class="flex flex-wrap items-center justify-between gap-3 border-t border-(--offer-border) pt-6 text-sm text-(--offer-muted)"
	>
		{#if accepted}
			<p>Proposal sent {formatDate(offer.sent)}, accepted {formatDate(accepted.on)}.</p>
		{:else}
			<p>Offer open through {formatDate(offer.expires)}.</p>
		{/if}
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
	/* Phones: the lockup takes the full width and the theme toggle sits on its own row
	   under it; side by side from 40rem. */
	.top {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		max-width: 56rem;
		margin: 0 auto;
	}
	.theme {
		display: grid;
		place-items: center;
		flex: none;
		width: 2.75rem;
		height: 2.75rem;
		border: 1px solid var(--offer-border);
		border-radius: 999px;
		background: var(--offer-surface);
		color: var(--offer-fg);
		cursor: pointer;
	}
	.theme:focus-visible,
	.preview:focus-visible,
	.accept:focus-visible {
		outline: 2px solid var(--dd-accent-text);
		outline-offset: 2px;
	}
	.theme svg {
		fill: none;
		stroke: currentColor;
		stroke-width: 1.75;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.lockup {
		align-self: stretch;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.375rem 0.625rem;
		padding: 0.5rem 1.125rem;
		border: 1px solid var(--offer-border);
		border-radius: 1.25rem;
		background: var(--offer-surface);
		color: var(--offer-fg);
	}
	.void,
	.client {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		white-space: nowrap;
	}
	/* Her name set in type, as her own site's header sets it: no logo file is committed
	   in her repo (its favicon says it is provisional, pending a vector, #16 there). */
	.client {
		font-size: 1.125rem;
		letter-spacing: -0.02em;
	}
	.mark {
		display: block;
		width: 26px;
		height: 26px;
	}
	.mark :global(svg),
	.mark img {
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
	.callout {
		font-weight: 600;
		color: var(--offer-callout);
	}

	.engineer {
		display: flex;
		align-items: flex-start;
		gap: 1.25rem;
		padding: 1.25rem 1.5rem;
		border: 1px solid var(--offer-border);
		border-radius: 1.5rem;
		background: var(--offer-surface);
	}
	@media (max-width: 29.99rem) {
		.engineer {
			flex-direction: column;
			gap: 0.75rem;
			padding: 1.25rem;
		}
	}
	.face {
		flex: none;
		width: 4.5rem;
		height: 4.5rem;
		border-radius: 999px;
		object-fit: cover;
		box-shadow: 0 0 0 1px var(--offer-border);
	}
	.promise {
		font-size: 1rem;
		color: var(--offer-muted);
	}
	.badge {
		display: inline-block;
		margin: 0 0.5rem 0.25rem 0;
		padding: 0.125rem 0.625rem;
		border-radius: 999px;
		background: var(--dd-rose);
		color: var(--dd-on-rose);
		font-size: 0.8125rem;
		font-weight: 600;
	}
	.engineer a {
		overflow-wrap: anywhere;
	}
	.engineer-name {
		margin: 0;
		font-size: 1.25rem;
	}
	.engineer-name span {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		letter-spacing: 0;
		color: var(--offer-muted);
	}

	/* The live site in the main site's browser frame (BrowserFrame on /websites), with a
	   phone overlapping its corner. */
	.preview {
		position: relative;
		display: block;
		padding: 0 1.5rem 1.5rem 0;
		border-radius: 0.75rem;
	}
	.frame {
		display: block;
		overflow: hidden;
		border: 1px solid var(--offer-border);
		border-radius: 0.75rem;
		background: #261d1f;
	}
	.chrome {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.875rem;
		border-bottom: 1px solid #ffffff14;
	}
	.dots {
		display: flex;
		gap: 0.375rem;
	}
	.dots span {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 999px;
		background: #ffffff26;
	}
	.host {
		margin: 0 auto;
		overflow: hidden;
		padding: 0.125rem 0.75rem;
		border-radius: 0.375rem;
		background: #ffffff0f;
		color: #ffffffa6;
		font-size: 0.75rem;
		font-weight: 400;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.spacer {
		width: 2.625rem;
	}
	.frame img {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 16 / 10;
		object-fit: cover;
		object-position: top;
	}
	.phone {
		position: absolute;
		right: 0;
		bottom: 0;
		width: 22%;
		min-width: 6.5rem;
		padding: 0.3rem;
		border-radius: 1.1rem;
		background: #261d1f;
		box-shadow: 0 0 0 1px var(--offer-border);
	}
	.phone img {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 0.8rem;
	}

	.renewal {
		max-width: 42rem;
		font-size: 0.875rem;
		color: var(--offer-muted);
	}
	p {
		margin: 0;
	}
	a {
		color: var(--dd-accent-text);
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

	.hero {
		padding-top: 1rem;
	}
	.eyebrow {
		font-size: 0.8125rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--dd-accent-text);
	}
	.price {
		font-size: 1.125rem;
		color: var(--offer-muted);
	}
	/* Phones: price and the call to action come straight after the heading, so the
	   first screen says what this is, what it costs and how to accept. */
	@media (max-width: 39.99rem) {
		.hero .price {
			order: 1;
		}
		.hero .cta {
			order: 2;
		}
		.hero :global(.status) {
			order: 1;
		}
		.hero .lead {
			order: 3;
			font-size: 1rem;
		}
		.hero {
			padding-top: 0;
		}
		.price strong {
			font-size: 1.75rem;
		}
	}
	/* Standalone links get a 44px tap height; links inside sentences stay inline. */
	.cta a,
	.ask,
	.links a,
	footer > a {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
	}
	.cta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1.5rem;
		margin-top: 0.25rem;
	}
	.accept {
		display: inline-flex;
		align-items: center;
		height: 2.75rem;
		padding: 0 1.5rem;
		border-radius: 999px;
		background: var(--offer-accent);
		color: var(--offer-accent-fg);
		font-weight: 600;
	}
	.accept:hover {
		text-decoration: none;
		filter: brightness(0.92);
	}
	:global(#offer-plans) {
		scroll-margin-top: 1.5rem;
	}
	.price strong {
		font-size: 2rem;
		letter-spacing: -0.02em;
		color: var(--dd-accent-text);
	}

	.site-name {
		margin: 0;
		font-size: 1.75rem;
	}
	.site {
		padding-top: 2.5rem;
		border-top: 1px solid var(--offer-border);
	}
	.choice ul,
	.items {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.choice > div {
		padding: 1.5rem;
		border-radius: 1.5rem;
	}
	.choice .stay {
		border: 1px solid var(--offer-border);
		background: var(--offer-surface);
	}
	/* Her studio band: the rose ground her home page puts behind "The studio". */
	.choice .move {
		border: 1px solid transparent;
		background: var(--dd-rose);
		color: var(--dd-on-rose);
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
	.items li {
		padding: 1rem 1.25rem;
		border: 1px solid var(--offer-border);
		border-radius: 1rem;
		background: var(--offer-surface);
	}
	.icon {
		flex: none;
		margin-top: 0.125rem;
	}
	.icon path {
		fill: none;
		stroke: var(--offer-accent-fg);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.icon.yes circle {
		fill: var(--offer-accent);
	}
	.icon.no circle {
		fill: var(--dd-icon-no);
	}
	.icon.no path {
		stroke: #fff;
	}

	@media (min-width: 40rem) {
		.lockup {
			align-self: auto;
			flex-wrap: nowrap;
			gap: 1rem;
			padding: 0.625rem 1.5rem;
			border-radius: 999px;
		}
		.void {
			font-size: 1.25rem;
		}
		.client {
			font-size: 1.375rem;
		}
		.mark {
			width: 36px;
			height: 36px;
		}
		.plus {
			font-size: 1.625rem;
		}
		.face {
			width: 7rem;
			height: 7rem;
		}
		.engineer {
			align-items: center;
			padding: 1.5rem 2rem;
		}
		.top {
			flex-direction: row;
			gap: 0.5rem;
		}
		.preview {
			padding: 0 2.5rem 2.5rem 0;
		}
		.site {
			padding-top: 3rem;
		}
	}
</style>
