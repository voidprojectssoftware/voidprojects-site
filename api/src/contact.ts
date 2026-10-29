// POST /api/contact: the /websites contact form. Bundled by scripts/build-api.mjs.
import { app } from '@azure/functions';
import { contactResponse } from '$lib/contact/contact-http.js';
import { contactDelivery } from './contact-email.js';

const deliveryFor = contactDelivery(process.env);

app.http('contact', {
	route: 'contact',
	methods: ['POST'],
	authLevel: 'anonymous',
	handler: async (request, context) => {
		const res = await contactResponse(
			request.headers.get('content-type'),
			await request.text(),
			deliveryFor(
				(line) => context.log(line),
				(line) => context.warn(line)
			)
		);
		return { status: res.status, headers: res.headers, body: res.body };
	}
});
