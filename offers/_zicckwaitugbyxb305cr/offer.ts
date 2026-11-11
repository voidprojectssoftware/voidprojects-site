// Murphy's (bar and grill, 1589 Madison Ave, Memphis): hosting and upkeep for the rebuilt
// site at murphysmemphis-website.pages.dev (murphysmemphis-website issue #11). Facts are
// from that repo's docs/discovery/ at main 4d497dd, cited per concern below; the measured
// figures are its 2026-11-11-after-45 runs at main 91b0b5d (figures.json). Nobody at Murphy's has been contacted.
//
// A DRAFT: the folder name starts with "_", so the build and the API bundle skip it.
// `sent` is a required ISO date in OfferInput and only the owner may choose it, so it is
// left empty here; resolveOffer refuses an empty `sent`, so the folder cannot be
// published by dropping the "_" alone.
import { defineOffer } from '$lib/offers/offer.js';

// Group names are the picker's headings. page.svelte finds each group by an add-on id (it
// must not import this file, which holds `contact`) and adds the group's own copy.
const CONTENT_GROUP = 'Your events, menu and specials';
const EMAIL_GROUP = 'Business email';

// The owner, murphysmemphis-website issue #39 (quoted in docs/discovery/add-ons.md):
// "a $25/month static site", the published PRICING row (src/lib/content/websites.ts).
const PLAN_MONTHLY = 2500;
const SELF_MANAGED_MONTHLY = 2500; // SUGGESTED, see `events-self-managed`
const dollars = (cents: number) => `$${cents / 100}`;

