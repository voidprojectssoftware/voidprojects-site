// POST /api/offer-question: the questions box on the thank-you page (/thanks).
// Delivered like the contact form, tagged from the Checkout Session.
import { app } from '@azure/functions';
import { questionResponse } from '$lib/offers/question-http.js';
import { contactDelivery } from './contact-email.js';
import { processStripe } from './stripe.js';

const deliveryFor = contactDelivery(process.env);

app.http('offer-question', {
	route: 'offer-question',
	methods: ['POST'],
	authLevel: 'anonymous',
	handler: async (request, context) => {
		const res = await questionResponse(request.headers.get('content-type'), await request.text(), {
			stripe: processStripe((line) => context.warn(line)),
			deliver: deliveryFor(
				(line) => context.log(line),
				(line) => context.warn(line)
			),
			log: (line) => context.warn(line)
		});
		return { status: res.status, headers: res.headers, body: res.body };
	}
});
