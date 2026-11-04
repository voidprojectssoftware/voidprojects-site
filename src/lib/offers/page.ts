// The props every offers/<id>/page.svelte receives. scripts/build-offers.mjs builds
// them at build time, renders the page with them and serializes them into the
// HTML for hydration, so they must stay JSON-safe.
import type { PublicOffer } from './offer.js';

export interface QrMatrix {
	size: number; // modules per side, quiet zone excluded
	path: string; // SVG path of the dark modules in a size x size viewBox
}

export interface OfferContext {
	url: string; // the page's absolute production URL, which the QR code encodes
	qr: QrMatrix;
	builtAt: string; // ISO timestamp of the build; first render judges expiry from it so hydration matches
	checkoutEndpoint: string;
}

export interface OfferPageProps {
	offer: PublicOffer;
	context: OfferContext;
}
