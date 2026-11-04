// SAMPLE OFFER. Fernhollow Pottery is a made-up business and everything below is
// invented, so the framework has something to build and test against. Its
// audit.json is a real run of npm run audit:offer, but of two unrelated public
// sites: arizmendibakery.com as "current" and voidprojects.ai as "preview".
import { defineOffer } from '$lib/offers/offer.js';

export default defineOffer({
	prospect: 'Fernhollow Pottery (sample)',
	sent: '2026-11-04',
	previewUrl: 'https://fernhollow-pottery.example/',
	concerns: [
		{
			title: 'Class times live only in a PDF',
			detail:
				'Search engines and AI assistants cannot read your schedule, so "pottery class near me" never finds it.'
		},
		{
			title: 'The home page takes over six seconds on a phone',
			detail: 'Most visitors on mobile data leave before the gallery appears.'
		},
		{
			title: 'No way to book or pay online',
			detail: 'Every booking is a phone call during studio hours.'
		}
	],
	plans: [
		{
			id: 'static',
			label: 'Static site',
			summary: 'The site in the preview, hosted and kept up to date.',
			features: ['Hosting and security updates', 'Small content changes each month'],
			monthly: 2500
		},
		{
			id: 'bookings',
			label: 'Site with bookings',
			summary: 'Everything in Static, plus online class booking and payment.',
			features: ['Class calendar with online booking', 'Card payments through Stripe'],
			monthly: 6000,
			annual: 60000
		}
	],
	addOns: [
		{
			id: 'newsletter',
			label: 'Newsletter sign-up',
			summary: 'A mailing list form on every page.',
			monthly: 500
		}
	],
	contact: {
		name: 'Sample Contact',
		email: 'owner@fernhollow-pottery.example',
		note: 'Made up; nobody to call.'
	}
});
