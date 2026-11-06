// The Stripe client for the offer functions. Lives in api/ (not $lib) so the Vite
// dev middleware and the browser bundles can never load it or the secret key.
import Stripe from 'stripe';

export const STRIPE_SETTING = 'STRIPE_SECRET_KEY';

type Log = (message: string) => void;

/**
 * Reads {@link STRIPE_SETTING} once. Without it every call returns undefined (the
 * callers answer 503) and the first call logs one warning naming the setting.
 */
export function stripeFromEnv(
	env: Record<string, string | undefined>,
	create: (key: string) => Stripe = (key) => new Stripe(key)
): (warn: Log) => Stripe | undefined {
	const key = env[STRIPE_SETTING]?.trim();
	if (!key) {
		let warned = false;
		return (warn) => {
			if (!warned) {
				warned = true;
				warn(`[stripe] ${STRIPE_SETTING} not set; offer sign-up and questions answer 503`);
			}
			return undefined;
		};
	}
	const stripe = create(key);
	return () => stripe;
}

let shared: ((warn: Log) => Stripe | undefined) | undefined;

// One client (and at most one warning) per process, shared by every function.
export function processStripe(warn: Log): Stripe | undefined {
	shared ??= stripeFromEnv(process.env);
	return shared(warn);
}
