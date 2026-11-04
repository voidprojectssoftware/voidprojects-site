// The /api/offer-checkout contract. A stub until the Stripe checkout issue (#78):
// it already prices the selection from server-side offer data, so #78 only has to
// turn a valid selection into a Checkout Session and answer with its `url`.
import {
	INTERVALS,
	isExpired,
	priceFor,
	type AddOn,
	type Interval,
	type Offer,
	type Plan,
	type Price
} from './offer.js';

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

// What the page reads back. `url` is set once #78 creates a real session; until
// then the page shows `message`.
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

export function checkoutResponse(
	contentType: string | null,
	body: string,
	findOffer: FindOffer,
	now = new Date()
): CheckoutResponse {
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

	// Stub (#78 replaces this with a Stripe Checkout Session and returns its url).
	return json(200, {
		ok: true,
		message:
			'Online sign-up is not open yet. Reply to the message that brought you here and we will set it up.'
	});
}
