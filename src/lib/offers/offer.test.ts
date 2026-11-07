import { describe, expect, it } from 'vitest';
import { acceptedPlan, isExpired, resolveOffer, type OfferInput } from './offer.js';

// A made-up offer for the tests only; no real offer id appears in src/.
const INPUT: OfferInput = {
	prospect: 'Test Bakery',
	sent: '2026-11-01',
	previewUrl: 'https://test-bakery.example/',
	concerns: [],
	plans: [
		{ id: 'static', label: 'Static site', monthly: 2500 },
		{ id: 'monthly-only', label: 'Monthly only', monthly: 4000, annual: false }
	],
	contact: { name: 'Test Contact' }
};
const ID = 'testofferaaaa0000';

describe('resolveOffer accepted', () => {
	it('defaults to null', () => {
		expect(resolveOffer(ID, INPUT).accepted).toBeNull();
	});

	it('keeps a valid acceptance and finds its plan and price', () => {
		const offer = resolveOffer(ID, {
			...INPUT,
			accepted: { on: '2026-11-06', planId: 'static', interval: 'year' }
		});
		expect(offer.accepted).toEqual({ on: '2026-11-06', planId: 'static', interval: 'year' });
		expect(acceptedPlan(offer)).toMatchObject({
			on: '2026-11-06',
			plan: { id: 'static' },
			price: { interval: 'year', amount: 25000 }
		});
	});

	it.each([
		[{ on: '2026-11-06', planId: 'enterprise', interval: 'month' }, /not one of its plans/],
		[{ on: '2026-11-06', planId: 'monthly-only', interval: 'year' }, /not sold on plan/],
		[{ on: '2026-11-06', planId: 'static', interval: 'week' }, /not sold on plan/],
		[{ on: '6 Nov 2026', planId: 'static', interval: 'month' }, /ISO date/],
		[{ on: '2026-10-01', planId: 'static', interval: 'month' }, /before sent/]
	])('fails the build on %o', (accepted, error) => {
		expect(() =>
			resolveOffer(ID, { ...INPUT, accepted: accepted as OfferInput['accepted'] })
		).toThrow(error);
	});
});

describe('isExpired', () => {
	it('never reports an accepted offer as expired', () => {
		const late = new Date('2027-06-01T00:00:00Z');
		const open = resolveOffer(ID, INPUT);
		const taken = resolveOffer(ID, {
			...INPUT,
			accepted: { on: '2026-11-06', planId: 'static', interval: 'month' }
		});
		expect(isExpired(open, late)).toBe(true);
		expect(isExpired(taken, late)).toBe(false);
		expect(acceptedPlan(open)).toBeNull();
	});
});
