// What Stripe sees of an offer: the Checkout Session we create for a priced
// selection, and what we read back from a finished one. Type-only use of the SDK,
// so nothing here reaches a browser bundle; the client itself lives in api/src/stripe.ts.
import type Stripe from 'stripe';
import { offerPath } from './offer.js';
import type { CheckoutSelection } from './checkout-http.js';

export const TERMS_URL = 'https://voidprojects.ai/terms'; // the terms page (#82)
export const THANKS_PATH = '/thanks'; // generic thank-you page; it reads the session id, never an offer id

/**
 * The Customer Portal login link (`https://billing.stripe.com/p/login/...`, printed by
 * `npm run stripe-setup`) from PUBLIC_STRIPE_PORTAL_URL at build time, so test and live
 * builds differ without code edits. Public, not a secret. Unset or blank gives null and
 * the thank-you page offers email instead; anything that is not an https URL throws,
 * so a typo fails the build rather than shipping a broken link.
 */
export function billingPortalUrl(
	env: Record<string, string | undefined> = process.env
): string | null {
	const value = env.PUBLIC_STRIPE_PORTAL_URL?.trim();
	if (!value) return null;
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error(`PUBLIC_STRIPE_PORTAL_URL is not a URL: ${value}`);
	}
	if (url.protocol !== 'https:') throw new Error(`PUBLIC_STRIPE_PORTAL_URL is not https: ${value}`);
	return url.href;
}

// Custom field keys must be alphanumeric.
export const FIELD_KEYS = { business: 'businessname', bestTime: 'besttime' } as const;

export type CheckoutStripe = Pick<Stripe, 'checkout'>;

/** Session-create parameters; every amount and label comes from {@link CheckoutSelection}, which is server data. */
export function checkoutSessionParams(
	selection: CheckoutSelection,
	origin: string
): Stripe.Checkout.SessionCreateParams {
	const { offer, plan, interval, addOns, lines } = selection;
	const items = [plan, ...addOns];
	const metadata = {
		offer_id: offer.id,
		plan: plan.id,
		interval,
		add_ons: addOns.map((a) => a.id).join(',') || 'none'
	};
	return {
		mode: 'subscription',
		line_items: lines.map((line, i) => ({
			quantity: 1,
			price_data: {
				currency: offer.currency,
				unit_amount: line.price.amount,
				recurring: { interval: line.price.interval },
				tax_behavior: 'exclusive',
				product_data: {
					name: items[i].label,
					...(items[i].summary ? { description: items[i].summary } : {})
				}
			}
		})),
		automatic_tax: { enabled: true },
		billing_address_collection: 'required',
		phone_number_collection: { enabled: true },
		custom_fields: [
			{
				key: FIELD_KEYS.business,
				label: { type: 'custom', custom: 'Business name' },
				type: 'text'
			},
			{
				key: FIELD_KEYS.bestTime,
				label: { type: 'custom', custom: 'Best time to reach you' },
				type: 'text',
				optional: true
			}
		],
		consent_collection: { terms_of_service: 'required' },
		custom_text: {
			terms_of_service_acceptance: { message: `I agree to the [Terms of Service](${TERMS_URL}).` }
		},
		metadata,
		subscription_data: { metadata },
		success_url: `${new URL(THANKS_PATH, origin).href}?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: new URL(offerPath(offer.id), origin).href
	};
}

export interface SessionFollowUp {
	offerId: string;
	business: string;
	name: string;
	email: string;
}

/** Who to answer for a finished session of ours; undefined for an unpaid session or one we did not create. */
export function sessionFollowUp(session: Stripe.Checkout.Session): SessionFollowUp | undefined {
	const offerId = session.metadata?.offer_id;
	const email = session.customer_details?.email;
	if (!offerId || session.status !== 'complete' || !email) return undefined;
	const business =
		session.custom_fields.find((f) => f.key === FIELD_KEYS.business)?.text?.value?.trim() ?? '';
	return {
		offerId,
		business: business || '(not given)',
		name: session.customer_details?.name?.trim() || business || email,
		email
	};
}
