// POST /api/offer-checkout: the sign-up button on offer pages (build/o/<id>/).
// Answers with a Stripe Checkout Session url. Bundled by scripts/build-api.mjs,
// which supplies virtual:offers from offers/*/offer.ts.
import { app } from '@azure/functions';
import { checkoutResponse } from '$lib/offers/checkout-http.js';
import { findOffer } from 'virtual:offers';
import { processStripe } from './stripe.js';

app.http('offer-checkout', {
	route: 'offer-checkout',
	methods: ['POST'],
	authLevel: 'anonymous',
	handler: async (request, context) => {
		const res = await checkoutResponse(request.headers.get('content-type'), await request.text(), {
			findOffer,
			stripe: processStripe((line) => context.warn(line)),
			log: (line) => context.warn(line)
		});
		return { status: res.status, headers: res.headers, body: res.body };
	}
});
