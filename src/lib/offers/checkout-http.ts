// The /api/offer-checkout contract: prices the selection from server-side offer
// data (never from the request body), turns it into a Stripe Checkout Session and
// answers with the session's `url`, which the sign-up button redirects to.
import { SITE_ORIGIN } from '$lib/seo/site.js';
import {
	INTERVALS,
	groupConflicts,
	isExpired,
	priceFor,
	type AddOn,
	type Interval,
	type Offer,
	type Plan,
	type Price
} from './offer.js';
import { checkoutSessionParams, type CheckoutStripe } from './stripe.js';

export const MAX_BODY_BYTES = 4 * 1024;

export interface CheckoutRequest {
	offerId: string;
	planId: string;
	interval: Interval;
	addOnIds: string[];
}

export interface CheckoutSelection {
	offer: Offer;
	plan: Plan;
	interval: Interval;
	addOns: AddOn[];
	lines: { id: string; price: Price }[]; // plan first, then each add-on, all on `interval`
	total: number; // whole cents per interval
}

// What the page reads back: `url` on success, otherwise `message` to show.
export interface CheckoutReply {
	ok: boolean;
	url?: string;
	message: string;
}

export interface CheckoutResponse {
	status: number;
	headers: Record<string, string>;
	body: string;
}

export type FindOffer = (id: string) => Offer | undefined;

export interface CheckoutDeps {
	findOffer: FindOffer;
	stripe: CheckoutStripe | undefined; // undefined when STRIPE_SECRET_KEY is not set: a valid selection gets 503
	origin?: string; // base of the success and cancel URLs; defaults to SITE_ORIGIN
	now?: Date;
	log?: (line: string) => void; // Stripe failures only, never the request body
}

// A stale tab on an accepted offer must not start a second subscription.
export const ALREADY_ACCEPTED =
	'This offer has already been accepted, so there is nothing more to buy here. To update your card or billing details, reload this page and use Manage billing, or write to hello@voidprojects.ai.';

const UNAVAILABLE =
	'Online sign-up is not available right now. Reply to the message that brought you here and we will set it up.';

function json(status: number, payload: CheckoutReply): CheckoutResponse {
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

export function parseCheckoutRequest(input: unknown): CheckoutRequest | undefined {
	if (typeof input !== 'object' || input === null || Array.isArray(input)) return undefined;
	const raw = input as Record<string, unknown>;
	const addOnIds = raw.addOnIds ?? [];
	if (
		typeof raw.offerId !== 'string' ||
		typeof raw.planId !== 'string' ||
		!INTERVALS.includes(raw.interval as Interval) ||
		!Array.isArray(addOnIds) ||
		!addOnIds.every((a) => typeof a === 'string')
	) {
		return undefined;
	}
	return {
		offerId: raw.offerId,
		planId: raw.planId,
		interval: raw.interval as Interval,
		addOnIds: [...new Set(addOnIds as string[])]
	};
}

/** Prices a request against the offer data; any id or interval the offer does not sell is an error. */
export function selectCheckout(
	request: CheckoutRequest,
	findOffer: FindOffer,
	now: Date
): { selection: CheckoutSelection } | { status: number; message: string } {
	const offer = findOffer(request.offerId);
	if (!offer) return { status: 404, message: 'This offer does not exist.' };
	if (offer.accepted) return { status: 409, message: ALREADY_ACCEPTED };
	if (isExpired(offer, now)) return { status: 410, message: 'This offer has expired.' };
	const plan = offer.plans.find((p) => p.id === request.planId);
	const planPrice = plan && priceFor(plan, request.interval);
	if (!plan || !planPrice) return { status: 400, message: 'That plan is not part of this offer.' };

	const lines = [{ id: plan.id, price: planPrice }];
	const addOns: AddOn[] = [];
	for (const id of request.addOnIds) {
		const addOn = offer.addOns.find((a) => a.id === id);
		const price = addOn && priceFor(addOn, request.interval);
		if (!addOn || !price) return { status: 400, message: 'That add-on is not part of this offer.' };
		addOns.push(addOn);
		lines.push({ id, price });
	}
	if (groupConflicts(addOns, request.addOnIds).length) {
		return { status: 400, message: 'Choose only one option from each group of add-ons.' };
	}
	return {
		selection: {
			offer,
			plan,
			interval: request.interval,
			addOns,
			lines,
			total: lines.reduce((sum, l) => sum + l.price.amount, 0)
		}
	};
}

export async function checkoutResponse(
	contentType: string | null,
	body: string,
	{ findOffer, stripe, origin = SITE_ORIGIN, now = new Date(), log = () => {} }: CheckoutDeps
): Promise<CheckoutResponse> {
	if (!contentType?.toLowerCase().startsWith('application/json')) {
		return json(415, { ok: false, message: 'Send JSON.' });
	}
	if (body.length > MAX_BODY_BYTES) return json(413, { ok: false, message: 'Request too large.' });
	let parsed: unknown;
	try {
		parsed = JSON.parse(body);
	} catch {
		return json(400, { ok: false, message: 'Body is not valid JSON.' });
	}
	const request = parseCheckoutRequest(parsed);
	if (!request) return json(400, { ok: false, message: 'Missing or malformed fields.' });
	const result = selectCheckout(request, findOffer, now);
	if ('message' in result) return json(result.status, { ok: false, message: result.message });
	if (!stripe) return json(503, { ok: false, message: UNAVAILABLE });

	try {
		const session = await stripe.checkout.sessions.create(
			checkoutSessionParams(result.selection, origin)
		);
		if (!session.url) throw new Error('session has no url');
		return json(200, { ok: true, url: session.url, message: 'Opening checkout...' });
	} catch (err) {
		log(
			`[offer-checkout] Stripe session create failed: ${err instanceof Error ? err.message : String(err)}`
		);
		return json(502, {
			ok: false,
			message:
				'Checkout could not be opened. Please try again, or reply to the message that brought you here.'
		});
	}
}
