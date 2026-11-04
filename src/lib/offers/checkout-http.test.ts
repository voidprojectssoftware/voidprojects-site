import { describe, expect, it, vi } from 'vitest';
import { checkoutResponse, type CheckoutReply, type FindOffer } from './checkout-http.js';
import { resolveOffer, type OfferInput } from './offer.js';
import type { CheckoutStripe } from './stripe.js';

// A made-up offer for the tests only; no real offer id appears in src/.
const INPUT: OfferInput = {
	prospect: 'Test Bakery',
	sent: '2026-11-01',
	previewUrl: 'https://test-bakery.example/',
	concerns: [],
	audit: null,
	plans: [
		{ id: 'static', label: 'Static site', summary: 'Hosted and kept up to date.', monthly: 2500 },
		{ id: 'monthly-only', label: 'Monthly only', monthly: 4000, annual: false }
	],
	addOns: [{ id: 'newsletter', label: 'Newsletter sign-up', monthly: 500 }],
	contact: { name: 'Test Contact' }
};
const OFFER = resolveOffer('testofferaaaa0000', INPUT);
const EXPIRED = resolveOffer('testofferexpired00', { ...INPUT, sent: '2026-01-01' });
const OFFERS = new Map([OFFER, EXPIRED].map((o) => [o.id, o]));
const findOffer: FindOffer = (id) => OFFERS.get(id);
const NOW = new Date('2026-11-04T12:00:00Z');
const ORIGIN = 'https://voidprojects.ai';

function mockStripe(url: string | null = 'https://checkout.stripe.com/c/pay/cs_test_mock') {
	const create = vi.fn(async () => ({ id: 'cs_test_mock', url }));
	const stripe = { checkout: { sessions: { create } } } as unknown as CheckoutStripe;
	return { stripe, create };
}

async function post(body: unknown, stripe: CheckoutStripe | undefined, log = vi.fn()) {
	const res = await checkoutResponse('application/json', JSON.stringify(body), {
		findOffer,
		stripe,
		origin: ORIGIN,
		now: NOW,
		log
	});
	return { status: res.status, reply: JSON.parse(res.body) as CheckoutReply, log };
}

describe('checkoutResponse', () => {
	it('creates a session priced from server data and answers with its url', async () => {
		const { stripe, create } = mockStripe();
		const { status, reply } = await post(
			{ offerId: OFFER.id, planId: 'static', interval: 'month', addOnIds: ['newsletter'] },
			stripe
		);
		expect(status).toBe(200);
		expect(reply).toEqual({
			ok: true,
			url: 'https://checkout.stripe.com/c/pay/cs_test_mock',
			message: 'Opening checkout...'
		});
		expect(create).toHaveBeenCalledOnce();
		expect(create.mock.calls[0]).toMatchSnapshot();
	});

	it('ignores amounts, prices and currency in the request body', async () => {
		const { stripe, create } = mockStripe();
		const { status } = await post(
			{
				offerId: OFFER.id,
				planId: 'static',
				interval: 'year',
				addOnIds: ['newsletter'],
				amount: 1,
				unit_amount: 1,
				total: 1,
				currency: 'jpy',
				price: 'price_cheap',
				line_items: [{ price_data: { unit_amount: 1 } }]
			},
			stripe
		);
		expect(status).toBe(200);
		const params = (create.mock.calls[0] as unknown[])[0] as {
			line_items: { price_data: { unit_amount: number; currency: string } }[];
		};
		// Annual defaults to 10 x monthly: 25000 for the plan, 5000 for the add-on.
		expect(params.line_items.map((l) => l.price_data.unit_amount)).toEqual([25000, 5000]);
		expect(params.line_items.every((l) => l.price_data.currency === 'usd')).toBe(true);
	});

	it('refuses an unknown offer without calling Stripe', async () => {
		const { stripe, create } = mockStripe();
		const { status, reply } = await post(
			{ offerId: 'nosuchofferzzzz00', planId: 'static', interval: 'month' },
			stripe
		);
		expect(status).toBe(404);
		expect(reply.ok).toBe(false);
		expect(create).not.toHaveBeenCalled();
	});

	it('refuses an expired offer without calling Stripe', async () => {
		const { stripe, create } = mockStripe();
		const { status, reply } = await post(
			{ offerId: EXPIRED.id, planId: 'static', interval: 'month' },
			stripe
		);
		expect(status).toBe(410);
		expect(reply.message).toBe('This offer has expired.');
		expect(create).not.toHaveBeenCalled();
	});

	it('refuses a plan, interval or add-on the offer does not sell', async () => {
		const { stripe, create } = mockStripe();
		for (const body of [
			{ offerId: OFFER.id, planId: 'enterprise', interval: 'month' },
			{ offerId: OFFER.id, planId: 'monthly-only', interval: 'year' },
			{ offerId: OFFER.id, planId: 'static', interval: 'month', addOnIds: ['free-money'] }
		]) {
			expect((await post(body, stripe)).status).toBe(400);
		}
		expect(create).not.toHaveBeenCalled();
	});

	it('answers 503 for a valid selection when Stripe is not configured', async () => {
		const { status, reply } = await post(
			{ offerId: OFFER.id, planId: 'static', interval: 'month' },
			undefined
		);
		expect(status).toBe(503);
		expect(reply.ok).toBe(false);
	});

	it('answers 502 and logs the Stripe error, not the request, when create fails', async () => {
		const create = vi.fn(async () => {
			throw new Error('Stripe Tax is not active');
		});
		const stripe = { checkout: { sessions: { create } } } as unknown as CheckoutStripe;
		const { status, log } = await post(
			{ offerId: OFFER.id, planId: 'static', interval: 'month', note: 'secret-ish body' },
			stripe
		);
		expect(status).toBe(502);
		expect(log).toHaveBeenCalledWith(
			'[offer-checkout] Stripe session create failed: Stripe Tax is not active'
		);
		expect(JSON.stringify(log.mock.calls)).not.toContain('secret-ish body');
	});

	it('answers 502 when Stripe returns a session without a url', async () => {
		const { stripe } = mockStripe(null);
		const { status } = await post(
			{ offerId: OFFER.id, planId: 'static', interval: 'month' },
			stripe
		);
		expect(status).toBe(502);
	});
});
