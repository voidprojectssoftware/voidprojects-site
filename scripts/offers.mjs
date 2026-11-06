// Finds the offer folders shared by scripts/build-offers.mjs and scripts/build-api.mjs.
// Folders starting with "_" are skipped, so a draft can sit in offers/ unbuilt.
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const offersDir = join(root, 'offers');

export function listOfferIds() {
	if (!existsSync(offersDir)) return [];
	return readdirSync(offersDir, { withFileTypes: true })
		.filter((d) => d.isDirectory() && !d.name.startsWith('_'))
		.map((d) => d.name)
		.sort();
}

export function offerFile(id, name) {
	return join(offersDir, id, name);
}

// virtual:offers: every offer's data, resolved, so /api/offer-checkout prices from
// it. Used by the API bundle and scripts/preview-offers.mjs; the bundle is the one
// place outside build/o/<id>/ where offer ids may appear.
export function offersPlugin() {
	const id = '\0virtual:offers';
	const ids = listOfferIds();
	const code = [
		`import { resolveOffer } from ${JSON.stringify(join(root, 'src/lib/offers/offer.ts'))};`,
		...ids.map(
			(offerId, i) => `import o${i} from ${JSON.stringify(offerFile(offerId, 'offer.ts'))};`
		),
		`const offers = new Map([${ids.map((offerId, i) => `[${JSON.stringify(offerId)}, resolveOffer(${JSON.stringify(offerId)}, o${i})]`).join(', ')}]);`,
		'export const findOffer = (offerId) => offers.get(offerId);'
	].join('\n');
	return {
		name: 'virtual-offers',
		resolveId: (source) => (source === 'virtual:offers' ? id : undefined),
		load: (resolved) => (resolved === id ? code : undefined)
	};
}
