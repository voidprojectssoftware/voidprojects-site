<script lang="ts">
	import './theme.css';
	import logo from './logo.png?inline'; // inlined so no asset path, which carries the offer id, sits in the script
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

	// svelte-ignore state_referenced_locally
	let selection = $state(initialSelection(offer));

	let plan = $derived(offer.plans[0]);
	let monthly = $derived(priceFor(plan, 'month')?.amount ?? 0);
	let yearly = $derived(priceFor(plan, 'year')?.amount ?? 0);
	const money = (cents: number) => formatAmount(cents, offer.currency);

	const COVERS = [
		{
			title: 'Hosting for both sites',
			detail:
				'firsttouchpaymentsolutions.com and softwareearnings.com, served as fast static pages, as measured above.'
		},
		{
			title: 'Security and dependency updates',
			detail:
				'We keep the code and the tools each site is built with up to date, and apply security fixes as they come out.'
		},
		{
			title: 'Watching that both sites stay up',
			detail:
				'We keep an eye on both sites and deal with problems when they appear. Hosting providers can have outages, so no site can promise it never goes down, but you will not be the one who has to notice.'
		},
		{
			title: 'Small content edits',
			detail:
				'Text, photos, hours, prices and similar changes, at no extra charge, within reason. Bigger additions we price with you first.'
		},
		{
			title: 'Search engine and AI assistant upkeep',
			detail:
				'We re-run the measurements on this page as search engines and AI tools change, and keep both sites easy for them to read: structured data, sitemaps, page outlines and the llms.txt summary.'
		}
	];
</script>

