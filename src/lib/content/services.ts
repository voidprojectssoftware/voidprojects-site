// What Void Projects sells, for the Home hero and services section, /contact and /llms.txt.
// Copy here is written to stay true until the owner confirms the open business
// questions (issue #104): no prices, formats, timelines or promises beyond what the
// site already states. Swap in confirmed answers here.

export interface Service {
	key: string; // CONTACT_KIND_KEYS key the card preselects on /contact
	title: string;
	body: string;
	ask: string; // the card's link to /contact
	link?: { href: string; label: string }; // a page of its own, where one exists
}

// The plain line under the hero title. Drawn letter by letter as physics glyphs, so keep it short.
export const HERO_LINE = 'Consulting, custom software, websites and AI training.';

export const HERO_CTA = 'Tell us what you need';

export const SERVICES_HEADING = 'What we do';

export const SERVICES: Service[] = [
	{
		key: 'consulting',
		title: 'Consulting',
		ask: 'Ask about consulting',
		body: 'Talk a problem through with an engineer and get a straight answer on what to build, buy, or leave alone.'
	},
	{
		key: 'software',
		title: 'Custom software',
		ask: 'Ask about custom software',
		body: 'Apps, internal tools, integrations between the systems you already use, and automation for the repetitive work.'
	},
	{
		key: 'website',
		title: 'Websites',
		ask: 'Ask about a website',
		body: 'A site built and looked after by engineers, from $25 a month for a static site, with no build fee and no contract.',
		link: { href: '/websites', label: 'See websites' }
	},
	{
		key: 'training',
		title: 'AI training',
		ask: 'Ask about AI training',
		body: 'Help your team understand AI tools and put them to work in their own jobs.'
	}
];

// Why it costs less: the same model the /websites page explains, stated for every service.
export const WHY_LESS = {
	title: 'Why it costs less',
	body: 'AI does the heavy lifting, and our engineers guide and review everything it produces. That cuts the hours a project takes, so we price from what it actually costs us to build and run.'
};

// How non-website work is priced, for /llms.txt; no figures until the owner confirms them.
export const OTHER_PRICING =
	'For consulting, custom software and AI training, ask through the contact form or by email; we price those from what the work costs us, as above.';

export const CONTACT_PAGE = {
	title: 'Tell us what you need',
	body: 'A website, software, advice, or just a problem you want gone. Describe it in your own words. An engineer reads every message and writes back.',
	unsure: 'Not sure what to call it? Pick “Not sure yet” and tell us what is getting in your way.'
};
