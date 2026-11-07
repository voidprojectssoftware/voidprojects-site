<script lang="ts">
	import './theme.css';
	import { onMount } from 'svelte';
	import { generateMarkSvg } from '$lib/brand/mark.js';
	import { TRAJECTORIES } from '$lib/trajectory/source.js';
	import { ENGINEER } from '$lib/content/websites.js';
	import {
		AcceptedPlan,
		AcceptedState,
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

	// The Elleebana work, step by step. Every claim is from the didonnastudio-website
	// repo at origin/main 2af0fe7, and the rep is named by role only:
	//   1. Eight requirements in Elleebana's email: .claude/skills/
	//      elleebana-trainer-requirements/SKILL.md (confirmed, the email); items 1 and 2
	//      are the refund policy and course dates.
	//   2. A trainer page and a page per course: #338 (handoff 2026-10-30). The three
	//      courses are the `signedOff` rows in src/config/courses.ts: Elleeplex
	//      Profusion lash lamination, brow lamination, and the two combined, hands-on.
	//      Elleebana's COO wrote that "to start" they will sign her off for those
	//      three, so sign-off is a stated plan, not done.
	//   3. src/pages/for-elleebana.astro, the page for their rep, with the
	//      /trainer-window/ frames (src/routes.ts). Answered in full on 29 October 2026
	//      by Elleebana USA's COO, by email to the owner and Angela (handoff
	//      2026-10-29: "answered all twelve /for-elleebana/ questions by email").
	//   4. #323 transcribed the answers: their course overviews, prices, trainer
	//      number, model rule and certificate steps.
	//   5. /trainer/ is unlisted at Elleebana's request until sign-off (src/routes.ts,
	//      #31). The owner sent the rep /trainer/ on 31 October (handoff, #369). Course
	//      dates wait on Angela (SHOW_FILLER, handoff 2026-10-29); the trainer card
	//      comes from Elleebana on sign-off (requirements skill, item 3).
	const ELLEEBANA = [
		{
			title: 'We read what Elleebana ask for',
			body: 'Their requirements email lists eight things they look for on a trainer’s website, from a refund policy to course dates. We worked out what each one asks of your pages, and wrote down anything only Elleebana could settle.'
		},
		{
			title: 'We built your trainer pages to meet them',
			body: 'A trainer page, and a page for each of the three hands-on courses Elleebana plan to sign you off for first: lash lamination, brow lamination, and the two combined.'
		},
		{
			title: 'We asked Elleebana ourselves',
			body: 'We made a page just for Elleebana’s chief operating officer, with the questions set beside the parts of your page they were about. On October 29 they answered all twelve.'
		},
		{
			title: 'We put their answers to work',
			body: 'Their course descriptions, prices, your trainer number, their model rules and their certificate steps are now on your course pages.'
		},
		{
			title: 'Ready, and waiting on their sign-off',
			body: 'Your trainer pages stay hidden, as Elleebana asked, until they sign you off, and on October 31 we sent them the page to look over. Still to come are your course dates and the trainer card Elleebana send once you are signed off.'
		}
	];

	// What the monthly price covers. Hosting, security updates, upkeep and small changes
	// are /terms#what-you-get. The last line is the owner's promise, broader than
	// /terms#adding-features; the PR body quotes the conflict.
	const COVERS = [
		{ title: 'Hosting and security updates', detail: `${host}, kept current and online.` },
		{ title: 'Someone watching it', detail: 'If something breaks, we notice and deal with it.' },
		{
			title: 'Changes whenever you need them',
			detail: 'New prices, hours, photos or words. Tell us and it is done.'
		},
		{
			title: 'Elleebana, and anyone like them',
			detail:
				'When someone your website has to satisfy asks for something, we deal with them, build it, and keep it current as their rules change.'
		}
	];
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html THEME_SCRIPT}
	<title>Hosting {accepted ? 'plan' : 'proposal'} for {offer.prospect} | Void Projects</title>
</svelte:head>

