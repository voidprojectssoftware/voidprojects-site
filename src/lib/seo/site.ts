// Absolute URLs, page meta and structured data for search engines and AI agents.
// Everything here is assembled from the content modules so it cannot drift from
// the page copy.
import { CAUSES, CONTACT_EMAIL, PRICING } from '$lib/content/websites.js';

export const SITE_ORIGIN = 'https://voidprojects.ai';
export const SITE_NAME = 'Void Projects';

export function absoluteUrl(path: string): string {
	return new URL(path, SITE_ORIGIN).href;
}

export interface PageMeta {
	path: string;
	title: string;
	description: string;
}

// Head copy for the public pages; each page's <svelte:head> renders its entry
// through PageMeta, and /llms.txt reuses the descriptions.
export const PAGES = {
	home: {
		path: '/',
		title: 'Void Projects',
		description: 'AI-centric projects from a developer collective.'
	},
	websites: {
		path: '/websites',
		title: 'Websites by Void Projects',
		description:
			'Custom websites from engineers with years of enterprise experience, sped up by our own AI tooling. You talk to a person and never touch the technical side. Static sites are $25 a month, and if you already pay for a site, we match it and take over hosting and upkeep.'
	},
	causes: {
		path: CAUSES.href,
		title: 'Websites for causes | Void Projects',
		description:
			'Memorials, cancer support, fundraisers, community groups. If your site exists to help people, Void Projects will do our best to build it for free.'
	},
	blog: {
		path: '/blog',
		title: 'From The Void',
		description: 'Engineering write-ups from the Void Projects collective.'
	}
} satisfies Record<string, PageMeta>;

// "Free for causes, ... $25 a month ..." : the pricing section read as sentences.
export const PRICING_SUMMARY = PRICING.map((p) => {
	const lead = p.spoken ?? p.figure;
	return `${lead.charAt(0).toUpperCase()}${lead.slice(1)} ${p.body}`;
}).join(' ');

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
			contactType: 'website requests',
			email: CONTACT_EMAIL,
			url: absoluteUrl(`${PAGES.websites.path}#contact`)
		}
	};
}

export function organizationJsonLd(): JsonLd {
	return { '@context': CONTEXT, ...organization() };
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
				description: PAGES.websites.description,
				provider: { '@id': ORGANIZATION_ID },
				offers: {
					'@type': 'Offer',
					description: PRICING_SUMMARY,
					url: absoluteUrl(`${PAGES.websites.path}#contact`)
				}
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
