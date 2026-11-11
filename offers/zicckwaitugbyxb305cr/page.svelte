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
	import { formatAmount, formatDate, priceFor, type AddOn } from '$lib/offers/offer.js';
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

	// The hero's side by side. Old: murphysmemphis-website docs/discovery/atlas/screens/
	// home-1280x800-full.png (the Wix home page at 1280 wide, stored at half scale), its
	// first 800 rows. New: docs/captures/2026-11-11-issue-8/home-desktop-fold.png (the
	// rebuild's home page at 1280x800, main 4d497dd), halved to match.
	const currentHost = new URL(figures.current).host;
	const previewHost = $derived(new URL(offer.previewUrl).host);

	// Every value below is figures.json's, which figures.mjs computes with
	// murphysmemphis-website's own comparison code; each sentence is built from those
	// numbers, never typed. The order is this page's: what the bar's customers feel first.
	const n = figures.glance.numbers;
	const g = figures.glance.cards;
	const sides = figures.sides;
	const ofPages = (k: number) => `${k} of ${n.pages}`;
	const share = (part: number, whole: number) => `${Math.min(100, (part / whole) * 100)}%`;
	const oneDecimal = (s: number) => `${s.toFixed(1)} s`;
	const timesLess = Math.round(n.kilobytes.before / n.kilobytes.after);
	const lcpScale = Math.max(n.lcpSeconds.before, n.lcpSeconds.after, n.goodLcpSeconds) * 1.15;
	const noneOr = (k: number) => (k === 0 ? 'none' : String(k));
	const wixAheadOnScore =
		n.performance.after < n.performance.before &&
		n.tbtSeconds.after > n.tbtSeconds.before &&
		n.lcpSeconds.after < n.lcpSeconds.before;

	// Why people asking AI matters to the bar: two dated, published surveys, quoted word
	// for word. Each is the publisher's own sentence; nothing here is ours.
	const AI_STUDIES = [
		{
			// SOCi 2026 Local Discovery Index (over 1,000 U.S. consumers, July 2026, weighted to
			// the U.S. population), as published via Stacker on WSOC-TV, 2026-11-04. Read
			// 2026-11-11. The same sentence is in SOCi's sponsored write-up on MarTech,
			// martech.org/ai-usage-surges-6x-for-local-search-fragmenting-the-digital-ecosystem/
			// (2026-10-05, read 2026-11-11).
			figure: '52%',
			quote:
				'The share of consumers who used an AI tool to find a local business in the last 30 days rose from 9% in 2025 to 52% in 2026.',
			source: 'SOCi, 2026 Local Discovery Index',
			date: 'November 4, 2026',
			href: 'https://www.wsoctv.com/news/americans-are-using/WKKTGKWZWY6KHONBGXA4EAQ3GI/'
		},
		{
			// Nielsen for Reputation (763 U.S. consumers who had visited a hospitality venue in
			// the last six months, August 2025), Reputation press release 2025-10-21. Read
			// 2026-11-11.
			figure: '1 in 5',
			quote:
				'20% of U.S. consumers now use AI tools like ChatGPT to research restaurants and bars.',
			source: 'Reputation, survey by Nielsen',
			date: 'October 21, 2025',
			href: 'https://reputation.com/press-room/new-reputation-survey-reveals-how-ai-and-economic-pressures-are-rewriting-the-rules-of-dining-out-in-america/'
		}
	];
	const aiCards = figures.ai.cards;
	const aiTotals = Object.values(figures.ai.totals);
	const aiChecks = aiTotals[0].after.expected;

	// Evidence for each concern in offer.ts, keyed by its title: screenshots of the bar's
	// own pages (cropped, webp, in public/) and one line on what the new site does about
	// it. Sources are cited on each concern in offer.ts.
	interface Shot {
		src: string;
		alt: string;
		caption: string;
		width: number;
		height: number;
	}
	const EVIDENCE: Record<string, { shots: Shot[]; fix: string; addOn?: string }> = {
		'Your web address leads to an error page': {
			shots: [
				{
					src: 'ev-domain.webp',
					alt: 'A Wix page reading: This domain isn’t connected to a site.',
					caption: 'murphysmemphis.com, typed into a browser on November 11, 2026',
					width: 400,
					height: 388
				}
			],
			// Pointing their own domain at the site is part of launching it (add-ons.md,
			// "Domain"); the domain is charged at cost (/terms #who-owns-what).
			fix: 'When the new site goes live, murphysmemphis.com and www.murphysmemphis.com both open it, with no browser warning.'
		},
		'Your closing time depends on where someone looks': {
			shots: [
				{
					src: 'ev-hours-site.webp',
					alt: 'Your site’s footer: Monday to Saturday 11am to 3am, Sunday noon to 3am.',
					caption: 'Your website',
					width: 336,
					height: 140
				},
				{
					src: 'ev-hours-google.webp',
					alt: 'Google Maps: Open, closes 1AM.',
					caption: 'Your Google listing',
					width: 392,
					height: 92
				}
			],
			fix: 'Tell us the right time and we change it on the site the same day.',
			// The owner, offer review 2026-11-11: make the Google listing add-on prominent here,
			// "Opt in to the google business add on and we will keep google in sync".
			addOn: 'google-business-profile'
		},
		'Nobody online can find your next show': {
			shots: [
				{
					src: 'ev-calendar.webp',
					alt: 'An events calendar for November 2026 with nothing on any day.',
					caption: 'Your Events page',
					width: 484,
					height: 318
				}
			],
			fix: 'Email, text or call us with your shows, and they go on the new site’s Shows page the same day.'
		},
		'Wix’s ad comes before your name': {
			shots: [
				{
					src: 'ev-wix-ad.webp',
					alt: 'A bar reading: This website was built on Wix. Create yours today. Get Started. Your logo sits below it.',
					caption: 'The top of every page of your site',
					width: 640,
					height: 112
				}
			],
			fix: 'No ads. Your own sign is the first thing on every page, as in the picture at the top.'
		},
		'There is no email address for the bar': {
			shots: [
				{
					src: 'ev-contact.webp',
					alt: 'Your Contact page: the address, the phone number and a message form, and no email address.',
					caption: 'Your Contact page',
					width: 496,
					height: 152
				}
			],
			fix: 'We can set up an address at murphysmemphis.com that forwards to an inbox you already have. See Business email below.'
		}
	};
	// svelte-ignore state_referenced_locally
	for (const concern of offer.concerns) {
		const ev = EVIDENCE[concern.title];
		if (!ev) throw new Error(`no evidence for the concern "${concern.title}"`);
		if (ev.addOn && !offer.addOns.some((a) => a.id === ev.addOn)) {
			throw new Error(`no add-on "${ev.addOn}" for the concern "${concern.title}"`);
		}
	}
	const addOnById = (id: string) => offer.addOns.find((a) => a.id === id);

	// A concern's "Add it to my plan": ticks the add-on in the picker below, then scrolls
	// there. Without JavaScript it is a plain link to the picker.
	function addAndGo(e: MouseEvent, id: string) {
		if (!selection.addOnIds.includes(id)) {
			selection = { ...selection, addOnIds: [...selection.addOnIds, id] };
		}
		toPlans(e);
	}

	// Add-ons, listed under the hero so they are seen before the plan picker; the picker
	// below prices them for the chosen interval.
	const fromPrice = (a: AddOn) => {
		const price = priceFor(a, 'month') ?? priceFor(a, 'year');
		if (!price) return '';
		const per = `${a.seats ? `/${a.seats.unit}` : ''}/${price.interval}`;
		return `+${money(price.amount)}${per}`;
	};

	// Extra copy for two add-on groups, found by an add-on id so this page never imports
	// offer.ts (which carries `contact`).
	//
	// The content group's "None" is what the plan already includes. The owner, offer
	// review 2026-11-11: "With just their base 25/month, they can email, text, or call us
	// anytime to have us update their site with new events same day. They just will not be
	// able to do it themself." /terms #what-you-get includes "Small changes (text, photos,
	// hours, prices, and similar) at no extra charge, within reason" and says the sign-up
	// page wins for what is included; it says nothing of "same day" or of text and calls,
	// so this page is where that promise is made.
	const groupOf = (id: string) => offer.addOns.find((a) => a.id === id)?.group ?? '';
	let groups = $derived({
		[groupOf('events-by-us')]: {
			note: 'Shows, menu items and specials: who keeps them current on your site.',
			none: {
				label: 'We update it for you, included',
				summary: `Email, text or call us with a new show, a menu change or a special, and we put it on your site the same day. Included in your plan (${money(monthly)} a month). You just won’t post to the site yourself.`
			}
		},
		[groupOf('email-forwarding')]: {
			note: 'We could not find an email address for Murphy’s anywhere. We can set one up at murphysmemphis.com, and forward it to an inbox you already have, a personal one included.'
		}
	});

	const QR_INK = '#20393a'; // the boards' teal, dark on white so phones read it
