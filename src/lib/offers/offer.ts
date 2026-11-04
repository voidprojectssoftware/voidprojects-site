// The offer data schema. Each offers/<id>/offer.ts default-exports a
// defineOffer() input; scripts/build-offers.mjs renders it into build/o/<id>/,
// and the API (scripts/build-api.mjs) bundles the same files so a checkout prices
// a plan from this data, never from what the browser sends.

export type Interval = 'month' | 'year';

export const INTERVALS: readonly Interval[] = ['month', 'year'];

export const DEFAULT_VALID_DAYS = 30; // the epic's default offer lifetime
export const RETENTION_DAYS = 90; // prospect data for an offer not taken is removed this long after sending
export const ANNUAL_MONTHS_CHARGED = 10; // default annual price: pay 10 months, get 12

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const OFFER_ID = /^[a-z0-9]{16,}$/; // folder names under offers/; long and random so they cannot be guessed

// Amounts are whole cents (Stripe's minor units), so 2500 is 25.00.
interface Pricing {
	monthly?: number; // billed each month; omit for an annual-only price
	annual?: number | false; // billed each year; defaults to ANNUAL_MONTHS_CHARGED x monthly, false offers monthly only
}

export interface PlanInput extends Pricing {
	id: string; // stable key the sign-up button posts back; unique within the offer
	label: string;
	summary?: string;
	features?: string[];
}

export interface AddOnInput extends Pricing {
	id: string; // unique within the offer
	label: string;
	summary?: string;
}

export interface Concern {
	title: string;
	detail: string;
}

export interface OfferContact {
	name: string;
	email?: string;
	phone?: string;
	note?: string; // anything about following up, for example the best time to call
}

export interface OfferInput {
	prospect: string; // business name, shown on the page
	sent: string; // ISO date the link was sent; expiry and retention count from it
	expires?: string; // ISO date, last day the offer stands; defaults to sent + DEFAULT_VALID_DAYS
	previewUrl: string; // the site we built for them
	currency?: string; // ISO 4217, lowercase as Stripe expects; defaults to 'usd'
	concerns: Concern[];
	plans: PlanInput[];
	addOns?: AddOnInput[];
	contact: OfferContact; // who to follow up with; server side only, never sent to the page
}

export interface Price {
	interval: Interval;
	amount: number; // whole cents
}

export interface Plan {
	id: string;
	label: string;
	summary?: string;
	features: string[];
	prices: Price[];
}

export interface AddOn {
	id: string;
	label: string;
	summary?: string;
	prices: Price[];
}

export interface Offer {
	id: string;
	prospect: string;
	sent: string;
	expires: string;
	previewUrl: string;
	currency: string;
	concerns: Concern[];
	plans: Plan[];
	addOns: AddOn[];
	intervals: Interval[]; // every interval at least one plan is sold on, in INTERVALS order
	contact: OfferContact;
}

// What the page receives: everything but the follow-up contact.
export type PublicOffer = Omit<Offer, 'contact'>;

// Identity function that types an offer file and keeps it checkable by svelte-check.
export function defineOffer(input: OfferInput): OfferInput {
	return input;
}

function addDays(isoDate: string, days: number): string {
	return new Date(Date.parse(isoDate) + days * DAY_MS).toISOString().slice(0, 10);
}

function prices(pricing: Pricing, where: string): Price[] {
	const out: Price[] = [];
	if (pricing.monthly !== undefined) out.push({ interval: 'month', amount: pricing.monthly });
	const annual =
		pricing.annual === undefined && pricing.monthly !== undefined
			? pricing.monthly * ANNUAL_MONTHS_CHARGED
			: pricing.annual;
	if (typeof annual === 'number') out.push({ interval: 'year', amount: annual });
	for (const p of out) {
		if (!Number.isInteger(p.amount) || p.amount <= 0) {
			throw new Error(`${where}: ${p.interval} amount must be a positive whole number of cents`);
		}
	}
	if (!out.length) throw new Error(`${where}: needs a monthly or annual amount`);
	return out;
}

function uniqueIds(items: { id: string }[], where: string) {
	const seen = new Set<string>();
	for (const { id } of items) {
		if (seen.has(id)) throw new Error(`${where}: duplicate id "${id}"`);
		seen.add(id);
	}
}

/** Fills the defaults and validates; throws with the offer id on bad data so a build fails loudly. */
export function resolveOffer(id: string, input: OfferInput): Offer {
	const where = `offer ${id}`;
	if (!OFFER_ID.test(id)) {
		throw new Error(`${where}: id must be 16 or more lowercase letters and digits`);
	}
	for (const [key, value] of [
		['sent', input.sent],
		['expires', input.expires]
	] as const) {
		if (value !== undefined && !ISO_DATE.test(value)) {
			throw new Error(`${where}: ${key} must be an ISO date (YYYY-MM-DD)`);
		}
	}
	if (!input.plans.length) throw new Error(`${where}: needs at least one plan`);
	uniqueIds(input.plans, `${where} plans`);
	uniqueIds(input.addOns ?? [], `${where} add-ons`);

	const plans = input.plans.map((p) => ({
		id: p.id,
		label: p.label,
		summary: p.summary,
		features: p.features ?? [],
		prices: prices(p, `${where} plan ${p.id}`)
	}));
	const addOns = (input.addOns ?? []).map((a) => ({
		id: a.id,
		label: a.label,
		summary: a.summary,
		prices: prices(a, `${where} add-on ${a.id}`)
	}));
	const sold = new Set(plans.flatMap((p) => p.prices.map((price) => price.interval)));

	return {
		id,
		prospect: input.prospect,
		sent: input.sent,
		expires: input.expires ?? addDays(input.sent, DEFAULT_VALID_DAYS),
		previewUrl: input.previewUrl,
		currency: input.currency ?? 'usd',
		concerns: input.concerns,
		plans,
		addOns,
		intervals: INTERVALS.filter((i) => sold.has(i)),
		contact: input.contact
	};
}

export function publicOffer(offer: Offer): PublicOffer {
	const { contact: _contact, ...rest } = offer; // eslint-disable-line @typescript-eslint/no-unused-vars
	return rest;
}

// The offer stands through the whole of its `expires` day, UTC.
export function isExpired(offer: Pick<Offer, 'expires'>, now: Date): boolean {
	return now.getTime() >= Date.parse(offer.expires) + DAY_MS;
}

export function retentionEnds(offer: Pick<Offer, 'sent'>): string {
	return addDays(offer.sent, RETENTION_DAYS);
}

export function priceFor(item: { prices: Price[] }, interval: Interval): Price | undefined {
	return item.prices.find((p) => p.interval === interval);
}

export function formatAmount(cents: number, currency: string): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency.toUpperCase(),
		minimumFractionDigits: cents % 100 === 0 ? 0 : 2
	}).format(cents / 100);
}

export function formatDate(isoDate: string): string {
	return new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(
		new Date(Date.parse(isoDate))
	);
}

export function offerPath(id: string): string {
	return `/o/${id}/`;
}
