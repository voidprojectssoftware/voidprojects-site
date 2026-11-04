import { billingPortalUrl } from '$lib/offers/stripe.js';
import type { PageServerLoad } from './$types';

// Prerendered, so the portal link is read from the environment once per build.
export const load: PageServerLoad = () => ({ portalUrl: billingPortalUrl() });