export default defineOffer({
	prospect: 'Murphy’s', // murphysmemphis-website src/config/business.ts `business.name`
	// OWNER: set to the day you send the link (YYYY-MM-DD), then drop the "_" from the folder
	// name. Expiry (sent + 30 days) and the 90-day purge count from it.
	sent: '',
	previewUrl: 'https://murphysmemphis-website.pages.dev/',
	// Each concern is short on purpose: page.svelte shows a screenshot of it beside the words
	// (EVIDENCE there, keyed by title) and one line on what the new site does about it.
	concerns: [
		{
			// docs/discovery/atlas/observations.md item 1: http://murphysmemphis.com/ answers 301
			// to an old-style Wix address that answers 404; https:// presents a certificate that
			// expired 2022-09-12; www answers 404. docs/discovery/web-presence.md, "The domain":
			// printed on the shirts (owner photo 04); Yahoo Local, 901area and SinglePlatform list
			// it as the website. fact-validation-2026-11-11.md, "domain working": still false.
			// The screenshot (public/ev-domain.webp) is http://murphysmemphis.com/ loaded once on
			// 2026-11-11, which ended on https://murphysmemphis.wix.com/murphysmemphis, status 404.
			title: 'Your web address leads to an error page',
			detail:
				'murphysmemphis.com is on your shirts, and Yahoo, 901area and SinglePlatform list it. Typed into a browser, it ends here.'
		},
		{
			// docs/discovery/atlas/observations.md item 2; fact-validation-2026-11-11.md, the
			// "Monday-Saturday closes" and "Sunday closes" rows: Wix footer 3am against Google
			// 1 AM (read 2026-11-10 and 2026-11-11). Disputed; open question 8. Screenshots: the
			// atlas home page footer (atlas/screens/home-1280x800-full.png) and the Google Maps
			// listing (client-assets/research/2026-11-10/evidence/gbp2026-11-10-maps-limited-view.png),
			// cropped to the hours and website rows.
			title: 'Your closing time depends on where someone looks',
			detail: 'Your website says 3am. Google says 1am.'
		},
		{
			// docs/discovery/atlas/observations.md item 4: the events calendar is empty
			// (functionality.md row 3: "Empty for November 2026") while the home page says
			// "Check out our calendar for live music"; item 5, the Facebook link is dead.
			// Screenshot: atlas/screens/facilities-1280x800-full.png (the EVENTS page).
			title: 'Nobody online can find your next show',
			detail:
				'Your site sends people to this calendar for live music. It is empty, and the Facebook page it links to is gone.'
		},
		{
			// docs/discovery/atlas/observations.md item 12 (the Wix advertisement is the first
			// thing on every page, above the logo). Screenshot: atlas/screens/home-1280x800-full.png.
			title: 'Wix’s ad comes before your name',
			detail: 'Every page of your site opens with an advertisement for Wix, above your logo.'
		},
		{
			// docs/discovery/add-ons.md, "Email": "Murphy's has no business email anywhere
			// public" (the Wix site, Google, every listing, the 2013 site, press, the owner's
			// photos). atlas/observations.md item 15. open-questions.md items 5 and 27.
			// Screenshot: atlas/screens/location-1280x800-full.png (the CONTACT page).
			title: 'There is no email address for the bar',
			detail:
				'Your Contact page has a phone number and a form, but no email. We found none on Google or any listing either.'
		}
	],
	plans: [
		{
			id: 'website',
			label: 'Your new website, hosted and looked after',
			summary: 'Hosting, security and upkeep for the new Murphy’s website.', // also Stripe Checkout's line description
			// Each from the published terms, src/routes/terms/+page.svelte (/terms), by section
			// anchor: #what-you-get (first three lines), #who-owns-what (domain, files,
			// portfolio), #cancelling-and-refunds (two lines), #late-or-failed-payments and
			// #billing (late fees, renewal reminder).
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
			// PLAN_MONTHLY, above. Annual defaults to ANNUAL_MONTHS_CHARGED (10) x monthly.
			monthly: PLAN_MONTHLY
		}
	],
	// Optional add-ons, each priced here and only here (the checkout reads this file, never
	// the browser). Add-ons sharing a `group` are alternatives: the picker shows them as
	// radios with "None", and /api/offer-checkout refuses two from one group. For the
	// content group, page.svelte relabels "None" as what the plan already includes: we make
	// the updates, the same day, when they email, text or call (the owner, offer review
	// 2026-11-11; see the note on it in page.svelte).
	//
	// OWNER: EVERY ADD-ON PRICE BELOW IS A SUGGESTION PENDING YOUR DECISION, except that you
	// confirmed offering the Google Business Profile add-on (its $20 price is still a
	// suggestion). Costs and reasoning: murphysmemphis-website docs/discovery/add-ons.md,
	// "Recommendation" and the sections it links, read 2026-11-11. No /terms section covers
	// listings, events or email, so no summary cites one.
	addOns: [
		{
			id: 'google-business-profile',
			label: 'Your Google listing, looked after',
			summary:
				'We keep your Google listing’s hours, phone, website and photos right and matching your site, add holiday hours, post your monthly specials, and make the changes you ask for.',
			// SUGGESTED $20/month (annual 10 x: $200). Howard's figure for the same work. Cost:
			// the profile is free; our time, an estimate of under an hour a month. Needs us added
			// as a Manager (add-ons.md, table row and "Profiles we could manage").
			monthly: 2000
		},
		{
			id: 'other-listings',
			label: 'Yelp, Apple Maps and Bing, kept right',
			summary:
				'The same hours, phone and address kept right on Yelp, Apple Maps and Bing, so every map app agrees with your site.',
			// SUGGESTED $15/month (annual 10 x: $150). All three platforms free; our time about
			// an hour a month, an estimate (add-ons.md, `other-listings` row).
			monthly: 1500
		},
		{
			id: 'events-self-managed',
			group: CONTENT_GROUP,
			label: 'Manage it yourself',
			summary: `A sign-in for you and your staff to add and change shows, menu items and specials on the site yourselves, any time. Brings your plan to ${dollars(PLAN_MONTHLY + SELF_MANAGED_MONTHLY)} a month.`,
			// The owner (issue #39, and the offer review 2026-11-11): posting to the site
			// yourself moves the plan to a $50 minimum. Modelled as an alternative in one group
			// rather than a second plan, so checkout refuses both together and plan + this
			// add-on is the $50 floor exactly; the summary's figure is that sum, monthly.
			// SUGGESTED $25/month on top of the plan. Cost $0 to $5 (Workers, D1, Access free
			// tiers); about an hour a month of upkeep, an estimate; the menu and specials ride on
			// the same login at no further charge (add-ons.md, "Self-managed" and "Does anything
			// else move the plan to $50"). Needs server-side code on the site: an ADR and an
			// owner decision before it is built (add-ons.md, option b). The sign-in page is one
			// of our services, so per /terms #who-owns-what it stops working if they leave.
			monthly: SELF_MANAGED_MONTHLY
		},
		{
			id: 'events-by-us',
			group: CONTENT_GROUP,
			label: 'We post your events everywhere',
			summary:
				'Send us the month’s flyer or a list. Beyond your site, we post every show to your Google listing (if we look after it), the Memphis Flyer’s calendar and the other event listings we know of. Up to about 12 shows a month, within reason.',
			// The owner, offer review 2026-11-11: "If they want us to manage the whole thing and
			// post to any additional event sites we are aware of, we can do that as well."
			// SUGGESTED $25/month (annual 10 x: $250). Cost $0 (Google posts and the Flyer's
			// calendar are free to submit); time 5 to 10 minutes a show, 1 to 2 hours for about
			// 10 shows, an estimate (add-ons.md, "Events", "Published by us").
			monthly: 2500
		},
		{
			id: 'email-forwarding',
			group: EMAIL_GROUP,
			label: 'Email addresses that forward',
			summary:
				'Addresses at murphysmemphis.com, such as shows@ or info@, forwarded to an inbox you already have, a personal one included. We set them up and keep them working.',
			// SUGGESTED $10/month (annual 10 x: $100). Howard's figure. Cost $0 (Cloudflare
			// Email Routing); needs the domain's DNS on Cloudflare, which launch needs anyway
			// (add-ons.md, "Email" option 1 and "Domain").
			monthly: 1000
		},
		{
			id: 'email-mailbox',
			group: EMAIL_GROUP,
			label: 'A mailbox for each person',
			summary:
				'A real mailbox at murphysmemphis.com for each person you choose, on Google Workspace or Microsoft 365. Priced per person. We set it up and manage the subscription.',
			// SUGGESTED $15 per person per month (annual 10 x: $150 per person). Cost: Google
			// Workspace Business Starter $7.00 per user per month (workspace.google.com/pricing,
			// read 2026-11-11) or Microsoft 365 Business Basic $7.00 on an annual commitment;
			// about $8 for setup (MX, SPF, DKIM, DMARC) and upkeep (add-ons.md, "Email" option 2).
			// Seats: 1 by default; the cap of 10 is a suggestion for a bar's staff, not a count
			// of Murphy's people, which no source gives.
			monthly: 1500,
			seats: { min: 1, max: 10, default: 1, unit: 'person', units: 'people' }
		},
		{
			id: 'review-replies',
			label: 'Your reviews, watched and answered',
			summary:
				'We watch for new Google reviews (and Yelp, if we keep your listings) and reply in your voice, from replies you approve first.',
			// SUGGESTED $15/month (annual 10 x: $150). Free platforms; about an hour a month, an
			// estimate. Needs Google Manager access (add-ons.md, `review-replies` row and "Other
			// suggestions").
			monthly: 1500
		}
	],
	// Figures: figures.json beside this file, computed by figures.mjs from
	// murphysmemphis-website's committed runs with that repo's own comparison code, so the
	// page shows what its /site-comparison/ page shows.
	contact: {
		name: 'Murphy’s', // no person is named: who approves the site is not known
		phone: '(901) 726-4193', // the bar's published number, src/config/business.ts, evidenced
		note: 'The bar’s own number, from its website, Google and every listing. No business email exists anywhere public (docs/discovery/add-ons.md, "Email"; open question 5), and the domain’s registration contact is not the bar’s, so do not use it. Who decides on the website is not known; ask on first contact.'
	}
});
