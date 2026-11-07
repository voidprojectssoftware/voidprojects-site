// Di Donna Studio: hosting and upkeep for the site already built and live at
// didonnastudio.com. A greenfield build: before it she had no website of her own,
// only her Booksy listing and her Facebook page (both trading as "Di Donna Colour
// Studio"), so there is no before-and-after audit and no /site-comparison/ page.
// Every fact below is read from the didonnastudio-website repo at origin/main
// 2af0fe7 (2026-11-06); each concern names its source.
import { defineOffer } from '$lib/offers/offer.js';

export default defineOffer({
	prospect: 'Di Donna Studio', // site.businessName, confirmed by her on /questions/ (4 September 2026)
	// OWNER MUST SET `sent` to the day the link goes to Angela. This is a placeholder,
	// the day the page was built (2026-11-06), chosen so an unchanged deploy expires
	// early (2026-12-06) rather than staying open indefinitely. Not a real send date.
	sent: '2026-11-06',
	previewUrl: 'https://didonnastudio.com/',
	concerns: [
		{
			// src/config/services.ts header: every row of the salon menu was read off her
			// Booksy listing (2 September and 22 October 2026); src/config/site.ts names
			// Booksy and her Facebook page as the sources for booking, phone and email;
			// docs/discovery/image-inventory.md calls those two "her own published pages".
			title: 'Your menu lived on someone else’s page',
			detail:
				'Your services, prices and booking were only on Booksy and Facebook, laid out the way those companies choose.',
			impact: 'Nothing a visitor found under your name was yours to shape.'
		},
		{
			// Before didonnastudio.com (registered 2026-09-03, docs/process/deploying.md)
			// there was no address of hers at all. What the new site adds for search is in
			// src/routes.ts: per-page robots, canonical URL, LocalBusiness structured data
			// and a sitemap entry for every listed page.
			title: 'No website of your own for search engines to list',
			detail:
				'Before didonnastudio.com there was no website at an address of your own, with your services, hours and location on it, for search engines to list.',
			impact: 'Anyone searching could only reach you through another company’s platform.'
		},
		{
			// .claude/skills/elleebana-trainer-requirements/SKILL.md: Elleebana sign off a
			// trainer partly on her website (their requirements email, confirmed).
			// docs/process/handoff.md, 2026-10-22: "There is still no class on it" (Booksy).
			title: 'Nowhere for your Elleebana training to live',
			detail:
				'Elleebana check a trainer’s own website before they sign her off, and your Booksy listing carries no classes.',
			impact: 'Without a site of your own, there was nothing for that sign-off to look at.'
		}
	],
	plans: [
		{
			id: 'studio-site',
			label: 'Your site, hosted and looked after',
			summary: 'Hosting, security and upkeep for didonnastudio.com.', // also Stripe Checkout's line description
			// Each from the published terms, https://voidprojects.ai/terms
			// (src/routes/terms/+page.svelte, updated 2026-11-05), by section anchor:
			// #what-you-get (no build fee, no minimum term), #who-owns-what (content,
			// files, domain), #after-you-leave (files kept a year),
			// #cancelling-and-refunds (three lines), #billing and
			// #late-or-failed-payments (reminder, no late fees). "In our portfolio only if
			// you say yes" (#who-owns-what, Showing our work) is left out: Di Donna Studio
			// is already in SHOWCASE in src/lib/content/websites.ts. The services
			// themselves are in the page's covers section, not repeated here.
			features: [
				'No build fee and no minimum term',
				'Your words and photos stay yours',
				'Your site files are yours to take, free, if you ever leave, to host anywhere',
				'Files kept for a year after the service ends, so you can still ask',
				'Your domain is yours, transferable any time',
				'Monthly: cancel any time, no cancellation fee',
				'Annual: full refund within 15 days of the first payment, less the domain’s registration fee',
				'If we ever end the service, unused time is refunded',
				'No late fees, and a reminder before each annual renewal'
			],
			// $50/month: the figure the owner published for Di Donna Studio in SHOWCASE
			// (src/lib/content/websites.ts, price '$50/m'). Annual defaults to 10 x monthly.
			monthly: 5000
		}
	],
	contact: {
		name: 'Angela Di Donna', // site.name, confirmed by her on /questions/ (4 September 2026)
		phone: '(901) 833-0204',
		note: 'Owner of Di Donna Studio (trades on Booksy and Facebook as Di Donna Colour Studio). Phone is evidenced, not confirmed: published on her Facebook page and in her Booksy booking note (site.ts contact.phone), and she has not said she wants it used. Her only published email is a personal Gmail she has asked to replace with one in her business name (site.ts contact.email, /questions/ "business-email"), so it is left out here; confirm the best address with her.'
	}
});
