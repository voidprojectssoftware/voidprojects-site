// Pottery Haven (Southaven, MS): the rebuilt website and its Square shop, hosted and
// looked after. A draft: the leading "_" on this folder keeps it out of the build and
// the API bundle until the owner sets the price and `sent` (pottery-haven-website
// issue #8). Facts are from that repository at commit 1111ac7, cited per line below
// as <file>:<line>; the figures are figures.json, from figures.mjs.
//
// What is sold: the site is hybrid by the owner's decision (pottery-haven-website
// docs/architecture/decisions/0007-the-site-is-hybrid-and-pages-functions-sell-through-square.md:20-33):
// static pages built from the studio's Square catalog, a Square-hosted checkout, and
// stock read from Square when the page is opened (0008-stock-is-read-at-request-time-
// and-cached-sixty-seconds.md:20-23). That puts it in the "anything dynamic" row of
// published pricing (0007:43-47, :81-82; src/lib/content/websites.ts PRICING "Quote"),
// not the $25 static plan.
import { defineOffer } from '$lib/offers/offer.js';

export default defineOffer({
	prospect: 'Pottery Haven', // src/config/site.ts `site.name`
	// OWNER: `sent` is absent on purpose. It is the day the owner sends the link; set it
	// then (ISO date), and only then remove the "_" from this folder. resolveOffer refuses
	// an offer without it, so this folder cannot be built until it is set.
	// OWNER: previewUrl is a placeholder. The Worker that serves the preview does not exist
	// yet (pottery-haven-website issue #7, ADR 0009); put its workers.dev address here once
	// the owner creates it. `.invalid` is reserved (RFC 2606), so it can never resolve.
	previewUrl: 'https://pottery-haven-preview.invalid/',
	concerns: [
		{
			// docs/discovery/atlas/observations.md:9 (item 1): "The raw HTML has no visible text
			// on any page"; docs/discovery/aeo-baseline.md:28-42: without scripts the current
			// site states almost none of the studio's facts, and the home and party booking
			// pages state none, because Square Online draws every word with script.
			title: 'Search engines and AI assistants see an empty page',
			detail:
				'Your store draws every word on the page with a script after it loads. A visitor sees your hours and prices; many search engines and AI assistants read the page without running scripts and get nothing at all.',
			impact: 'Ask an assistant about your studio and it has to guess.'
		},
		{
			// docs/discovery/atlas/observations.md:11 (item 3): the home page email link opens
			// a message to hi@mystore.com, Square's template sample; only the "p" of the real
			// address is linked. Also pottery-haven-website src/config/site.ts:134-139.
			title: 'Your email link writes to a stranger',
			detail:
				'On your home page, tapping your email address opens a message to a sample address from the store template, not to you.',
			impact: 'A customer who emails you that way never reaches you.'
		},
		{
			// docs/discovery/atlas/observations.md:12 (item 4): about 1,026 product addresses in
			// the sitemap that are not in the store answer 200 and show "404 / Page not found";
			// docs/discovery/seo-accessibility-baseline.md:219-227 (finding 1).
			title: 'About a thousand old product pages that look live to Google',
			detail:
				'Your store tells Google about roughly a thousand product addresses for pieces you no longer sell. Each one says “page found” to Google and “page not found” to the visitor.',
			impact: 'Someone searching can land on a dead end instead of your shop.'
		},
		{
			// docs/discovery/atlas/observations.md:13-14 (items 5 and 6): a blank Services page
			// and a template story ("Story title / Start writing your story here."), both in
			// the sitemap; three empty categories that say items aren't available yet.
			title: 'Template leftovers',
			detail:
				'A blank Services page, an unfinished template story, and three shop categories with nothing in them are all published.',
			impact: 'They tell a visitor nobody is minding the site.'
		},
		{
			// docs/discovery/atlas/observations.md:23 (item 15): the Square Online app, checkout
			// bundle, Snowplow, Weebly analytics, Sentry, Datadog RUM and a Google map on every
			// page; docs/discovery/seo-accessibility-baseline.md:238-240 (finding 5, zoom off on
			// every page) and :274-278 (finding 15, cookies from other companies on every load).
			title: 'Platform code you do not control on every page',
			detail:
				'Every page loads the store platform’s own tracking and monitoring scripts, sets cookies from other companies, and stops visitors from zooming in.',
			impact: 'Your pages are slow on a phone and hard to read for anyone who needs larger text.'
		}
	],
	plans: [
		{
			id: 'website-and-shop',
			label: 'Your new website and shop, hosted and looked after',
			// The Square checkout and live stock are this plan's reason for its price
			// (pottery-haven-website #8, comment of 2026-11-06 from #9: "we keep the Square
			// checkout working"; ADR 0007:81-82).
			summary:
				'Hosting, security and upkeep for the new Pottery Haven website, with your Square stock and checkout kept working.', // also Stripe Checkout's line description
			// Each from the published terms, src/routes/terms/+page.svelte (/terms), by section
			// anchor: #what-you-get (first three lines), #who-owns-what (domain), #cancelling-
			// and-refunds (two lines), #who-owns-what "You can take your site with you" (files),
			// #late-or-failed-payments and #billing (late fees, renewal reminder),
			// #who-owns-what "Showing our work" (portfolio).
			// OWNER: #who-owns-what excludes "anything that runs on servers we operate" from the
			// files a customer takes away. Whether the checkout and stock routes (ADR 0007, 0008)
			// count as the site's own code or as our services is not settled; the files line
			// below says only what the terms say for certain.
			features: [
				'No build fee and no minimum term',
				'Hosting, security updates and routine upkeep for as long as you subscribe',
				'Small changes (text, photos, hours, prices) at no extra charge, within reason',
				'Your domain stays yours, and you can move it away from us any time',
				'Monthly: cancel any time, no cancellation fee',
				'Annual: full refund within 15 days of the first payment, less the domain’s registration fee',
				'Your site’s own files are yours to take, free, for a year after you leave',
				'No late fees, and a reminder about 14 days before each annual renewal',
				'In our portfolio only if you say yes'
			],
			// OWNER: price not set. The recommendation in pottery-haven-website #8 (comments of
			// 2026-11-06): $50/month, no build fee, annual at the default 10 x monthly ($500).
			// The figure is the owner's call; this is that recommendation, not a decision.
			monthly: 5000
		}
	],
	contact: {
		name: 'Pottery Haven (owner not known)',
		email: 'potteryhavenstudio@gmail.com', // pottery-haven-website src/config/site.ts `site.email.address`, evidenced
		phone: '(662) 536-6272', // src/config/site.ts `site.phone.display`, evidenced
		note: 'No readable source names the owner (src/config/site.ts `owner` is unset, open question 2); the only bookable team member on the booking page is not evidence of ownership, so do not address anyone by that name. Whether the gmail address is the one to use is open question 8. Confirm both on first contact.'
	}
});
