// The /api/offer-question contract: the questions box on the thank-you page. The
// browser sends only the Checkout Session id and the message; who is asking, their
// business and the offer come from the session at Stripe. The message then goes
// through the contact form's own validation and delivery ($lib/contact).
import {
	MAX_BODY_BYTES,
	validateContact,
	type ContactResponse,
	type Deliver
} from '$lib/contact/contact-http.js';
import { sessionFollowUp, type CheckoutStripe } from './stripe.js';

export const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{8,250}$/;

export interface QuestionDeps {
	stripe: CheckoutStripe | undefined; // undefined when STRIPE_SECRET_KEY is not set: 503
	deliver: Deliver;
	log?: (line: string) => void; // Stripe failures only, never the request body
}

function json(status: number, payload: unknown): ContactResponse {
	return {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
			'X-Content-Type-Options': 'nosniff',
			'X-Robots-Tag': 'noindex'
		},
		body: JSON.stringify(payload)
	};
}

function text(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

const NOT_FOUND = 'We could not find that sign-up.';

export async function questionResponse(
	contentType: string | null,
	body: string,
	{ stripe, deliver, log = () => {} }: QuestionDeps
): Promise<ContactResponse> {
	if (!contentType?.toLowerCase().startsWith('application/json')) {
		return json(415, { error: 'Content-Type must be application/json.' });
	}
	if (body.length > MAX_BODY_BYTES) return json(413, { error: 'Request body is too large.' });
	let input: unknown;
	try {
		input = JSON.parse(body);
	} catch {
		return json(400, { error: 'Body is not valid JSON.' });
	}
	if (typeof input !== 'object' || input === null || Array.isArray(input)) {
		return json(400, { error: 'Body must be a JSON object.' });
	}
	const raw = input as Record<string, unknown>;
	if (text(raw.website)) return json(200, { ok: true }); // honeypot, as on the contact form
	const sessionId = text(raw.sessionId);
	if (!SESSION_ID.test(sessionId)) return json(400, { error: NOT_FOUND });
	if (!stripe) return json(503, { error: 'Questions cannot be sent right now.' });

	let followUp;
	try {
		followUp = sessionFollowUp(await stripe.checkout.sessions.retrieve(sessionId));
	} catch (err) {
		if ((err as { statusCode?: number }).statusCode === 404) return json(404, { error: NOT_FOUND });
		log(
			`[offer-question] Stripe session read failed: ${err instanceof Error ? err.message : String(err)}`
		);
		return json(502, { error: 'The message could not be delivered.' });
	}
	if (!followUp) return json(404, { error: NOT_FOUND });

	const result = validateContact({
		name: followUp.name,
		email: followUp.email,
		kind: 'A business',
		message: raw.message
	});
	if ('error' in result) return json(400, { error: result.error });
	try {
		await deliver({
			...result.submission,
			offer: { id: followUp.offerId, business: followUp.business }
		});
	} catch {
		return json(502, { error: 'The message could not be delivered.' });
	}
	return json(200, { ok: true });
}
