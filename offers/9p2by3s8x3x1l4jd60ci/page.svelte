<script lang="ts">
	import './theme.css';
	// Inlined so no asset path, which carries the offer id, sits in the script.
	import logo from './logo.png?inline';
	// Software Earnings' own file (262x94) with its black and grey parts turned white so
	// it reads on the dark pill; the lime and the swoosh are unchanged. No light version exists.
	import seLogo from './se-logo.png?inline';
	import { generateMarkSvg } from '$lib/brand/mark.js';
	import { TRAJECTORIES } from '$lib/trajectory/source.js';
	import figures from './figures.json';
	import { onMount } from 'svelte';
	import { ENGINEER } from '$lib/content/websites.js';
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
	import type { Concern } from '$lib/offers/offer.js';

	let { offer, context }: OfferPageProps = $props();

	// Files from offers/<id>/public/, by path from the page's own URL (a prop), so the
	// offer id is in the HTML but never in the page script.
	const asset = (path: string) => new URL(path, context.url).pathname;

	// Dark theme: off by default, remembered in localStorage when turned on. THEME_SCRIPT
	// runs in the head before first paint, so a returning visitor sees no flash.
	const THEME_KEY = 'offer-theme';
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

	// Info disclosures (<details class="info">) close on Escape and on a click elsewhere.
	onMount(() => {
		dark = document.documentElement.dataset.theme === 'dark';
		const seed = Math.floor(Math.random() * 0x7fffffff);
		markSrc = new URL(`/api/mark.svg?seed=${seed}`, context.url).href;
		const closeOthers = (e: MouseEvent) => {
			for (const d of document.querySelectorAll<HTMLDetailsElement>('details.info[open]')) {
				if (!d.contains(e.target as Node)) d.open = false;
			}
		};
		const closeOnEscape = (e: KeyboardEvent) => {
			if (e.key !== 'Escape') return;
			for (const d of document.querySelectorAll<HTMLDetailsElement>('details.info[open]')) {
				d.open = false;
				if (d.contains(document.activeElement)) d.querySelector('summary')?.focus();
			}
		};
		document.addEventListener('click', closeOthers);
		document.addEventListener('keydown', closeOnEscape);
		return () => {
			document.removeEventListener('click', closeOthers);
			document.removeEventListener('keydown', closeOnEscape);
		};
	});

	const bioLine = ENGINEER.bio[0].split('. ')[0] + '.';

	// Screenshot evidence for a concern, keyed by its title in offer.ts. Captured from the
	// live current sites on 2026-11-04 (Playwright, iPhone 15 emulation, cookie banner
	// declined), cropped to the paragraph and nothing else changed.
	const EVIDENCE: Record<string, { site: string; file: string; width: number; height: number }[]> =
		{
			'Someone else’s advert on your home page': [
				{
					site: 'First Touch Payment Solutions',
					file: 'evidence/ftps-insurance.webp',
					width: 600,
					height: 334
				},
				{ site: 'Software Earnings', file: 'evidence/se-insurance.webp', width: 600, height: 444 }
			]
		};
	let shotDialog: HTMLDialogElement | undefined = $state();
	let shot = $state({ src: '', alt: '', width: 600, height: 400 });
	let opener: HTMLElement | null = null;
	function openShot(e: MouseEvent, next: typeof shot) {
		if (!shotDialog?.showModal) return; // no dialog support: the link opens the image itself
		e.preventDefault();
		opener = e.currentTarget as HTMLElement;
		shot = next;
		shotDialog.showModal();
	}
	const shotAlt = (site: string) =>
		`Screenshot of the current ${site} home page on a phone, with Hibu’s “Now Insurance” text in place of your own`;

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
	// After mount the marks switch to a fresh one from the site's /api/mark.svg endpoint
	// (the footer badge's), one random seed per page load shared by both, as the site
	// header rolls a new mark each visit. The fixed-seed mark stays for no-JS visitors.
	let markSrc = $state('');
	const voidMark = import.meta.env.SSR
		? generateMarkSvg(TRAJECTORIES, FAVICON_SEED, __BRAND_PRIMARY__)
		: (document.querySelector('[data-void-mark] svg')?.outerHTML ?? '');

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
		impact?: string; // the consequence, shown as a callout after `why`
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
		'Pages show in under 2 seconds on a phone', // the one callout in this list
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
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html THEME_SCRIPT}
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

