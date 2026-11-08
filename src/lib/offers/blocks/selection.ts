import { priceFor, type Interval, type PublicOffer } from '../offer.js';

// What the visitor has picked; PlanPicker edits it and SignUpButton posts it.
export interface Selection {
	planId: string;
	interval: Interval;
	addOnIds: string[];
	seats: Record<string, number>; // seat count for each chosen per-seat add-on, and only those
}

// Starts on the first interval the offer sells (monthly when it sells both) and
// the first plan sold on it.
export function initialSelection(offer: PublicOffer, interval = offer.intervals[0]): Selection {
	const plan = offer.plans.find((p) => priceFor(p, interval)) ?? offer.plans[0];
	return { planId: plan.id, interval, addOnIds: [], seats: {} };
}
