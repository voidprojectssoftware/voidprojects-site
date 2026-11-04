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
				'First Touch Payment Solutions and Software Earnings, the two rebuilt sites, kept running, up to date and easy to find.',
			features: [
				'Security updates, applied as fixes come out',
				'Hosting for both sites',
				'We watch that both sites stay up',
				'Small content edits: text, photos, hours, prices',
				'Ongoing search engine and AI assistant upkeep'
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