{#snippet rows(list: { label: string; note: string; before: string; after: string }[])}
	<div class="figures">
		<div class="figures-head" aria-hidden="true">
			<span></span><span>Today</span><span>Rebuilt</span>
		</div>
		<ul>
			{#each list as row (row.label)}
				<li>
					<div>
						<p class="font-semibold">{row.label}</p>
						<p class="text-sm text-(--offer-muted)">{row.note}</p>
					</div>
					<p class="value"><span class="who">Today</span>{row.before}</p>
					<p class="value after"><span class="who">Rebuilt</span>{row.after}</p>
				</li>
			{/each}
		</ul>
	</div>
{/snippet}

<header class="band">
	<div class="mx-auto flex max-w-4xl items-center px-4 py-5 sm:px-8">
		<img src={logo} alt="First Touch Payment Solutions" width="179" height="48" />
	</div>
</header>

<main class="mx-auto grid max-w-4xl gap-14 px-4 py-12 sm:px-8 sm:py-16">
	<OfferGate {offer} builtAt={context.builtAt}>
		<section class="grid gap-4" aria-labelledby="offer-title">
			<p class="text-sm font-semibold tracking-wide text-(--offer-accent) uppercase">
				Prepared for {offer.prospect} and Software Earnings
			</p>
			<h1 id="offer-title" class="text-4xl leading-tight sm:text-5xl">
				Both of your new websites, hosted and looked after
			</h1>
			<p class="max-w-2xl text-lg text-(--offer-muted)">
				We rebuilt the First Touch Payment Solutions and Software Earnings websites. For {money(
					monthly
				)} a month we host both, keep them secure and up to date, and keep them easy for search engines
				and AI assistants to read.
			</p>
		</section>

		<section class="grid gap-8" aria-labelledby="offer-sites">
			<div>
				<h2 id="offer-sites">Your two rebuilt sites, measured</h2>
				<p class="max-w-2xl text-(--offer-muted)">
					The same tests on each current site and its rebuild, on the same pages, as a phone visitor
					loads them. Each rebuild has a full comparison page with every check, page by page.
				</p>
			</div>

			{#each figures.sites as site (site.id)}
				<article class="site grid gap-5" aria-labelledby="site-{site.id}">
					<div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
						<h3 id="site-{site.id}" class="serif text-2xl">{site.name}</h3>
						<div class="flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
							<a href={site.preview} rel="noreferrer">Open the rebuilt site</a>
							<a href="{site.preview}site-comparison/" rel="noreferrer">See the full comparison</a>
						</div>
					</div>

					{@render rows(site.rows)}

					{#if site.ai}
						<div class="grid gap-3">
							<h4 class="text-lg font-semibold">What AI assistants can read</h4>
							<p class="text-sm text-(--offer-muted)">
								We took {site.ai.facts} facts the current site states (names, phone numbers, the address,
								products, people) and checked which of them a program can find on each page, {site
									.ai.checks} checks in all, reading the pages without running their scripts.
							</p>
							{@render rows(site.ai.rows)}
						</div>
					{:else}
						<p class="text-sm text-(--offer-muted)">
							AI assistants: we have not yet run the AI assistant measurements on the First Touch
							site that we ran on Software Earnings. Running them, and acting on what they find, is
							part of the upkeep this plan covers.
						</p>
					{/if}

					<p class="text-sm text-(--offer-muted)">
						Measured {site.measured}, {site.pages} pages on both versions, the current site at {new URL(
							site.current
						).host}.
					</p>
				</article>
			{/each}
		</section>

		<ConcernsList concerns={offer.concerns} title="What we found on your current sites" />

		<section class="grid gap-4" aria-labelledby="offer-covers">
			<h2 id="offer-covers">What {money(monthly)} a month covers</h2>
			<p class="max-w-2xl text-(--offer-muted)">One price for both sites together.</p>
			<ul class="covers">
				{#each COVERS as item (item.title)}
					<li>
						<p class="font-semibold">{item.title}</p>
						<p class="text-(--offer-muted)">{item.detail}</p>
					</li>
				{/each}
			</ul>
		</section>

		<section class="grid gap-8" aria-label="Sign up">
			<PlanPicker {offer} bind:selection title="Monthly or a year ahead" />
			<div class="longer">
				<p class="font-semibold">Paying further ahead</p>
				<p class="text-(--offer-muted)">
					Paying a year ahead takes two months off: {money(yearly)} a year instead of {money(
						monthly * 12
					)}. Longer terms are available on request at the same rate, for example {money(
						yearly * 2
					)} for two years or {money(yearly * 3)} for three. Checkout handles monthly and yearly; for
					a longer term, reply to the message that brought you here, or write to
					<a href="mailto:hello@voidprojects.ai">hello@voidprojects.ai</a>, and we will set it up
					with you.
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

	<footer class="border-t border-(--offer-border) pt-6 text-sm text-(--offer-muted)">
		Offer open through {formatDate(offer.expires)}. Made by Void Projects.
	</footer>
</main>

<style>
	.band {
		background: var(--ftps-grey);
		border-bottom: 4px solid var(--ftps-lime);
	}
	.band img {
		display: block;
		height: 48px;
		width: auto;
	}
	a {
		color: var(--offer-accent);
		text-underline-offset: 0.2em;
	}
	a:hover {
		text-decoration: underline;
	}
	.site {
		padding: 1.5rem;
		border: 1px solid var(--offer-border);
		border-top: 4px solid var(--offer-accent);
		border-radius: var(--offer-radius);
		background: var(--offer-surface);
	}
	.figures ul,
	.covers {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.figures li {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.25rem 1rem;
		padding: 0.75rem 0;
		border-top: 1px solid var(--offer-border);
	}
	.figures li > div {
		grid-column: 1 / -1;
	}
	.value {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.value {
		white-space: nowrap;
	}
	.value.after {
		color: var(--offer-accent);
	}
	.who {
		display: block;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--offer-muted);
	}
	.figures-head {
		display: none;
	}
	.covers {
		display: grid;
		gap: 0.75rem;
	}
	.covers li,
	.longer {
		padding: 1rem 1.25rem;
		border: 1px solid var(--offer-border);
		border-left: 4px solid var(--ftps-lime);
		border-radius: var(--offer-radius);
		background: var(--offer-surface);
	}
	p {
		margin: 0;
	}

	/* Wide screens: the two values sit in columns beside the label, under one header. */
	@media (min-width: 40rem) {
		.figures li,
		.figures-head {
			grid-template-columns: 1fr 7.5rem 7.5rem;
			align-items: center;
		}
		.figures li > div {
			grid-column: auto;
		}
		.figures-head {
			display: grid;
			gap: 1rem;
			padding-bottom: 0.5rem;
			font-size: 0.8125rem;
			font-weight: 600;
			color: var(--offer-muted);
		}
		.who {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
	}
</style>
