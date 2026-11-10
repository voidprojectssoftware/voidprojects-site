// Integrity Real Estate Services (Southaven, MS): hosting and upkeep for the rebuilt site at
// integrityrealestateservices-website.pages.dev. A `_` draft (integrityrealestateservices-
// website issue #10, part 1), never built. Facts are from that repo at main `5d8d483`:
// docs/discovery/ and its 2026-11-09 baseline audit, cited per concern below.
//
// Concern order follows the owner's framing for this client (issue #10): lead with how the
// site looks, feels and loads; the search basics come last because the business already
// accepts the rebuild wins on search and AI assistants.
import { defineOffer, type OfferInput } from '$lib/offers/offer.js';

// `sent` is left out on purpose: it is the day the owner sends the link. On main today
// OfferInput still requires it, and open PRs #99 and #106 each make it optional (and make
// resolveOffer refuse to build an offer without it). This folder does not change shared
// code, so it types itself as OfferInput without `sent` and casts once. When #99 or #106
// lands, the cast still holds; when the owner sets `sent`, drop the Omit and the cast.
const draft = {
	prospect: 'Integrity Real Estate Services', // client docs/discovery/atlas/facts.md §1, the `<title>` and every logo `alt`
	// sent: not set (see above).
	previewUrl: 'https://integrityrealestateservices-website.pages.dev', // client astro.config.mjs `site`, ADR 0003
	concerns: [
		{
			// docs/discovery/seo-audit/2026-11-09-baseline/summary.md, "Lighthouse, mobile
			// (medians)": home LCP 22.5 s, 4034 KB, 46 requests; README.md "In short", Speed:
			// first paint about 21.4 s (hence "more than 20 seconds"), "its 35 images are inlined into the HTML as base64 ...
			// so nothing paints until the whole document has arrived".
			// docs/discovery/atlas/observations.md item 1: one 5.4 MB HTML file, 34 images and a
			// 1.2 MB video inside it. 2.5 s is Google's "good" mark for the main content.
			title: 'On a phone, your site takes about 22 seconds to appear',
			detail:
				'In Google’s own phone test, the main part of your home page took 22.5 seconds to show. The page is about 4 MB, because every photo and the HGTV clip are packed into one file, so a phone has to download all of it before it can show the first screen.',
			impact:
				'Google’s mark for a page that feels fast is 2.5 seconds. Someone on a phone looking for an agent waits more than 20 seconds before anything at all appears.'
		},
		{
			// docs/discovery/atlas/observations.md item 2 (twelve `.reveal` blocks at opacity 0
			// until the script runs; with JavaScript off, blank black where About, Owners,
			// Brokers, Video, Services, Buy / Sell, Testimonials and the contact block should be;
			// "Office hours exist only inside one of those blocks"; screens/home-1280x800-no-
			// javascript-full.jpg). docs/discovery/atlas/functionality.md #6.
			title: 'Most of your page stays blank until a script runs',
			detail:
				'Your About section, your owners and brokers, the HGTV clip, your services, the buying and selling steps, your testimonials and the contact block all start invisible and are faded in by a script. If that script does not run, those sections stay blank black, and your office hours are inside one of them.',
			impact:
				'A browser that blocks or fails to run the script shows your hero, your agents and your footer, with empty space between them.'
		},
		{
			// docs/discovery/atlas/observations.md item 3 ("No `<form>`, no endpoint: 'Send
			// Message' opens the visitor's mail app with a pre-filled `mailto:` to a Gmail
			// address. A visitor without a configured mail app gets a green button and nothing
			// sent."); functionality.md #1; facts.md row `integrityrealestatemanager@gmail.com`
			// (in the script only).
			title: 'Your contact form does not send anything itself',
			detail:
				'Pressing “Send Message” does not send the message. It opens the visitor’s own email app with the message filled in, and they still have to send it from there.',
			impact:
				'A visitor whose phone or computer has no email app set up sees the button flash green with “Opening Email...”, and nothing reaches you.'
		},
		{
			// docs/discovery/atlas/observations.md item 5; facts.md §2, rows "Broker:
			// 662.580.8910" and "`tel:6625805910` ... Dials 662-580-5910, which the page never
			// prints"; functionality.md #8.
			title: 'The broker number in your footer dials a different number',
			detail:
				'Your footer shows “Broker: 662.580.8910”, but tapping it on a phone calls 662-580-5910.',
			impact:
				'Someone trying to reach your broker from the footer calls a number your site never shows them.'
		},
		{
			// docs/discovery/atlas/functionality.md #12 ("26 cards ... No per-agent page, no
			// email, no link, no bio except the two brokers"); observations.md item 8 (4,144 px
			// on desktop, about 26 screens on a phone, no search or filter by state);
			// docs/discovery/context.md: every competitor site that could be read has agent pages.
			title: 'Your 26 agents share one page, with no page of their own',
			detail:
				'Every agent is a card on your home page: a photo, their states and a phone number. None has a page of their own, and there is no way to search the list or narrow it by state. On a phone the list runs about 26 screens long.',
			impact:
				'There is no page to send a client to for one agent, and nothing for a search on an agent’s name to land on. Each of the other brokerage sites near you that we could read has agent pages.'
		},
		{
			// docs/discovery/atlas/functionality.md #10 ("None. No listings, no search, no MLS
			// widget"); observations.md item 9; docs/discovery/context.md (every competitor site
			// that could be read has IDX listing search); open-questions.md question 1 (MLS
			// membership and IDX are not public). The rebuild shows no listings until there is
			// a feed: client ADR 0009, decision 2.
			title: 'Visitors cannot look at homes on your site',
			detail:
				'“Find Your Home” opens a list of six steps, not homes. There are no listings and no home search. Each of the other brokerage sites near you that we could read has one.',
			impact:
				'Showing listings depends on your MLS membership and a listings feed (IDX), which is your decision. Until then, the new site sends home searchers straight to an agent.'
		},
		{
			// docs/discovery/seo-audit/2026-11-09-baseline/README.md, "In short" and "Still
			// missing: a meta description, a canonical, robots.txt, a sitemap, share-card tags,
			// and any structured data naming the business, its address, phone or hours";
			// summary.md (Desc len none, JSON-LD none, sitemap none found, robots.txt 404).
			// docs/discovery/atlas/observations.md item 15.
			title: 'Search engines get only your name to go on',
			detail:
				'Your page has no description for search results, no list of pages for Google, and none of the behind-the-scenes details (address, phone, hours) that search engines and AI assistants read directly.',
			impact:
				'Google has to guess what to show under your name, and your office’s details are left for it to dig out of the page.'
		}
	],
	plans: [
		{
			id: 'website',
			label: 'Your new website, hosted and looked after',
			summary: 'Hosting, security and upkeep for the new Integrity Real Estate Services website.', // also Stripe Checkout's line description
			// Each from the published terms, src/routes/terms/+page.svelte (/terms), by section
			// anchor: #what-you-get (first three lines), #who-owns-what (domain, files,
			// portfolio), #cancelling-and-refunds (two lines), #late-or-failed-payments and
			// #billing (late fees, renewal reminder). The same lines as Howard's offer and #106.
			features: [
				'No build fee and no minimum term',
				'Hosting, security updates and routine upkeep for as long as you subscribe',
				'Small changes (text, photos, hours, prices) at no extra charge, within reason',
				'Your domain stays yours, and you can move it away from us any time',
				'Monthly: cancel any time, no cancellation fee',
				'Annual: full refund within 15 days of the first payment, less the domain’s registration fee',
				'Your site’s files are yours to take, free, for a year after you leave, to host anywhere',
				'No late fees, and a reminder about 14 days before each annual renewal',
				'In our portfolio only if you say yes'
			],
			// OWNER: price not set. PLACEHOLDER copied from Howard's offer
			// (offers/orebabrmoseow8vsknfk, the owner's $50/month of 2026-11-07), as PR #106
			// does. Annual defaults to ANNUAL_MONTHS_CHARGED (10) x monthly: $500 a year. No
			// setup fee: the offer model has none and /terms #what-you-get says "no build fee".
			monthly: 5000
		}
	],
	// Optional add-ons, each priced here and only here (the checkout reads this file, never
	// the browser). Every price is a PLACEHOLDER copied from Howard's offer, with that
	// offer's cost basis (see offers/orebabrmoseow8vsknfk/offer.ts). No /terms section
	// covers email or a Google Business Profile, so no summary cites one.
	addOns: [
		{
			id: 'email-mailbox-or-forwarding',
			group: 'Email at your own domain',
			label: 'One mailbox, or forwarding',
			summary:
				'One mailbox at your own domain, or addresses at your domain that forward to an inbox you already use. We set it up and keep it working.',
			// OWNER: price not set; placeholder $10/month (Howard's). The only address on the
			// site is a Gmail one, in the contact form's script (facts.md, email row), so
			// forwarding to the inbox they already use fits.
			monthly: 1000
		},
		{
			id: 'email-microsoft-365',
			group: 'Email at your own domain',
			label: 'Microsoft 365 Business Standard',
			summary:
				'A Microsoft 365 business subscription for each person you choose, each with email at your own domain. Priced per person. We set it up and manage the subscription for you.',
			// OWNER: price not set; placeholder $25 per person per month (Howard's). Seats: the
			// roster has 26 agent cards (atlas/agents.json), more than Howard's cap of 25, so
			// the cap is 30; no source says how many would want a mailbox, so the default is 1.
			monthly: 2500,
			seats: { min: 1, max: 30, default: 1, unit: 'person', units: 'people' }
		},
		{
			id: 'google-business-profile',
			label: 'A Google Business Profile, set up and looked after',
			summary:
				'We set up your Google Business Profile with you (Google asks the business itself to verify it), or take over looking after one you already have. Then we keep its hours, phone, website and photos matching your site, and make the changes you ask for.',
			// OWNER: price not set; placeholder $20/month (Howard's). Discovery did not locate
			// a profile (docs/discovery/web-presence.md: "not seen", the search tool shows no
			// business panel), and open question 22 asks whether they have one, so the wording
			// covers both setting one up and taking one over. Drop it if they have one they
			// already look after.
			monthly: 2000
		}
	],
	// Figures: figures.json beside this file, computed by figures.mjs from the client
	// repo's committed runs (main 43f989a) with that repo's own comparison code, so the
	// page shows what its /site-comparison/ page shows (issue #10, part 2).
	contact: {
		name: 'Lawrence and Courtney Perkins', // business-profile.md, Owners: "Lawrence & Courtney Perkins" (SITE); Courtney is the principal broker
		phone: '662-510-8001', // facts.md §2, "Office: 662-510-8001", the only number the site calls the office; evidenced
		email: 'integrityrealestatemanager@gmail.com', // facts.md, email row: in the contact form's script only, never printed; evidenced, machine-only
		note: 'Nothing has been confirmed with the brokerage yet. The office number is the one the site prints everywhere; the broker number it shows is 662.580.8910, though its footer link dials 662-580-5910 (facts.md §2). The Gmail address appears only inside the contact form script, so confirm the best address on first contact.'
	}
} satisfies Omit<OfferInput, 'sent'>;

export default defineOffer(draft as OfferInput);
