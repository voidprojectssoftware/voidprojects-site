// First Touch Payment Solutions: hosting and upkeep for both rebuilt sites, theirs and
// Software Earnings', a sister company with the same founder and CEO (both sites'
// team pages). Concerns are from each rebuild's atlas, docs/discovery/atlas/
// observations.md, and its measured audit runs (see figures.mjs).
import { defineOffer } from '$lib/offers/offer.js';

export default defineOffer({
	prospect: 'First Touch Payment Solutions',
	sent: '2026-11-05',
	previewUrl: 'https://firsttouchpaymentsolutions-website.pages.dev/',
	// "About 5 seconds": figures.json wait row, 4.9 s (FTPS) and 5.1 s (Software Earnings).
	// "Dozens of scripts": atlas observations, about 35 script requests per FTPS page
	// (item 36) and 25 Hibu runtime plus 10 AudioEye requests on the Software Earnings home page (item 33).
	concerns: [
		{
			title: 'Slow on a phone',
			detail:
				'About 5 seconds before each page shows. Many visitors leave before they see your number.'
		},
		{
			title: 'Someone else’s advert on your home page',
			detail:
				'On phones, both home pages show Hibu’s “Now Insurance” filler in place of your own words.'
		},
		{
			title: 'Contact details search engines often miss',
			detail:
				'Your phone number and hours are added by a script that does not always run, so search engines and AI assistants often never see them.'
		},
		{
			title: 'Leftovers and broken links',
			detail:
				'A stock Hibu blog post, a “Hibu Video Splash” page and dead links tell a visitor nobody is minding the site.'
		},
		{
			title: 'Code you do not control on every page',
			detail:
				'Dozens of scripts from outside services, including an accessibility overlay that papers over problems instead of fixing them.'
		}
	],
	plans: [
		{
			id: 'both-sites',
			label: 'Both sites, hosted and looked after',
			summary:
				'Hosting, security and upkeep for First Touch Payment Solutions and Software Earnings.', // also Stripe Checkout's line description
			// Each from the terms draft (drafts/terms/terms-draft.md): 7 "You can take your site
			// with you", 8 "After you leave", 7 "Your domain is yours", 5 "Cancelling and
			// refunds" (three lines), 4 "Billing" and 6 "Late or failed payments", 7 "Showing our work".
			// The services themselves (hosting, security updates, edits) are listed in the
			// page's covers section, not repeated here.
			features: [
				'Your site files are yours to take, free, if you ever leave, to host anywhere',
				'Files kept for a year after the service ends, so you can still ask',
				'Your domains stay in your name, transferable any time',
				'Monthly: cancel any time, no cancellation fee',
				'Annual: full refund within 15 days of the first payment, less any domain registration fee',
				'If we ever end the service, unused time is refunded',
				'No late fees, and a reminder before each annual renewal',
				'In our portfolio only if you say yes'
			],
			monthly: 27500 // annual defaults to 10 x monthly: 275000
		}
	],
	contact: {
		name: 'Larry Thornton',
		phone: '(901) 492-1726',
		note: 'Founder, President and CEO of First Touch Payment Solutions and Software Earnings, per both sites’ team pages. Phone is the First Touch main line as published; no personal or sales email is published (SUPPORT@FT-PS.COM is support only), so confirm the best address on first contact.'
	}
});
