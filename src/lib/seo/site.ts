// Absolute URLs, page meta and structured data for search engines and AI agents.
// Everything here is assembled from the content modules so it cannot drift from
// the page copy.
import { CAUSES, CONTACT_EMAIL, PRICING, STATIC_SITE } from '$lib/content/websites.js';
import { CONTACT_PAGE, HERO_LINE } from '$lib/content/services.js';

export const SITE_ORIGIN = 'https://voidprojects.ai';
export const SITE_NAME = 'Void Projects';

export function absoluteUrl(path: string): string {
	return new URL(path, SITE_ORIGIN).href;
}

export interface ShareImage {
	path: string;
	width: number;
	height: number;
	alt: string;
}

export interface PageMeta {
	path: string;
	title: string;
	description: string; // meta and share description; search results cut off past about 155 chars
	summary?: string; // longer form for /llms.txt and JSON-LD, where length is not cut
	image?: ShareImage; // og:image and twitter:image; without one the share card is text only
}

// Head copy for the public pages; each page's <svelte:head> renders its entry
// through PageMeta, and /llms.txt reuses the descriptions (or the summary, where one is given).
export const PAGES = {
	home: {
		path: '/',
		title: 'Void Projects',
		description: `${HERO_LINE} AI does the heavy lifting; our engineers guide and review it.`
	},
	contact: {
		path: '/contact',
		title: 'Contact | Void Projects',
		description: CONTACT_PAGE.body
	},
	websites: {
		path: '/websites',
		title: 'Custom websites for businesses and causes | Void Projects',
		description: `Custom websites from engineers, sped up by our own AI tooling. You talk to a person, never the technical side. Static sites are ${STATIC_SITE.spoken}, no build fee.`,
		summary: `Custom websites from engineers with years of enterprise experience, sped up by our own AI tooling. You talk to a person and never touch the technical side. Static sites are ${STATIC_SITE.spoken}, and if you already pay for a site, we match it and take over hosting and upkeep.`,
		image: {
			path: '/og/websites.png', // exported by npm run export:brand (og-websites), then copied to static/
			width: 1200,
			height: 630,
			alt: 'Void Projects: Custom websites for businesses and causes. voidprojects.ai/websites'
		}
	},
	causes: {
		path: CAUSES.href,
		title: 'Websites for causes | Void Projects',
		description:
			'Memorials, cancer support, fundraisers, community groups. If your site exists to help people, Void Projects will do our best to build it for free.'
	},
	brand: {
		path: '/about/brand',
		title: 'Our brand | Void Projects',
		description:
			'Why the Void Projects logo is drawn fresh on every visit from real NASA/JPL spacecraft trajectories, and why everything on the site floats.'
	},
	blog: {
		path: '/blog',
		title: 'From The Void | Void Projects blog',
		description: 'Engineering write-ups from the Void Projects collective.'
	},
	terms: {
		path: '/terms',
		title: 'Terms of Service | Void Projects',
		description:
			'The plain-English agreement for a Void Projects website subscription: what you get, billing, cancelling and refunds, who owns what, and what happens when you leave.'
	},
	privacy: {
		path: '/privacy',
		title: 'Privacy Policy | Void Projects',
		description:
			'What personal information Void Projects collects through voidprojects.ai and our services, who we share it with, how long we keep it, and your choices.'
	}
} satisfies Record<string, PageMeta>;

type PricingRow = (typeof PRICING)[number];

// "$25 a month for a static site: ...": one pricing row read as a sentence.
function pricingSentence(row: PricingRow): string {
	const lead = row.spoken ?? row.figure;
	return `${lead.charAt(0).toUpperCase()}${lead.slice(1)} ${row.body}`;
}

export const PRICING_SUMMARY = PRICING.map(pricingSentence).join(' ');

type JsonLd = Record<string, unknown>;

const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;

const CONTEXT = 'https://schema.org';

function organization(): JsonLd {
	return {
		'@type': 'Organization',
		'@id': ORGANIZATION_ID,
		name: SITE_NAME,
		url: SITE_ORIGIN,
		description: PAGES.home.description,
		email: CONTACT_EMAIL,
		contactPoint: {
			'@type': 'ContactPoint',
			contactType: 'customer service',
			email: CONTACT_EMAIL,
			url: absoluteUrl(PAGES.contact.path)
		}
	};
}

export function organizationJsonLd(): JsonLd {
	return { '@context': CONTEXT, ...organization() };
}

// One Offer per row of the pricing section, priced only where the row names a price.
function pricingOffer(row: PricingRow): JsonLd {
	const { name, usd, monthly } = row.offer;
	const offer: JsonLd = {
		'@type': 'Offer',
		name,
		description: pricingSentence(row),
		url: absoluteUrl(row.link?.href ?? `${PAGES.websites.path}#contact`)
	};
	if (usd === undefined) return offer;
	offer.price = usd;
	offer.priceCurrency = 'USD';
	if (monthly) {
		offer.priceSpecification = {
			'@type': 'UnitPriceSpecification',
			price: usd,
			priceCurrency: 'USD',
			unitCode: 'MON',
			unitText: 'month',
			referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' }
		};
	}
	return offer;
}

export function websitesJsonLd(): JsonLd {
	return {
		'@context': CONTEXT,
		'@graph': [
			organization(),
			{
				'@type': 'Service',
				name: 'Websites',
				serviceType: 'Custom websites',
				url: absoluteUrl(PAGES.websites.path),
				description: PAGES.websites.summary,
				provider: { '@id': ORGANIZATION_ID },
				offers: PRICING.map(pricingOffer)
			}
		]
	};
}

export function causesJsonLd(): JsonLd {
	return {
		'@context': CONTEXT,
		'@type': 'Service',
		name: 'Websites for causes',
		serviceType: 'Websites for causes',
		url: absoluteUrl(PAGES.causes.path),
		description: CAUSES.body,
		provider: {
			'@type': 'Organization',
			'@id': ORGANIZATION_ID,
			name: SITE_NAME,
			url: SITE_ORIGIN
		},
		offers: {
			'@type': 'Offer',
			description: CAUSES.promise.join(' '),
			url: absoluteUrl(`${PAGES.causes.path}#contact`)
		}
	};
}
