import { describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import type { ContactSubmission } from '$lib/contact/contact-http.js';
import { questionResponse } from './question-http.js';
import type { CheckoutStripe } from './stripe.js';

const SESSION_ID = 'cs_test_a1B2c3D4e5F6g7H8';

function session(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
	return {
		id: SESSION_ID,
		status: 'complete',
		metadata: { offer_id: 'testofferaaaa0000', plan: 'static', interval: 'month', add_ons: 'none' },
		customer_details: { name: 'Pat Baker', email: 'pat@test-bakery.example' },
		custom_fields: [
			{ key: 'businessname', type: 'text', text: { value: 'Test Bakery LLC' } },
			{ key: 'besttime', type: 'text', text: { value: 'Mornings' } }
		],
		...overrides
	} as unknown as Stripe.Checkout.Session;
}

function mockStripe(read: () => Promise<Stripe.Checkout.Session>) {
	const retrieve = vi.fn(read);
	return {
		stripe: { checkout: { sessions: { retrieve } } } as unknown as CheckoutStripe,
		retrieve
	};
}

async function ask(body: unknown, stripe: CheckoutStripe | undefined) {
	const deliver = vi.fn(async (submission: ContactSubmission) => void submission);
	const res = await questionResponse('application/json', JSON.stringify(body), {
		stripe,
		deliver
	});
	return { status: res.status, body: JSON.parse(res.body), deliver };
}

describe('questionResponse', () => {
	it('delivers through the contact path, tagged from the session, not the browser', async () => {
		const { stripe, retrieve } = mockStripe(async () => session());
		const { status, deliver } = await ask(
			{
				sessionId: SESSION_ID,
				message: 'When does the site go live?',
				name: 'Someone Else',
				email: 'attacker@example.com',
				offer: { id: 'otherofferzzzz000', business: 'Spoofed Inc' }
			},
			stripe
		);
		expect(status).toBe(200);
		expect(retrieve).toHaveBeenCalledWith(SESSION_ID);
		expect(deliver).toHaveBeenCalledWith({
			name: 'Pat Baker',
			email: 'pat@test-bakery.example',
			kind: 'A website',
			message: 'When does the site go live?',
			offer: { id: 'testofferaaaa0000', business: 'Test Bakery LLC' }
		});
	});

	it('refuses a malformed session id without calling Stripe', async () => {
		const { stripe, retrieve } = mockStripe(async () => session());
		const { status } = await ask({ sessionId: 'pi_123', message: 'Hi' }, stripe);
		expect(status).toBe(400);
		expect(retrieve).not.toHaveBeenCalled();
	});

	it('refuses an unpaid session or one we did not create', async () => {
		for (const s of [session({ status: 'open' }), session({ metadata: {} })]) {
			const { stripe } = mockStripe(async () => s);
			const { status, deliver } = await ask({ sessionId: SESSION_ID, message: 'Hi' }, stripe);
			expect(status).toBe(404);
			expect(deliver).not.toHaveBeenCalled();
		}
	});

	it('answers 404 when Stripe has no such session', async () => {
		const { stripe } = mockStripe(async () => {
			throw Object.assign(new Error('No such checkout.session'), { statusCode: 404 });
		});
		expect((await ask({ sessionId: SESSION_ID, message: 'Hi' }, stripe)).status).toBe(404);
	});

	it('answers 503 when Stripe is not configured', async () => {
		const { status, deliver } = await ask({ sessionId: SESSION_ID, message: 'Hi' }, undefined);
		expect(status).toBe(503);
		expect(deliver).not.toHaveBeenCalled();
	});

	it('uses the contact validation for the message', async () => {
		const { stripe } = mockStripe(async () => session());
		const { status, body } = await ask({ sessionId: SESSION_ID, message: '   ' }, stripe);
		expect(status).toBe(400);
		expect(body.error).toBe('Message is required.');
	});

	it('drops a filled honeypot silently', async () => {
		const { stripe, retrieve } = mockStripe(async () => session());
		const { status, deliver } = await ask(
			{ sessionId: SESSION_ID, message: 'Hi', website: 'spam' },
			stripe
		);
		expect(status).toBe(200);
		expect(retrieve).not.toHaveBeenCalled();
		expect(deliver).not.toHaveBeenCalled();
	});
});
