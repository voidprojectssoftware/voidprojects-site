// Spirit Hill Maple Nursery (Millington, TN): hosting and upkeep for the rebuilt site at
// spirithillmaplenursery-website.pages.dev. A `_` draft (spirithillmaplenursery-website
// issue #9, part 1), never built. Facts are from that repo at main `ea5f46b`:
// docs/discovery/ and its 2026-11-08 baseline runs, cited per concern below.
import { defineOffer } from '$lib/offers/offer.js';

export default defineOffer({
	prospect: 'Spirit Hill Maple Nursery', // the header wordmark, client src/config/site.ts `site.name`
	// sent: not set. It is the day the owner sends the link; resolveOffer refuses to
	// build an offer without it, so removing the `_` forces the choice.
	previewUrl: 'https://spirithillmaplenursery-website.pages.dev',
	concerns: [
		{
			// docs/discovery/atlas/observations.md item 1: document 1350 px wide in a 1280 px
			// window on all 43 pages, "HOME" shows as "OME" (scrollWidth, every page;
			// screens/home-1280x800-full.jpg).
			title: 'Your site is wider than a laptop screen',
			detail:
				'In a laptop window 1,280 pixels wide, every page of your site is 1,350 pixels wide. It scrolls sideways, and the first menu item reads “OME” instead of “HOME”.',
			impact: 'The first thing a visitor on a laptop sees looks broken.'
		},
		{
			// observations.md item 2 ("Spirit Hill Map[cart]Nursery", iPhone 15 capture of every
			// page) and item 3 (the phone menu has no "PURCHASE A GIFT CARD").
			title: 'On a phone, the cart icon sits on your name',
			detail:
				'The header on every page reads “Spirit Hill Map”, with the cart icon covering the rest of your name. The phone menu also leaves out the gift card, the one thing your site sells.',
			impact:
				'A phone visitor’s first look is a broken name, and the menu offers no way to the gift card.'
		},
		{
			// observations.md item 15 (trees list 29,055 px tall on a phone, 32 cards, no
			// filter, sort, search or grouping) and item 9 (price tiers name no trees; no tree
			// page shows a price or size).
			title: 'Finding a tree on a phone means scrolling past all 32',
			detail:
				'Your trees page is 29,055 pixels tall on a phone: one long column of 32 trees, with no way to narrow it by sun, size or shape. No tree shows a price or a size, and the price tiers do not say which tree is in which.',
			impact:
				'Someone looking for a maple for a shady corner has to read every card, and still cannot tell what it costs.'
		},
		{
			// observations.md item 13 and atlas/brand.md contrast table: home buttons amber on
			// white 1.69:1, footer teal on sage 3.75:1. 4.5:1 is WCAG 2.2 AA for body text.
			// docs/discovery/seo-audit/2026-11-08-baseline/summary.md: axe color-contrast on all
			// 7 audited pages (figures.json, axe card, computes the page count).
			title: 'Some of your text is too faint to read',
			detail:
				'The amber buttons on your home page have a contrast of 1.69 to 1 against white, and your footer text 3.75 to 1. The accessibility standard asks for at least 4.5 to 1, and an automated test found text that falls short on every page we tested.',
			impact:
				'Visitors with weaker eyesight, or reading a phone outdoors, may not be able to read your buttons.'
		},
		{
			// docs/discovery/atlas/functionality.md, "Platform behavior", analytics and
			// advertising tags: Google Analytics 4, Google Ads and a Meta Pixel on every page,
			// desktop and phone, "No cookie or consent banner appeared in any capture", and
			// "the business's (or their marketer's) accounts configured in Wix". Recommendation
			// there: park, the business decides. observations.md item 21.
			title: 'Your site tracks visitors without telling them',
			detail:
				'Every page loads Google Analytics, Google Ads and Meta’s Facebook pixel, and no cookie or consent notice appears. They are tied to accounts set up in your Wix site, by you or perhaps by someone who runs ads for you.',
			impact:
				'Visitors are not told they are being tracked. Whether the new site carries any of these is your choice.'
		},
		{
			// docs/discovery/web-presence.md, Google Business Profile row: "none found. No
			// rating, review count, category or hours surfaced in two searches. Not found does
			// not mean absent: Google Maps was not opened." Hence the hedged wording.
			title: 'We could not find a Google Business Profile for you',
			detail:
				'Two searches turned up no Google listing for the nursery: no hours, category or rating. We did not look in Google Maps itself, so there may be one we missed.',
			impact:
				'A Business Profile is how Google shows your hours, directions and photos to someone searching for a nursery.'
		}
	],
	plans: [
		{
			id: 'website',
			label: 'Your new website, hosted and looked after',
			summary: 'Hosting, security and upkeep for the new Spirit Hill Maple Nursery website.', // also Stripe Checkout's line description
			// Each from the published terms, src/routes/terms/+page.svelte (/terms), by section
			// anchor: #what-you-get (first three lines), #who-owns-what (domain, files,
			// portfolio), #cancelling-and-refunds (two lines), #late-or-failed-payments and
			// #billing (late fees, renewal reminder). The same lines as Howard's offer.
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
			// (offers/orebabrmoseow8vsknfk, the owner's $50/month of 2026-11-07). Annual
			// defaults to ANNUAL_MONTHS_CHARGED (10) x monthly: $500 a year. No setup fee: the
			// offer model has none and /terms #what-you-get says "no build fee".
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
			// OWNER: price not set; placeholder $10/month (Howard's). The nursery's published
			// addresses are both Gmail (client src/config/site.ts `site.email`; open question 1
			// asks which one), so forwarding to an inbox they already use fits.
			monthly: 1000
		},
		{
			id: 'email-microsoft-365',
			group: 'Email at your own domain',
			label: 'Microsoft 365 Business Standard',
			summary:
				'A Microsoft 365 business subscription for each person you choose, each with email at your own domain. Priced per person. We set it up and manage the subscription for you.',
			// OWNER: price not set; placeholder $25 per person per month (Howard's). Seats: two
			// by default would assume the two owners want one each, which no source says, so 1.
			monthly: 2500,
			seats: { min: 1, max: 10, default: 1, unit: 'person', units: 'people' }
		},
		{
			id: 'google-business-profile',
			label: 'A Google Business Profile, set up and looked after',
			summary:
				'We set up your Google Business Profile with you (Google asks the business itself to verify it), or take over looking after one you already have. Then we keep its hours, phone, website and photos matching your site, and make the changes you ask for.',
			// OWNER: price not set; placeholder $20/month (Howard's). Discovery found no profile
			// (docs/discovery/web-presence.md), so this one includes setting it up.
			monthly: 2000
		}
	],
	// Figures: figures.json beside this file, computed by figures.mjs from the client
	// repo's committed runs (main baf05d0) with that repo's own comparison code, so the
	// page shows what its /site-comparison/ page shows (issue #9, part 2).
	contact: {
		name: 'Scot and Michelle Cowan', // business-profile.md, Owners: first names on the site, surname from one 2025 interview
		email: 'spirithillmaples@gmail.com', // client src/config/site.ts `site.email.display`, evidenced
		phone: '901-569-5745', // client src/config/site.ts `site.phones[0]` (Michelle), evidenced
		note: 'Both owners are reachable: Michelle at 901-569-5745 and Scot at 901-569-2271 (the contact page ties each number to a name). The footer email is spirithillmaples@gmail.com; the contact page alone shows spirithillmaplenursery@gmail.com (open question 1). Nothing has been confirmed with the nursery yet, so confirm the best address on first contact.'
	}
});
