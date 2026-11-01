// POST /api/contact: the /websites contact form and the agent path in /llms.txt.
// Bundled by scripts/build-api.mjs.
import { app } from '@azure/functions';
import { contactLimiters, contactResponse } from '$lib/contact/contact-http.js';
import { turnstileFromEnv } from '$lib/contact/turnstile.js';
import { contactDelivery } from './contact-email.js';

const deliveryFor = contactDelivery(process.env);
const turnstile = turnstileFromEnv(process.env);
const limiters = contactLimiters();
let warned = false;

// Cloudflare's header when the request came through its proxy, else the first hop
// Static Web Apps saw. Either can be forged by a client that reaches the origin
// directly, which is why the agent path also has a global cap.
function clientIp(headers: Headers): string {
	return (
		headers.get('cf-connecting-ip')?.trim() ||
		headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		'unknown'
	);
}

app.http('contact', {
	route: 'contact',
	methods: ['POST'],
	authLevel: 'anonymous',
	handler: async (request, context) => {
		if (turnstile.warning && !warned) {
			warned = true;
			context.warn(turnstile.warning);
		}
		const res = await contactResponse(
			{
				contentType: request.headers.get('content-type'),
				body: await request.text(),
				clientIp: clientIp(request.headers)
			},
			{
				deliver: deliveryFor(
					(line) => context.log(line),
					(line) => context.warn(line)
				),
				verify: turnstile.verify,
				limiters
			}
		);
		return { status: res.status, headers: res.headers, body: res.body };
	}
});
