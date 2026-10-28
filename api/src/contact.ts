// POST /api/contact: the /websites contact form. Bundled by scripts/build-api.mjs.
import { app } from '@azure/functions';
import { contactResponse, logDelivery } from '$lib/contact/contact-http.js';

app.http('contact', {
	route: 'contact',
	methods: ['POST'],
	authLevel: 'anonymous',
	handler: async (request, context) => {
		const res = await contactResponse(
			request.headers.get('content-type'),
			await request.text(),
			logDelivery((line) => context.log(line))
		);
		return { status: res.status, headers: res.headers, body: res.body };
	}
});
