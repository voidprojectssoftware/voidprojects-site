import { describe, expect, it, vi } from 'vitest';

const constructed = vi.hoisted(() => [] as unknown[][]);
vi.mock('stripe', () => ({
	default: class {
		constructor(...args: unknown[]) {
			constructed.push(args);
		}
	}
}));

const { stripeFromEnv } = await import('./stripe.js');
const { composeContactEmail } = await import('./contact-email.js');

describe('stripeFromEnv', () => {
	it('returns nothing and warns once, naming only the setting, when the key is missing', () => {
		const warn = vi.fn();
		const stripeFor = stripeFromEnv({ STRIPE_SECRET_KEY: '  ' });
		expect(stripeFor(warn)).toBeUndefined();
		expect(stripeFor(warn)).toBeUndefined();
		expect(warn).toHaveBeenCalledOnce();
		expect(warn).toHaveBeenCalledWith(
			'[stripe] STRIPE_SECRET_KEY not set; offer sign-up and questions answer 503'
		);
		expect(constructed).toHaveLength(0);
	});

	it('builds one client from the app setting', () => {
		const warn = vi.fn();
		const stripeFor = stripeFromEnv({ STRIPE_SECRET_KEY: 'sk_test_fake' });
		expect(stripeFor(warn)).toBe(stripeFor(warn));
		expect(constructed).toEqual([['sk_test_fake']]);
		expect(warn).not.toHaveBeenCalled();
	});
});

describe('composeContactEmail with an offer tag', () => {
	it('puts the offer id and business name in the subject and body', () => {
		const email = composeContactEmail(
			{
				name: 'Pat Baker',
				email: 'pat@test-bakery.example',
				kind: 'A website',
				message: 'When does the site go live?',
				offer: { id: 'testofferaaaa0000', business: 'Test\nBakery LLC' }
			},
			'from@voidprojects.ai',
			'to@voidprojects.ai'
		);
		expect(email.content.subject).toBe(
			'Offer question from Pat Baker, Test Bakery LLC (offer testofferaaaa0000)'
		);
		expect(email.content.plainText).toContain(
			'Business: Test Bakery LLC\nOffer: testofferaaaa0000'
		);
	});

	it('leaves a plain contact form email unchanged', () => {
		const email = composeContactEmail(
			{ name: 'Sam', email: 'sam@example.com', kind: 'A cause', message: 'Hello' },
			'from@voidprojects.ai',
			'to@voidprojects.ai'
		);
		expect(email.content.subject).toBe('Website request from Sam (A cause)');
		expect(email.content.plainText).toContain('Kind: A cause');
		expect(email.content.plainText).not.toContain('Offer:');
	});

	it('drops "Website" from the subject for a non-website kind', () => {
		const email = composeContactEmail(
			{
				name: 'Tom',
				email: 'tom@example.com',
				kind: 'Custom software or automation',
				message: 'Hello'
			},
			'from@voidprojects.ai',
			'to@voidprojects.ai'
		);
		expect(email.content.subject).toBe('Request from Tom (Custom software or automation)');
	});
});
