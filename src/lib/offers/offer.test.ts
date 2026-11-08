import { describe, expect, it } from 'vitest';
import {
	acceptedPlan,
	groupConflicts,
	isExpired,
	resolveOffer,
	seatCountError,
	type OfferInput
} from './offer.js';

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

describe('add-on groups', () => {
	const addOns: OfferInput['addOns'] = [
		{ id: 'gbp', label: 'Listing care', monthly: 1000 },
		{ id: 'suite', label: 'Office suite', group: 'Email', monthly: 1500 },
		{ id: 'box', label: 'One mailbox', group: 'Email', monthly: 500 }
	];

	it('keeps the group on grouped add-ons and leaves it off the rest', () => {
		const offer = resolveOffer(ID, { ...INPUT, addOns });
		expect(offer.addOns.map((a) => a.group)).toEqual([undefined, 'Email', 'Email']);
		expect('group' in offer.addOns[0]).toBe(false);
	});

	it('fails the build on a blank group', () => {
		expect(() =>
			resolveOffer(ID, { ...INPUT, addOns: [{ id: 'x', label: 'X', group: ' ', monthly: 100 }] })
		).toThrow(/group must not be blank/);
	});

	it('allows one per group with any number of ungrouped add-ons', () => {
		const offer = resolveOffer(ID, { ...INPUT, addOns });
		expect(groupConflicts(offer.addOns, ['gbp', 'box'])).toEqual([]);
		expect(groupConflicts(offer.addOns, ['suite'])).toEqual([]);
		expect(groupConflicts(offer.addOns, [])).toEqual([]);
	});

	it('names every id after the first from one group', () => {
		const offer = resolveOffer(ID, { ...INPUT, addOns });
		expect(groupConflicts(offer.addOns, ['box', 'gbp', 'suite'])).toEqual(['suite']);
	});
});

describe('per-seat add-ons', () => {
	const seat = (seats: NonNullable<OfferInput['addOns']>[number]['seats']) =>
		resolveOffer(ID, { ...INPUT, addOns: [{ id: 'suite', label: 'Suite', monthly: 1500, seats }] })
			.addOns[0];

	it('fills min 1 and default min, and leaves seats off other add-ons', () => {
		expect(seat({ max: 25, unit: 'person', units: 'people' }).seats).toEqual({
			min: 1,
			max: 25,
			default: 1,
			unit: 'person',
			units: 'people'
		});
		const plain = resolveOffer(ID, {
			...INPUT,
			addOns: [{ id: 'x', label: 'X', monthly: 100 }]
		}).addOns[0];
		expect('seats' in plain).toBe(false);
	});

	it.each([
		[{ max: 0, unit: 'person', units: 'people' }, /whole numbers/],
		[{ max: 2.5, unit: 'person', units: 'people' }, /whole numbers/],
		[{ min: 3, max: 2, unit: 'person', units: 'people' }, /min <= default <= max/],
		[{ max: 5, default: 6, unit: 'person', units: 'people' }, /min <= default <= max/],
		[{ max: 5, unit: ' ', units: 'people' }, /unit and units/]
	])('fails the build on %o', (seats, error) => {
		expect(() => seat(seats)).toThrow(error);
	});

	it('allows whole counts from min to max only', () => {
		const addOn = seat({ min: 1, max: 25, unit: 'person', units: 'people' });
		for (const n of [1, 3, 25]) expect(seatCountError(addOn, n)).toBeUndefined();
		for (const n of [0, 26, 2.5, '3', null, undefined, NaN]) {
			expect(seatCountError(addOn, n)).toMatch(/whole number of people from 1 to 25/);
		}
		expect(seatCountError({}, 1)).toMatch(/not sold per seat/);
	});
});