</script>

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
		<p>
			<!-- The live mark, a new one on every load, the same endpoint as the footer badge
			     (the owner, offer review 2026-11-11). Absolute so it also draws under
			     preview:offers, which serves no /api/mark.svg; no-referrer keeps the id out. -->
			<img
				class="mark"
				src="https://voidprojects.ai/api/mark.svg"
				alt=""
				width="40"
				height="40"
				decoding="async"
			/>
			A proposal from Void Projects
		</p>
	</div>
</header>

<main class="mx-auto grid max-w-5xl grid-cols-1 gap-14 px-4 pt-10 pb-12 sm:px-8 sm:py-16">
	<OfferGate {offer} builtAt={context.builtAt}>
		<section class="grid gap-5" aria-labelledby="offer-title">
			<p class="eyebrow">Proposal</p>
			<h1 id="offer-title" class="text-[2rem] min-[30rem]:text-[2.75rem] sm:text-5xl">
				A new website for {offer.prospect}
			</h1>
			<p class="max-w-2xl text-lg text-(--offer-muted)">
				We have built a new website for the bar. It is online as a preview, so you can look through
				it before you decide anything. We would host it, keep it secure and make your changes.
			</p>

			<div class="sites">
				<figure class="site">
					<a href={figures.current} target="_blank" rel="noopener noreferrer">
						<img
							src={asset('old-site.webp')}
							alt="Open your site today. Its home page: Wix’s advertisement, your logo, and stock beer taps."
							width="640"
							height="400"
							decoding="async"
						/>
					</a>
					<figcaption>
						Your site today
						<a href={figures.current} target="_blank" rel="noopener noreferrer"
							>{currentHost}<span class="sr-only"> (opens in a new tab)</span></a
						>
					</figcaption>
				</figure>
				<figure class="site new">
					<a href={offer.previewUrl} target="_blank" rel="noopener noreferrer">
						<img
							src={asset('new-site.webp')}
							alt="Open your new site. Its home page: your sign, a brick and plaster wall, today’s hours and the room."
							width="640"
							height="400"
							decoding="async"
						/>
					</a>
					<figcaption>
						Your new site
						<a href={offer.previewUrl} target="_blank" rel="noopener noreferrer"
							>{previewHost}<span class="sr-only"> (opens in a new tab)</span></a
						>
					</figcaption>
				</figure>
			</div>
			<p class="cta">
				<a class="accept" href={offer.previewUrl} target="_blank" rel="noopener noreferrer"
					>See your new site<span class="sr-only"> (opens in a new tab)</span></a
				>
				<a href={figures.comparison} target="_blank" rel="noopener noreferrer"
					>Both sites, compared page by page</a
				>
			</p>

			<!-- The price is offer.ts's. "Domain at cost", "no build fee" and "no contract":
			     /terms #who-owns-what and #what-you-get. -->
			<p class="price">
				<strong>{money(monthly)}</strong> a month, or {money(yearly)} a year. Your domain at cost. No
				build fee. No contract.
			</p>

			{#if offer.addOns.length}
				<aside class="more" aria-labelledby="offer-more">
					<h2 id="offer-more" class="more-title">More add-ons, if you want them</h2>
					<ul>
						{#each offer.addOns as addOn (addOn.id)}
							<li><span>{addOn.label}</span> <span class="more-price">{fromPrice(addOn)}</span></li>
						{/each}
					</ul>
					<a href="#offer-plans" onclick={toPlans}>Choose add-ons below</a>
				</aside>
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
				</p>
				<p class="text-sm"><a href="mailto:{ENGINEER.email}">{ENGINEER.email}</a></p>
			</div>
		</section>

		<section class="grid gap-6" aria-labelledby="offer-figures">
			<div class="grid gap-2">
				<p class="eyebrow">Measured</p>
				<h2 id="offer-figures">What the new site means for the bar</h2>
				<p class="max-w-2xl text-(--offer-muted)">
					Both sites tested the same way on {figures.measured.after}, as an {figures.measured.phone}
					loads them, over {n.pages} pages each.
				</p>
			</div>

			<ul class="stats">
				<li class="stat">
					<h3>Someone outside looks you up on their phone</h3>
					<p class="lead">
						Your new site shows in <strong>{g.lcp.after}</strong>. The Wix site takes {g.lcp
							.before}.
					</p>
					<div class="bars" aria-hidden="true">
						{#each [{ side: sides.before, v: n.lcpSeconds.before, label: g.lcp.before, cls: 'before' }, { side: sides.after, v: n.lcpSeconds.after, label: g.lcp.after, cls: 'after' }] as row (row.cls)}
							<span class="bar-label">{row.side}</span>
							<span class="track">
								<span class="fill {row.cls}" style:width={share(row.v, lcpScale)}></span>
								<span class="mark-line" style:left={share(n.goodLcpSeconds, lcpScale)}></span>
							</span>
							<span class="bar-value">{row.label}</span>
						{/each}
					</div>
					<p class="fine">
						The line is Google’s mark for good: {n.goodLcpSeconds} s or less. The Wix site makes it on
						{ofPages(n.lcpGood.before)} pages, the new site on {ofPages(n.lcpGood.after)}.
					</p>
				</li>

				<li class="stat">
					<h3>Data a visit costs their phone</h3>
					<p class="lead">
						About <strong>{timesLess} times less</strong> to download per page.
					</p>
					<div class="bars" aria-hidden="true">
						<span class="bar-label">{sides.before}</span>
						<span class="track"><span class="fill before" style:width="100%"></span></span>
						<span class="bar-value">{g.weight.before}</span>
						<span class="bar-label">{sides.after}</span>
						<span class="track"
							><span class="fill after" style:width={share(n.kilobytes.after, n.kilobytes.before)}
							></span></span
						>
						<span class="bar-value">{g.weight.after}</span>
					</div>
					<p class="fine">
						{g.weight.before} on the Wix site, {g.weight.after} on the new one. A phone on a weak signal
						feels it most.
					</p>
				</li>

				<li class="stat">
					<h3>Trips before the page is done</h3>
					<p class="lead">
						<strong>{n.requests.after}</strong> files fetched per page, against {n.requests.before}
						on Wix.
					</p>
					<div class="dots-pair" aria-hidden="true">
						<div>
							<span class="bar-label">{sides.before}</span>
							<span class="dots before">
								{#each { length: n.requests.before }, i (i)}<span></span>{/each}
							</span>
						</div>
						<div>
							<span class="bar-label">{sides.after}</span>
							<span class="dots after">
								{#each { length: n.requests.after }, i (i)}<span></span>{/each}
							</span>
						</div>
					</div>
					<p class="fine">Each dot is one more trip to a server, slower on a weak signal.</p>
				</li>

				<li class="stat">
					<h3>Ready for Google search</h3>
					<p class="lead">
						<strong>{ofPages(n.seoPerfect.after)}</strong> new pages get full marks, against
						{ofPages(n.seoPerfect.before)} on Wix.
					</p>
					<div class="pips-pair" aria-hidden="true">
						{#each [{ side: sides.before, k: n.seoPerfect.before, cls: 'before' }, { side: sides.after, k: n.seoPerfect.after, cls: 'after' }] as row (row.cls)}
							<span class="bar-label">{row.side}</span>
							<span class="pips">
								{#each { length: n.pages }, i (i)}<span class:on={i < row.k} class={row.cls}
									></span>{/each}
							</span>
						{/each}
					</div>
					<p class="fine">
						Lighthouse’s search check, out of 100: {g.seo.before} on average for Wix, {g.seo.after}
						for the new site.
					</p>
				</li>

				<li class="stat">
					<h3>Customers who use a screen reader or zoom in</h3>
					<p class="lead">
						<strong>{noneOr(n.axeDesktopNodes.after)}</strong> problems in their way on the new
						site, against {n.axeDesktopNodes.before} on Wix.
					</p>
					<div class="dots-pair" aria-hidden="true">
						<div>
							<span class="bar-label">{sides.before}</span>
							<span class="dots warn">
								{#each { length: n.axeDesktopNodes.before }, i (i)}<span></span>{/each}
							</span>
						</div>
						<div>
							<span class="bar-label">{sides.after}</span>
							<span class="dots after">
								{#each { length: n.axeDesktopNodes.after }, i (i)}<span></span>{/each}
								{#if n.axeDesktopNodes.after === 0}<span class="zero">none</span>{/if}
							</span>
						</div>
					</div>
					<p class="fine">
						Failures of the web’s accessibility rules (WCAG 2.2), on a computer screen. On a phone:
						{n.axePhoneNodes.before} on Wix, {noneOr(n.axePhoneNodes.after)} on the new site.
					</p>
				</li>

				<li class="stat" class:quiet={wixAheadOnScore}>
					{#if n.performance.after > n.performance.before}
						<h3>Google’s speed test on a phone</h3>
						<p class="lead">
							<strong>{n.performance.after}</strong> out of 100 for the new site, against {n
								.performance.before}
							for Wix.
						</p>
						<div class="bars" aria-hidden="true">
							{#each [{ side: sides.before, v: n.performance.before, cls: 'before' }, { side: sides.after, v: n.performance.after, cls: 'after' }] as row (row.cls)}
								<span class="bar-label">{row.side}</span>
								<span class="track"
									><span class="fill {row.cls}" style:width={share(row.v, 100)}></span></span
								>
								<span class="bar-value">{row.v}</span>
							{/each}
						</div>
						<p class="fine">
							Lighthouse’s performance score, averaged over the {n.pages} pages: how soon each page shows,
							how soon it answers a tap and whether it shifts while it loads.
						</p>
					{:else}
						<h3>
							{n.performance.after === n.performance.before
								? 'The same speed score on a phone'
								: 'One score where Wix is ahead'}
						</h3>
						<p class="lead">
							Lighthouse’s speed score on a phone: {n.performance.before} for Wix, {n.performance
								.after}
							for the new site, out of 100.
						</p>
						{#if wixAheadOnScore}
							<p class="fine">
								The new site still shows sooner ({g.lcp.after} against {g.lcp.before}). What costs
								it points is the test phone drawing the brick wall: {oneDecimal(n.tbtSeconds.after)} before
								it answers a tap, against {oneDecimal(n.tbtSeconds.before)} on Wix. The test draws in
								software; a phone’s own browser usually draws on its graphics chip.
							</p>
						{/if}
					{/if}
				</li>
			</ul>
		</section>

		<section class="grid gap-6" aria-labelledby="offer-ai">
			<div class="grid gap-2">
				<p class="eyebrow">Found by AI</p>
				<h2 id="offer-ai">People now ask AI where to go</h2>
			</div>
			<ul class="studies">
				{#each AI_STUDIES as study (study.href)}
					<li class="study">
						<p class="study-figure">{study.figure}</p>
						<blockquote cite={study.href}><p>“{study.quote}”</p></blockquote>
						<p class="fine">
							<a href={study.href} target="_blank" rel="noopener noreferrer">{study.source}</a>,
							{study.date}
						</p>
					</li>
				{/each}
			</ul>

			<div class="grid gap-3">
				<h3 class="sub">What an AI can read about Murphy’s</h3>
				<p class="max-w-2xl text-(--offer-muted)">
					We checked each site for {figures.ai.facts} facts about the bar, {aiChecks} checks in all.
				</p>
				<ul class="ai-rows">
					{#each aiCards as card, i (card.title)}
						{@const t = aiTotals[i]}
						<li>
							<p class="ai-title">{card.title}</p>
							<div class="bars" aria-hidden="true">
								<span class="bar-label">{sides.before}</span>
								<span class="track"
									><span
										class="fill before"
										style:width={share(t.before.found ?? 0, t.before.expected)}
									></span></span
								>
								<span class="bar-value">{card.before}</span>
								<span class="bar-label">{sides.after}</span>
								<span class="track"
									><span
										class="fill after"
										style:width={share(t.after.found ?? 0, t.after.expected)}
									></span></span
								>
								<span class="bar-value">{card.after}</span>
							</div>
							<p class="sr-only">{sides.before}: {card.before}. {sides.after}: {card.after}.</p>
						</li>
					{/each}
				</ul>
				<details class="fine max-w-2xl">
					<summary>How we measured this</summary>
					<p>{figures.ai.lead}</p>
					{#each aiCards as card (card.title)}<p>{card.title}: {card.note}</p>{/each}
					<p>{figures.ai.geoctl}</p>
				</details>
			</div>

			<p>
				<a class="preview" href={figures.comparison} target="_blank" rel="noopener noreferrer"
					>Every figure, page by page, on the full comparison</a
				>
			</p>
		</section>

		<ConcernsList
			concerns={offer.concerns}
			title="A few things we found on your old site, and fixed"
		>
			{#snippet extra(concern)}
				{@const ev = EVIDENCE[concern.title]}
				<div class="shots" class:pair={ev.shots.length > 1}>
					{#each ev.shots as shot (shot.src)}
						<figure class="shot">
							<img
								src={asset(shot.src)}
								alt={shot.alt}
								width={shot.width}
								height={shot.height}
								style:max-width="min(100%, {shot.width}px)"
								loading="lazy"
								decoding="async"
							/>
							<figcaption>{shot.caption}</figcaption>
						</figure>
					{/each}
				</div>
				<p class="fix"><strong>On the new site:</strong> {ev.fix}</p>
				{#if ev.addOn}
					{@const addOn = addOnById(ev.addOn)}
					{#if addOn}
						{@const added = selection.addOnIds.includes(addOn.id)}
						<div class="upsell">
							<p class="upsell-title">Keep Google in sync too</p>
							<p>
								Opt in to our Google listing add-on and we keep Google in sync with your business:
								the hours, phone and website on your listing match your site, holiday hours
								included.
								<span class="upsell-price"
									>{money(priceFor(addOn, 'month')?.amount ?? 0)} a month.</span
								>
							</p>
							<a class="upsell-add" href="#offer-plans" onclick={(e) => addAndGo(e, addOn.id)}
								>{added ? 'Added to your plan, see below' : 'Add it to my plan'}</a
							>
						</div>
					{/if}
				{/if}
			{/snippet}
		</ConcernsList>

		<section class="grid gap-8" aria-label="Accept the offer">
			<PlanPicker
				{offer}
				bind:selection
				{groups}
				title="Monthly or a year ahead"
				renewalNote={false}
			/>
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
		padding: 0.5rem 1rem;
		background: var(--m-plaster);
		color: var(--m-board);
	}
	.band p {
		display: inline-flex;
		align-items: center;
		gap: 0.625rem;
		margin: 0;
		font-family: var(--m-display);
		font-size: 1rem;
		letter-spacing: 0.03em;
	}
	.mark {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 6px;
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
	h2 {
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

	/* Old and new, side by side from 40rem; stacked on a phone. */
	.sites {
		display: grid;
		gap: 1rem;
		margin: 0.5rem 0 0;
	}
	@media (min-width: 40rem) {
		.sites {
			grid-template-columns: 1fr 1fr;
		}
	}
	.site {
		display: grid;
		gap: 0.5rem;
		margin: 0;
	}
	.site img {
		display: block;
		width: 100%;
		height: auto;
		border: 1px solid var(--offer-border);
		border-top: 5px solid var(--m-brick);
		border-radius: var(--offer-radius);
	}
	.site.new img {
		border-top-color: var(--m-deep-teal);
	}
	.site a {
		display: block;
	}
	.site figcaption {
		font-family: var(--m-display);
		font-size: 1.0625rem;
	}
	.site figcaption a {
		display: block;
		width: fit-content;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 0.875rem;
	}
	.price {
		margin: 0;
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
		margin: 0;
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

	.more {
		display: grid;
		gap: 0.75rem;
		max-width: 42rem;
		padding: 1rem 1.25rem;
		border: 1px solid var(--offer-border);
		border-left: 6px solid var(--m-plaster);
		border-radius: var(--offer-radius);
		background: var(--offer-surface);
	}
	.more-title {
		font-size: 1.25rem;
	}
	.more ul {
		display: grid;
		gap: 0.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.more li {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0 1rem;
		padding: 0.25rem 0;
		border-bottom: 1px dashed var(--offer-border);
	}
	.more-price {
		font-variant-numeric: tabular-nums;
		color: var(--offer-muted);
	}
	.more a {
		font-weight: 700;
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
		font-size: 1.5rem;
	}
	.sub {
		margin: 0.5rem 0 0;
		font-family: var(--m-display);
		font-size: 1.375rem;
		font-weight: 400;
		line-height: 1.2;
	}

	/* The measured figures as pictures: bars to scale, one dot per file or problem, one
	   pip per page. Each picture repeats what its text already says, so it is hidden
	   from screen readers. */
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
		gap: 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.stat {
		display: grid;
		align-content: start;
		gap: 0.75rem;
		padding: 1.125rem 1.25rem;
		border: 1px solid var(--offer-border);
		border-top: 5px solid var(--m-sign-teal);
		border-radius: var(--offer-radius);
		background: var(--offer-surface);
	}
	.stat.quiet {
		border-top-color: var(--offer-border);
	}
	.stat h3 {
		margin: 0;
		font-family: var(--m-display);
		font-size: 1.125rem;
		font-weight: 400;
		line-height: 1.25;
	}
	.lead {
		margin: 0;
		font-size: 1.0625rem;
	}
	.lead strong {
		font-family: var(--m-display);
		font-weight: 400;
		font-size: 1.375rem;
		color: var(--m-deep-teal);
	}
	.bars {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.5rem 0.75rem;
	}
	.bar-label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--offer-muted);
	}
	.bar-value {
		font-family: var(--m-display);
		font-size: 1rem;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
	.track {
		position: relative;
		height: 1rem;
		border-radius: 2px;
		background: rgb(32 57 58 / 0.08);
	}
	.fill {
		position: absolute;
		inset: 0 auto 0 0;
		min-width: 2px;
		border-radius: 2px;
	}
	.fill.before {
		background: var(--m-brick);
	}
	.fill.after {
		background: var(--m-deep-teal);
	}
	.mark-line {
		position: absolute;
		top: -0.25rem;
		bottom: -0.25rem;
		width: 2px;
		background: var(--m-board);
	}
	.dots-pair {
		display: grid;
		gap: 0.75rem;
	}
	.dots-pair > div {
		display: grid;
		gap: 0.25rem;
	}
	.dots {
		display: flex;
		flex-wrap: wrap;
		gap: 3px;
		min-height: 7px;
	}
	.dots > span:not(.zero) {
		width: 7px;
		height: 7px;
		border-radius: 999px;
	}
	.dots.before > span {
		background: var(--m-brick);
	}
	.dots.warn > span {
		background: var(--offer-bad);
	}
	.dots.after > span:not(.zero) {
		background: var(--m-deep-teal);
	}
	.zero {
		font-family: var(--m-display);
		font-size: 1rem;
		color: var(--m-deep-teal);
	}
	.pips-pair {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 0.5rem 0.75rem;
	}
	.pips {
		display: flex;
		gap: 0.375rem;
	}
	.pips > span {
		width: 1.5rem;
		height: 1.5rem;
		border: 2px solid var(--offer-border);
		border-radius: 3px;
	}
	.pips > span.on.before {
		border-color: var(--m-brick);
		background: var(--m-brick);
	}
	.pips > span.on.after {
		border-color: var(--m-deep-teal);
		background: var(--m-deep-teal);
	}

	.studies {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
		gap: 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.study {
		display: grid;
		align-content: start;
		gap: 0.5rem;
		padding: 1.125rem 1.25rem;
		border: 1px solid var(--offer-border);
		border-left: 6px solid var(--m-deep-teal);
		border-radius: var(--offer-radius);
		background: var(--offer-surface);
	}
	.study-figure {
		margin: 0;
		font-family: var(--m-display);
		font-size: 2.5rem;
		line-height: 1;
		color: var(--m-deep-teal);
	}
	.study blockquote {
		margin: 0;
	}
	.study blockquote p {
		margin: 0;
	}
	.ai-rows {
		display: grid;
		gap: 1rem;
		max-width: 42rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.ai-rows li {
		display: grid;
		gap: 0.375rem;
	}
	.ai-title {
		margin: 0;
		font-weight: 700;
	}
	details summary {
		cursor: pointer;
		color: var(--m-deep-teal);
		font-weight: 600;
	}
	details p {
		margin: 0.5rem 0 0;
	}

	.shots {
		display: grid;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}
	@media (min-width: 40rem) {
		.shots.pair {
			grid-template-columns: 1fr 1fr;
			align-items: start;
		}
	}
	.shot {
		display: grid;
		gap: 0.25rem;
		margin: 0;
	}
	.shot img {
		display: block;
		width: 100%;
		height: auto;
		border: 1px solid var(--offer-border);
		border-radius: var(--offer-radius);
	}
	.shot figcaption {
		font-size: 0.8125rem;
		color: var(--offer-muted);
	}
	.fix {
		margin: 0.75rem 0 0;
	}
	.fix strong {
		color: var(--m-deep-teal);
	}
	/* The Google listing add-on, offered where the hours disagree with Google. */
	.upsell {
		display: grid;
		justify-items: start;
		gap: 0.5rem;
		margin-top: 0.875rem;
		padding: 0.875rem 1rem;
		border: 1px solid var(--offer-border);
		border-left: 6px solid var(--m-plaster);
		border-radius: var(--offer-radius);
		background: rgb(32 57 58 / 0.04);
	}
	.upsell p {
		margin: 0;
	}
	.upsell-title {
		font-family: var(--m-display);
		font-size: 1.125rem;
		line-height: 1.25;
	}
	.upsell-price {
		font-weight: 700;
		white-space: nowrap;
		color: var(--m-deep-teal);
	}
	.upsell-add {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		padding: 0 1.25rem;
		border-radius: var(--offer-radius);
		background: var(--m-deep-teal);
		color: #fff;
		font-family: var(--m-display);
		text-decoration: none;
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
