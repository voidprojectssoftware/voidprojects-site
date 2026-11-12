// What Void Projects sells, for the Home hero and services section, /contact and /llms.txt.
// Copy here follows the owner's answers on issue #104: no figures, training formats,
// booking links or support promises.

export interface Service {
	key: string; // CONTACT_KIND_KEYS key the card preselects on /contact
	title: string;
	body: string;
	ask: string; // the card's link to /contact
	links?: { href: string; label: string }[]; // pages of its own, where they exist
}

// The plain line under the hero title. Drawn letter by letter as physics glyphs, so keep it short.
export const HERO_LINE = 'Websites, custom software, AI strategy and training.';

export const HERO_CTA = 'Tell us what you need';

// The call to action that closes Home, after the team.
export const CLOSING = {
	title: 'Have something in mind?',
	body: 'A website, software, or help with AI. An engineer reads every message, and we reply within one business day.'
};

export const SERVICES_HEADING = 'What we do';
export const SERVICES_INTRO = 'Four ways we help, from the same engineers.';

export const SERVICES: Service[] = [
	{
		key: 'strategy',
		title: 'AI strategy',
		ask: 'Ask about AI strategy',
		body: 'Find where AI can make your business run better, choose the right AI tools and roll them out, and put AI to work in the places that matter most.'
	},
	{
		key: 'software',
		title: 'Custom software',
		ask: 'Ask about custom software',
		body: 'Apps, internal tools, integrations between the systems you already use, and automation for the repetitive work. Once it is paid for, the software is yours.'
	},
	{
		key: 'website',
		title: 'Websites',
		ask: 'Ask about a website',
		body: 'A site built and looked after by engineers, from $25 a month for a static site, with no build fee and no contract. Sites for causes are free when we can.',
		links: [
			{ href: '/websites', label: 'See websites' },
			{ href: '/websites/causes', label: 'Sites for causes' }
		]
	},
	{
		key: 'training',
		title: 'AI training',
		ask: 'Ask about AI training',
		body: 'Workshops for your team on understanding AI tools and putting them to work in their own jobs.'
	}
];

// Why it costs less: the same model the /websites page explains, stated for every service.
export const WHY_LESS = {
	title: 'Why it costs less',
	body: 'Simple work, like a static website, has no build fee: you pay what it costs to run. Bigger custom projects are billed by the hour for engineering time and support, plus the infrastructure they run on. AI does the heavy lifting and our engineers review it, which keeps those hours low.'
};

// How larger work is priced, for /llms.txt; the owner gave no figures.
export const OTHER_PRICING =
	'Complex sites and custom software are billed by the hour for engineering time and support, plus the infrastructure they run on. There are no published rates; for those and for AI strategy or AI training, ask through the contact form or by email.';

export const LOCATION = 'Memphis, Tennessee';

export const CONTACT_PAGE = {
	title: 'Tell us what you need',
	body: 'A website, software, help with AI, or just a problem you want gone. Describe it in your own words. An engineer reads every message and writes back.',
	unsure: 'Not sure what to call it? Pick “Not sure yet” and tell us what is getting in your way.'
};