{#snippet evidence(concern: Concern)}
	{#if EVIDENCE[concern.title]}
		<div class="evidence">
			{#each EVIDENCE[concern.title] as item (item.file)}
				{@const next = {
					src: asset(item.file),
					alt: shotAlt(item.site),
					width: item.width,
					height: item.height
				}}
				<a class="thumb" href={next.src} onclick={(e) => openShot(e, next)}>
					<img
						src={next.src}
						alt={next.alt}
						width={item.width}
						height={item.height}
						loading="lazy"
						decoding="async"
					/>
					<span>{item.site}</span>
				</a>
			{/each}
			<p class="evidence-note">
				Captured from your live sites on a phone, November 4, 2026. Tap to enlarge.
			</p>
		</div>
	{/if}
{/snippet}

{#snippet info(text: string, name: string)}
	<details class="info">
		<summary>
			<span class="sr-only">{name}</span>
			<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
				<circle cx="10" cy="10" r="8.5" />
				<path d="M10 9v5M10 6.2v.1" />
			</svg>
		</summary>
		<p class="info-panel">{text}</p>
	</details>
{/snippet}

{#snippet tiles(list: Row[])}
	<ul class="tiles">
		{#each list as row (row.label)}
			<li class="tile">
				<p class="tile-label font-semibold">{row.label}</p>
				{@render info(
					row.target ? `${row.fine} Line: ${row.target.source}` : row.fine,
					'How this was measured'
				)}
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
			</li>
		{/each}
	</ul>
{/snippet}

<header class="top px-4 pt-5 sm:px-8">
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
		<span class="clients">
			<span class="plus" aria-hidden="true">+</span>
			<img class="ftps" src={logo} alt="First Touch Payment Solutions" width="179" height="48" />
			<span class="plus" aria-hidden="true">&amp;</span>
			<img class="se" src={seLogo} alt="Software Earnings" width="262" height="94" />
		</span>
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

<main class="mx-auto grid max-w-4xl grid-cols-1 gap-14 px-4 py-12 sm:px-8 sm:py-16">
	<OfferGate {offer} builtAt={context.builtAt}>
		<section class="hero relative isolate grid gap-4" aria-labelledby="offer-title">
			<span class="hero-mark" aria-hidden="true">
				{#if markSrc}
					<img src={markSrc} alt="" width="416" height="416" />
				{:else}
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html voidMark}
				{/if}
			</span>
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
						>{ENGINEER.name.split(' ')[0]} built both of your new sites and is your contact for anything
						you need.</strong
					>
					{bioLine}
				</p>
				<p class="promise">
					<span class="badge">Always a human, never a bot</span>
					When you write to us, {ENGINEER.name.split(' ')[0]} answers. AI agents do the upkeep behind
					the scenes; every conversation is with a person.
				</p>
				<p class="flex flex-wrap gap-x-5 gap-y-1 text-sm">
					<a href="mailto:{ENGINEER.email}">{ENGINEER.email}</a>
					<a href={ENGINEER.linkedin} rel="noreferrer">LinkedIn</a>
				</p>
			</div>
		</section>

		<div class="grid grid-cols-1 gap-14">
			{#each figures.sites as site (site.id)}
				<section class="site grid grid-cols-1 gap-6" aria-labelledby="site-{site.id}">
					{@render info(
						`Measured ${site.measured} on ${site.pages} pages of both versions, as a phone loads them.`,
						'When and how these were measured'
					)}
					<div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 pr-8">
						<h2 id="site-{site.id}" class="site-name">{site.name}</h2>
						<div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-semibold">
							<a href={site.preview} rel="noreferrer">Open the rebuilt site</a>
							<a href="{site.preview}site-comparison/" rel="noreferrer">Full comparison</a>
						</div>
					</div>

					<a class="preview" href={site.preview} rel="noreferrer">
						<span class="frame">
							<span class="chrome" aria-hidden="true">
								<span class="dots"><span></span><span></span><span></span></span>
								<span class="host">{new URL(site.preview).host}</span>
								<span class="spacer"></span>
							</span>
							<img
								src={asset(`shots/${site.id}-desktop-1280.webp`)}
								srcset="{asset(`shots/${site.id}-desktop-640.webp`)} 640w, {asset(
									`shots/${site.id}-desktop-1280.webp`
								)} 1280w"
								sizes="(min-width: 56rem) 760px, calc(100vw - 5rem)"
								alt="The rebuilt {site.name} home page on a computer"
								width="1280"
								height="800"
								loading="lazy"
								decoding="async"
							/>
						</span>
						<span class="phone">
							<img
								src={asset(`shots/${site.id}-phone.webp`)}
								alt="The rebuilt {site.name} home page on a phone"
								width="300"
								height="503"
								loading="lazy"
								decoding="async"
							/>
						</span>
					</a>

					<p class="legend">
						<span><span class="swatch now"></span>{NOW}: your current site</span>
						<span><span class="swatch next"></span>{NEXT}: the site we rebuilt</span>
					</p>
					{@render tiles(site.rows)}

					{#if site.ai}
						<div class="grid gap-3">
							<h3 class="text-lg font-semibold">What AI assistants can read about you</h3>
							{@render tiles(site.ai.rows)}
						</div>
					{:else}
						<p class="fine">
							AI assistant checks have not been run on this site yet; running them is part of the
							upkeep.
						</p>
					{/if}
				</section>
			{/each}
		</div>

		<ConcernsList
			concerns={offer.concerns}
			title="What holds your current sites back"
			extra={evidence}
		/>

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
						{#each MOVE as line, i (line)}
							<li>
								{@render icon('yes')}{#if i === 0}<strong class="callout">{line}</strong
									>{:else}<span>{line}</span>{/if}
							</li>
						{/each}
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
			<p class="renewal">
				Your plan renews automatically each month, or each year on the annual plan, until you
				cancel. You can cancel any time from your billing page; your sites stay up to the end of the
				period you have paid for, and we email a reminder before each annual renewal.
			</p>
		</section>
	</OfferGate>

	<dialog
		class="shot"
		bind:this={shotDialog}
		aria-label="Screenshot"
		onclick={(e) => e.target === shotDialog && shotDialog?.close()}
		onclose={() => opener?.focus()}
	>
		{#if shot.src}
			<img src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} />
			<p>{shot.alt}.</p>
		{/if}
		<button type="button" onclick={() => shotDialog?.close()}>Close</button>
	</dialog>

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
	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		max-width: 56rem;
		margin: 0 auto;
	}
	.theme {
		display: grid;
		place-items: center;
		flex: none;
		width: 2.5rem;
		height: 2.5rem;
		border: 1px solid var(--offer-border);
		border-radius: 999px;
		background: var(--offer-surface);
		color: var(--offer-fg);
		cursor: pointer;
	}
	.theme:focus-visible,
	.info summary:focus-visible,
	.preview:focus-visible {
		outline: 2px solid var(--void-primary-text);
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
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.375rem 0.625rem;
		padding: 0.5rem 1.125rem;
		border-radius: 1.25rem;
		background: var(--void-night);
		color: #fff;
		box-shadow: 0 10px 30px -12px oklch(0.17 0.018 285 / 0.45);
	}
	:global([data-theme='dark']) .lockup {
		outline: 1px solid oklch(1 0 0 / 0.12);
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
		width: 26px;
		height: 26px;
	}
	.mark :global(svg),
	.hero-mark :global(svg),
	.mark img,
	.hero-mark img {
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
	.clients {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}
	.ftps {
		display: block;
		height: 30px;
		width: auto;
	}
	.se {
		display: block;
		height: 30px;
		width: auto;
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
	.face {
		flex: none;
		width: 4.5rem;
		height: 4.5rem;
		border-radius: 999px;
		object-fit: cover;
		box-shadow: 0 0 0 1px var(--offer-border);
	}
	.promise {
		font-size: 0.9375rem;
		color: var(--offer-muted);
	}
	.badge {
		display: inline-block;
		margin: 0 0.5rem 0.25rem 0;
		padding: 0.125rem 0.625rem;
		border-radius: 999px;
		background: oklch(0.6534 0.1876 301.62 / 0.14);
		color: var(--void-primary-text);
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

	/* The rebuilt site in the main site's browser frame (BrowserFrame on /websites),
	   with a phone overlapping its corner. */
	.preview {
		position: relative;
		display: block;
		padding: 0 1.5rem 1.5rem 0;
		border-radius: 0.75rem;
	}
	.frame {
		display: block;
		overflow: hidden;
		border: 1px solid oklch(1 0 0 / 0.1);
		border-radius: 0.75rem;
		background: oklch(0.21 0.015 285);
		box-shadow: 0 24px 60px -30px oklch(0 0 0 / 0.8);
	}
	.chrome {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.875rem;
		border-bottom: 1px solid oklch(1 0 0 / 0.08);
	}
	.dots {
		display: flex;
		gap: 0.375rem;
	}
	.dots span {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 999px;
		background: oklch(1 0 0 / 0.15);
	}
	.host {
		margin: 0 auto;
		overflow: hidden;
		padding: 0.125rem 0.75rem;
		border-radius: 0.375rem;
		background: oklch(1 0 0 / 0.06);
		color: oklch(1 0 0 / 0.6);
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
		min-width: 5.5rem;
		padding: 0.3rem;
		border-radius: 1.1rem;
		background: oklch(0.21 0.015 285);
		box-shadow:
			0 0 0 1px oklch(1 0 0 / 0.1),
			0 20px 40px -18px oklch(0 0 0 / 0.7);
	}
	.phone img {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 0.8rem;
	}

	/* Method notes behind an "i": a native disclosure, so it works by touch, keyboard and
	   without JavaScript; the page script adds Escape and click-outside to close. */
	.info {
		position: relative;
	}
	.tile > .info {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
	}
	.site > .info {
		position: absolute;
		top: 2.75rem;
		right: 0;
	}
	.info summary {
		display: grid;
		place-items: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 999px;
		color: var(--offer-muted);
		cursor: pointer;
		list-style: none;
	}
	.info summary::-webkit-details-marker {
		display: none;
	}
	/* Quiet at rest, full strength when hovered, focused or open. */
	.info summary {
		opacity: 0.55;
		transition: opacity 0.15s;
	}
	.info summary:hover,
	.info summary:focus-visible,
	.info[open] summary {
		opacity: 1;
		color: var(--void-primary-text);
		background: var(--void-track);
	}
	.info svg {
		fill: none;
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linecap: round;
	}
	.info-panel {
		position: absolute;
		z-index: 2;
		top: 2rem;
		right: 0;
		width: min(17rem, calc(100vw - 4rem));
		padding: 0.75rem 0.875rem;
		border: 1px solid var(--offer-border);
		border-radius: 0.75rem;
		background: var(--offer-surface);
		color: var(--offer-muted);
		font-size: 0.8125rem;
		font-weight: 400;
		line-height: 1.45;
		box-shadow: 0 16px 32px -16px oklch(0 0 0 / 0.35);
	}
	.tile-label {
		padding-right: 2rem;
	}

	/* Dark theme surfaces: the main site's glass (GlassCard: bg-background/8 with
	   backdrop blur 2px, brightness 2.1, contrast 1.3, and its inset rim and shadow).
	   Without backdrop-filter they fall back to a faint white tint. */
	:global([data-theme='dark']) :is(.tile, .choice > div, .engineer, .items li, .longer, .shot) {
		border-color: transparent;
		background: oklch(1 0 0 / 0.05);
		box-shadow:
			inset 0 1px 0 0 oklch(1 0 0 / 0.08),
			inset 0 0 0 1px oklch(1 0 0 / 0.07),
			0 16px 36px -20px oklch(0 0 0 / 0.65);
	}
	@supports (backdrop-filter: blur(2px)) {
		:global([data-theme='dark']) :is(.tile, .choice > div, .engineer, .items li, .longer, .shot) {
			background: oklch(0.17 0.018 285 / 0.08);
			backdrop-filter: blur(2px) brightness(2.1) contrast(1.3);
		}
	}

	.evidence {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}
	.thumb {
		display: grid;
		gap: 0.25rem;
		width: 9rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--offer-muted);
	}
	.thumb img {
		display: block;
		width: 100%;
		height: 5.5rem;
		object-fit: cover;
		object-position: center;
		border: 1px solid var(--offer-border);
		border-radius: 0.5rem;
	}
	.thumb:hover img,
	.thumb:focus-visible img {
		outline: 2px solid var(--void-primary-text);
		outline-offset: 2px;
	}
	.evidence-note {
		flex-basis: 100%;
		font-size: 0.75rem;
		color: var(--offer-muted);
	}
	/* Centered in the viewport and never taller than it, so the page never scrolls. */
	.shot {
		position: fixed;
		inset: 0;
		margin: auto;
		width: fit-content;
		height: fit-content;
		max-height: calc(100dvh - 2rem);
		overflow: auto;
		max-width: min(40rem, calc(100vw - 2rem));
		padding: 1rem;
		border: 1px solid var(--offer-border);
		border-radius: 1rem;
		background: var(--offer-surface);
		color: var(--offer-fg);
	}
	.shot::backdrop {
		background: oklch(0 0 0 / 0.6);
	}
	.shot img {
		display: block;
		max-width: 100%;
		max-height: calc(100dvh - 11rem);
		width: auto;
		height: auto;
		margin: 0 auto;
		border-radius: 0.5rem;
	}
	.shot p {
		margin: 0.75rem 0;
		font-size: 0.875rem;
		color: var(--offer-muted);
	}
	.shot button {
		padding: 0.5rem 1.25rem;
		border: 0;
		border-radius: 999px;
		background: var(--void-primary-strong);
		color: #fff;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
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
		right: 0;
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

	/* Each site is its own section on the page background: a rule and space above,
	   not a card around the tiles. */
	.site-name {
		margin: 0;
		font-size: 1.75rem;
	}
	.site {
		position: relative;
		padding-top: 2.5rem;
		border-top: 1px solid var(--offer-border);
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
		position: relative;
		display: grid;
		gap: 0.5rem;
		padding: 1rem 1.125rem;
		border: 1px solid var(--offer-border);
		border-radius: 1rem;
		background: var(--offer-surface);
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
		background: var(--void-track);
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
		fill: var(--void-icon-no);
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
		.face {
			width: 7rem;
			height: 7rem;
		}
		.engineer {
			align-items: center;
			padding: 1.5rem 2rem;
		}
		.plus {
			font-size: 1.625rem;
		}
		.ftps {
			height: 42px;
		}
		.se {
			height: 40px;
		}
		.lockup {
			flex-wrap: nowrap;
			border-radius: 999px;
		}
		.preview {
			padding: 0 2.5rem 2.5rem 0;
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
			padding-top: 3rem;
		}
	}
</style>
