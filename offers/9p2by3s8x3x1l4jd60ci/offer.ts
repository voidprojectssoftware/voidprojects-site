// First Touch Payment Solutions: hosting and upkeep for both rebuilt sites, theirs and
// Software Earnings', a sister company with the same founder and CEO (both sites'
// team pages). Concerns are from each rebuild's atlas, docs/discovery/atlas/
// observations.md, and its measured audit runs (see figures.mjs).
import { defineOffer } from '$lib/offers/offer.js';

export default defineOffer({
	prospect: 'First Touch Payment Solutions',
	sent: '2026-11-05',
	previewUrl: 'https://firsttouchpaymentsolutions-website.pages.dev/',
	concerns: [
		// Rounded from figures.mjs's sources, compareSites() headline: requests 64 and 64,
		// kilobytes 1,044 and 1,070, LCP 4.9 s and 5.3 s (FTPS run 2026-10-28-after-88,
		// Software Earnings run 2026-11-03-after-69).
		{
			title: 'Both sites are slow on a phone',
			detail:
				'Each page of both current sites asks for about 64 files and around a megabyte of data, most of it the Hibu platform’s own scripts and widgets. The main content takes about 5 seconds to show on a phone, twice Google’s mark for a good result.'
		},
		{
			title: 'Phones see an insurance advert on the home page',
			detail:
				'On a phone, the “Why choose” section of both home pages shows Hibu’s template text, “Let Now Insurance help you compare quotes online”, in place of your own paragraph.'
		},
		{
			title: 'Your phone number depends on a script that does not always run',
			detail:
				'The phone number, email and hours are written in by a third-party script after the page loads. On the Software Earnings site it never runs on phones, and on most pages of both sites, search engines and AI assistants that do not run scripts never see those details.'
		},
		{
			title: 'Template pages and broken links are still live',
			detail:
				'A stock Hibu blog post about flower stores and marathons is in both sites’ sitemaps, “Play Video” opens a page titled “Hibu Video Splash”, the First Touch “Press Release” menu item leads to a missing page, and three Software Earnings “form” links lead to a 404.'
		},
		{
			title: 'An overlay instead of accessible pages',
			detail:
				'Both sites load an accessibility overlay on every page while links without names, images without descriptions and headings out of order stay in the pages themselves. The rebuilds fix those in the pages.'
		}
	],
	plans: [
		{
			id: 'both-sites',
			label: 'Both sites, hosted and looked after',
			summary:
				'First Touch Payment Solutions and Software Earnings, the two rebuilt sites, kept running, up to date and easy to find.',
			features: [
				'Hosting for both sites',
				'Security and dependency updates',
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
