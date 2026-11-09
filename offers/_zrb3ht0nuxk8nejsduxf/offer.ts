// Dronex (dronex92.com), aerial construction progress documentation: hosting and upkeep for
// the rebuilt site at dronex92-website.pages.dev. A `_` draft (dronex92-website issue #10,
// part 1), never built. Facts are from that repo at main `6a60299`: docs/discovery/ and its
// 2026-11-09 baseline audit (docs/discovery/seo-audit/2026-11-09-baseline/), cited per
// concern below. The photographs are the business's strongest asset (atlas/observations.md,
// "What works" item 1), so no concern is about them.
import { defineOffer, type OfferInput } from '$lib/offers/offer.js';

// `sent` is left out on purpose: it is the day the owner sends the link. On main today
// OfferInput still requires it, and open PRs #99 and #106 each make it optional (and make
// resolveOffer refuse to build an offer without it). This folder does not change shared
// code, so it types itself as OfferInput without `sent` and casts once, as #107 does. When
// #99 or #106 lands, the cast still holds; when the owner sets `sent`, drop the Omit and the
// cast.
const draft = {
	prospect: 'Dronex', // client docs/discovery/atlas/facts.md §1: "The name the copy uses. Always "Dronex""; open question 8 asks how they want it written
	// sent: not set (see above).
	previewUrl: 'https://dronex92-website.pages.dev', // client astro.config.mjs `site`
	concerns: [
		{
			// docs/discovery/atlas/observations.md, "What does not work" item 1; facts.md §1, row
			// "www.dronex.com" ("Not the business's domain. The domain is dronex92.com.
			// www.dronex.com returned 404 ... a secondary source attributes dronex.com to an
			// unrelated UK company"); seo-audit/2026-11-09-baseline/README.md "In short" (every
			// title ends in "www.dronex.com", and so do og:site_name and the WebSite block's
			// name); summary.md (home titled `www.dronex.com | Enhance Project Tracking Today`).
			// docs/discovery/web-presence.md, "Searched and not found", last row.
			title: 'Every browser tab and search result calls you “www.dronex.com”',
			detail:
				'Your site’s title, the name Google shows above each of your pages and the name a shared link shows, is “www.dronex.com” on every page. Your address is dronex92.com. The other address does not open a page at all, and one search result ties it to an unrelated company in the UK.',
			impact:
				'Someone who copies the name from a search result or a browser tab and types it in reaches nothing, not you.'
		},
		{
			// docs/discovery/atlas/observations.md item 2 ("The phone number exists only in
			// Squarespace's settings, never on a page; there is no address, city, service area or
			// hours anywhere"); facts.md §2 (9016063164 in
			// `websiteSettings.contactPhoneNumber`, "Never shown to a visitor ... No `tel:` link
			// anywhere"), §4 and §5; observations.md item 3 (the email is plain text, "the only
			// contact detail shown"). Open questions 1 and 2 ask whether to publish them.
			title: 'Your phone number is on your site, but nobody can see it',
			detail:
				'Your phone number is saved in your site’s settings, but no page shows it and nothing on the site can be tapped to call you. No page says where you are based or which area you cover either. The only way to reach you is an email address in the footer, and it is plain text, so tapping it does nothing.',
			impact:
				'A contractor reading your site on a phone cannot tap to call you, and cannot tell whether you work in their area.'
		},
		{
			// docs/discovery/atlas/observations.md item 7; functionality.md F5 ("Not a scheduler.
			// /appointments is a Squarespace form block (First Name, Last Name, Email, "Sign up for
			// news and updates" checkbox, Subject, Message, Submit). No Acuity, Calendly or
			// Squarespace Scheduling embed"); facts.md §9, row "Book now" (header button on every
			// page). Whether booking should be a real calendar is parked for the business
			// (functionality.md F5; open question 12), so the impact promises nothing about one.
			title: '“Book now” opens a contact form, not a booking',
			detail:
				'The “Book now” button on every page leads to a form asking for a name, an email, a subject and a message. There is no calendar and no way to pick a date for a flight.',
			impact:
				'A visitor who pressed “Book now” expecting to book is left writing an email instead, and does not know when they will hear back.'
		},
		{
			// docs/discovery/atlas/observations.md item 4 ("drawn at 23x20 px on desktop and 34x30
			// on the phone, it reads as a black square (screens/home-1280x800-first-screen.jpg,
			// screens/home-iphone15-first-screen.jpg). The only legible logo is a large black
			// tile in the home hero, which takes the place a hero photograph would") and item 5
			// (on the iPhone 15 the first photograph is below the first screen).
			title: 'Your logo shows as a small black square',
			detail:
				'In the header of every page your logo is drawn about 20 pixels tall on a computer and 30 on a phone, too small to read, so it looks like a black square. The one place it can be read is a large black tile at the top of your home page, where a visitor would otherwise see one of your aerial photographs first.',
			impact:
				'Your name is hard to spot at the top of your own pages, and on a phone your first photograph sits below the first screen.'
		},
		{
			// docs/discovery/seo-audit/2026-11-09-baseline/summary.md, "Lighthouse, mobile
			// (medians)": performance 52 (services) to 77 (product-construction-shoot); home LCP
			// 8.2 s, appointments 6.7 s; 1,843 to 2,736 KB per page. README.md "In short",
			// Speed: "Mobile performance runs from 52 (the store list) to 77 ... Home's mobile LCP
			// is the worst at about 8.2 s". 2.5 s is Google's "good" mark for the main content.
			title: 'On a phone, your home page takes about 8 seconds to show',
			detail:
				'In Google’s own phone test your pages score between 52 and 77 out of 100 for speed. The main part of your home page took 8.2 seconds to appear, and your booking page 6.7 seconds. Each page downloads about 2 MB on a phone.',
			impact:
				'Google’s mark for a page that feels fast is 2.5 seconds. On a phone, your home page takes more than three times that.'
		},
		{
			// docs/discovery/aeo/2026-11-09-baseline/assistants/summary.md: every assistant
			// (Claude Opus, Sonnet and Haiku from memory, and Sonnet with web search) recalled
			// "0.0 of 37" facts; the search-backed one searched 6 times. seo-audit/
			// 2026-11-09-baseline/README.md "In short": "No page carries `LocalBusiness` or
			// `Organization`, so there is no address, phone, area or hours for a search engine to
			// read", and the only structured data names "www.dronex.com" with an empty description.
			// docs/discovery/web-presence.md: no Google Business Profile found (hedged there: "the
			// absence is not proven").
			title: 'AI assistants cannot tell anyone about you yet',
			detail:
				'We asked AI assistants about Dronex at dronex92.com, some from memory and one allowed to search the web. Out of 37 facts about your business, your packages, prices and turnaround among them, none of them gave a single one. Your site carries none of the behind-the-scenes business details that search engines and assistants read directly, and the little it does carry names “www.dronex.com”.',
			impact:
				'Someone who asks an assistant for a drone company to document their build gets nothing about Dronex today, not even your packages.'
		}
	],
	plans: [
		{
			id: 'website',
			label: 'Your new website, hosted and looked after',
			summary: 'Hosting, security and upkeep for the new Dronex website.', // also Stripe Checkout's line description
			// Each from the published terms, src/routes/terms/+page.svelte (/terms), by section
			// anchor: #what-you-get (first three lines), #who-owns-what (domain, files,
			// portfolio), #cancelling-and-refunds (two lines), #late-or-failed-payments and
			// #billing (late fees, renewal reminder). The same lines as Howard's offer, #106 and
			// #107.
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
			// (offers/orebabrmoseow8vsknfk, the owner's $50/month of 2026-11-07), as PRs #106 and
			// #107 do. Annual defaults to ANNUAL_MONTHS_CHARGED (10) x monthly: $500 a year. No
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
			// OWNER: price not set; placeholder $10/month (Howard's). The only address the site
			// shows is Dronexservices92@gmail.com (facts.md §3, every page's footer), so
			// forwarding to the inbox they already use fits.
			monthly: 1000
		},
		{
			id: 'email-microsoft-365',
			group: 'Email at your own domain',
			label: 'Microsoft 365 Business Standard',
			summary:
				'A Microsoft 365 business subscription for each person you choose, each with email at your own domain. Priced per person. We set it up and manage the subscription for you.',
			// OWNER: price not set; placeholder $25 per person per month (Howard's). Seats: no
			// public source names anyone behind Dronex or says how many people it has
			// (business-profile.md, "Owner or pilot: Not found"; open question 10), so the cap is
			// Howard's small-shop 25 and the default 1.
			monthly: 2500,
			seats: { min: 1, max: 25, default: 1, unit: 'person', units: 'people' }
		},
		{
			id: 'google-business-profile',
			label: 'A Google Business Profile, set up and looked after',
			summary:
				'We set up your Google Business Profile with you (Google asks the business itself to verify it), or take over looking after one you already have. Then we keep its hours, phone, website and photos matching your site, and make the changes you ask for.',
			// OWNER: price not set; placeholder $20/month (Howard's). Discovery found no profile
			// (docs/discovery/web-presence.md, "Searched and not found": "No listing found ... the
			// absence is not proven"; business-profile.md: "No Google Business Profile ... were
			// found"), and open question 15 asks whether one exists, so the wording covers both
			// setting one up and taking one over, as #106 and #107 do. Drop it if they have one
			// they already look after.
			monthly: 2000
		}
	],
	// Figures: part 2 of issue #10 adds figures.json beside this file, computed from the
	// client repo's committed runs with that repo's own comparison code, once its
	// /site-comparison/ page exists (issue #7, part 2).
	contact: {
		name: 'Dronex (no owner named in any public source)', // business-profile.md, "Owner or pilot: Not found"; open question 10
		email: 'Dronexservices92@gmail.com', // facts.md §3: every page's footer, plain text; evidenced
		phone: '901-606-3164', // facts.md §2: in Squarespace settings only, never shown; evidenced, machine-only
		note: 'Nothing has been confirmed with the business yet. The Gmail address is the only contact detail the site shows. The phone number is only in the site settings and turned up nowhere else in search (open question 2), so it may not be meant for the public. Instagram @dronex901 is linked from every page. No owner, address or service area is public (open questions 1 and 10).'
	}
} satisfies Omit<OfferInput, 'sent'>;

export default defineOffer(draft as OfferInput);
