// POST /api/offer-checkout: the sign-up button on offer pages (build/o/<id>/).
// A stub until #78 adds Stripe. Bundled by scripts/build-api.mjs, which supplies
// virtual:offers from offers/*/offer.ts.
import { app } from '@azure/functions';
import { checkoutResponse } from '$lib/offers/checkout-http.js';
import { findOffer } from 'virtual:offers';

app.http('offer-checkout', {
	route: 'offer-checkout',
	methods: ['POST'],
	authLevel: 'anonymous',
	handler: async (request) => {
		const res = checkoutResponse(
			request.headers.get('content-type'),
			await request.text(),
			findOffer
		);
		return { status: res.status, headers: res.headers, body: res.body };
	}
});