{#snippet tick()}
	<svg class="tick" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
		<circle cx="10" cy="10" r="10" />
		<path d="M5.5 10.5l3 3 6-7" />
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

<main class="mx-auto grid max-w-4xl grid-cols-1 gap-16 px-4 pt-6 pb-12 sm:px-8 sm:py-16">
	<OfferGate {offer} builtAt={context.builtAt}>
		<section class="hero grid gap-4" aria-labelledby="offer-title">
			<p class="eyebrow">{accepted ? 'Your hosting plan' : 'Proposal'}</p>
			<h1 id="offer-title" class="text-[2rem] leading-tight min-[30rem]:text-4xl sm:text-5xl">
				{accepted
					? 'Your website, looked after'
					: 'Your website is live. We would like to keep it that way.'}
			</h1>
			{#if accepted}
				<p class="lead max-w-2xl text-lg text-(--offer-muted)">
					Angela, thank you for choosing Void Projects. Below is the proposal you accepted, kept for
					your records.
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
					Angela, {host} is built and open to anyone today. This is our offer to host it, keep it current,
					make your changes, and carry on handling Elleebana for you, all for one monthly price.
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

		<section class="site grid grid-cols-1 gap-8" aria-labelledby="offer-site">
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

			<div class="story grid gap-6 sm:grid-cols-[1fr_1.4fr] sm:gap-10">
				<div class="grid content-start gap-3">
					<h2 id="offer-site">Yours, at your own address</h2>
					<p class="text-(--offer-muted)">
						Your full menu and prices, booking straight into Booksy from every page, your hours and
						how to find the studio, and your story in the words you wrote.
					</p>
					<p class="links text-sm font-semibold">
						<a href={offer.previewUrl} rel="noreferrer">Open {host}</a>
					</p>
				</div>
				<dl class="changes">
					{#each offer.concerns as concern (concern.title)}
						<div>
							<dt>{concern.title}</dt>
							<dd>
								{concern.detail}
								{#if concern.impact}<strong class="callout">{concern.impact}</strong>{/if}
							</dd>
						</div>
					{/each}
					<div class="now">
						<dt>Now it is yours</dt>
						<dd>
							One address that belongs to you, with everything on it, written for search engines to
							read.
						</dd>
					</div>
				</dl>
			</div>
		</section>

		<section class="elleebana grid gap-8" aria-labelledby="offer-elleebana">
			<div class="grid max-w-2xl gap-3">
				<p class="eyebrow">Your Elleebana training</p>
				<h2 id="offer-elleebana">We dealt with Elleebana, so you did not have to</h2>
				<p class="text-lg text-(--offer-muted)">
					Elleebana check a trainer’s own website before they sign her off. You told us which
					courses you want to teach. We did the rest.
				</p>
			</div>
			<ol class="steps">
				{#each ELLEEBANA as step, i (step.title)}
					<li class:last={i === ELLEEBANA.length - 1}>
						<span class="num" aria-hidden="true">{i + 1}</span>
						<div>
							<h3>{step.title}</h3>
							<p>{step.body}</p>
						</div>
					</li>
				{/each}
			</ol>
		</section>

		<section class="always" aria-labelledby="offer-always">
			<div class="grid gap-3">
				<h2 id="offer-always">All of it, in your {money(monthly)} a month</h2>
				<p class="always-lead">
					That kind of work is part of the plan for as long as you are with us, at no extra charge.
					When Elleebana change what they ask for, or someone else your website has to answer to
					comes along, we handle it.
				</p>
			</div>
			<ul class="covers">
				{#each COVERS as item (item.title)}
					<li>
						{@render tick()}
						<div>
							<p class="font-semibold">{item.title}</p>
							<p class="detail">{item.detail}</p>
						</div>
					</li>
				{/each}
			</ul>
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
	.price strong {
		font-size: 2rem;
		letter-spacing: -0.02em;
		color: var(--dd-accent-text);
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

	/* What changed: plain rows on the page ground, divided by hairlines, not cards. */
	.changes {
		display: grid;
		margin: 0;
		border-top: 1px solid var(--offer-border);
	}
	.changes > div {
		display: grid;
		gap: 0.25rem;
		padding: 1rem 0;
		border-bottom: 1px solid var(--offer-border);
	}
	.changes dt {
		font-weight: 700;
	}
	.changes dd {
		margin: 0;
		color: var(--offer-muted);
	}
	.changes .now dt {
		color: var(--dd-accent-text);
	}

	/* The Elleebana story: numbered steps on a rail, the page's one sequence. */
	.steps {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.steps li {
		position: relative;
		display: grid;
		grid-template-columns: 2.5rem 1fr;
		gap: 1rem;
		padding-bottom: 1.75rem;
	}
	.steps li::before {
		content: '';
		position: absolute;
		top: 2.5rem;
		bottom: 0;
		left: calc(1.25rem - 1px);
		width: 2px;
		background: var(--offer-border);
	}
	.steps li.last {
		padding-bottom: 0;
	}
	.steps li.last::before {
		display: none;
	}
	.num {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 999px;
		background: var(--dd-rose);
		color: var(--dd-on-rose);
		font-weight: 700;
	}
	.steps li.last .num {
		background: var(--offer-accent);
		color: var(--offer-accent-fg);
	}
	.steps h3 {
		margin: 0.375rem 0 0.25rem;
		font-size: 1.25rem;
	}
	.steps p {
		max-width: 40rem;
		color: var(--offer-muted);
	}

	/* The promise: her rose studio band, full card width, the one coloured block. */
	.always {
		display: grid;
		gap: 1.5rem;
		padding: 1.75rem 1.5rem;
		border-radius: 1.5rem;
		background: var(--dd-rose);
		color: var(--dd-on-rose);
	}
	.always h2 {
		margin: 0;
	}
	.always-lead {
		max-width: 42rem;
		font-size: 1.125rem;
	}
	.covers {
		display: grid;
		gap: 1rem 2rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.covers li {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}
	.covers .detail {
		opacity: 0.85;
	}
	.tick {
		flex: none;
		margin-top: 0.125rem;
	}
	.tick circle {
		fill: var(--offer-accent);
	}
	.tick path {
		fill: none;
		stroke: var(--offer-accent-fg);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
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

	.renewal {
		max-width: 42rem;
		font-size: 0.875rem;
		color: var(--offer-muted);
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
		.always {
			padding: 2.5rem;
		}
		.covers {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
