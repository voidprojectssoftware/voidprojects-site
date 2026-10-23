// Content for the /websites landing page, the target of the "Made by Void
// Projects" footer link on every site we build.

export const CONTACT_EMAIL = 'hello@voidprojects.ai';

export const MARGIN_PERCENT = 30;

export interface ShowcaseSite {
	name: string;
	url: string;
	host: string;
	kind: string; // short label, e.g. "Cause" or "Small business"
	blurb: string;
	free: boolean; // built at no charge (cause work)
	desktop: string; // screenshot paths under static/
	mobile: string;
}

export const SHOWCASE: ShowcaseSite[] = [
	{
		name: 'Rally4Hallie',
		url: 'https://rally4hallie.com',
		host: 'rally4hallie.com',
		kind: 'Cause',
		blurb:
			'Connects family and friends to Hallie’s journey overcoming breast cancer: her own updates, an email list so nobody misses one, and a shirt store that funds her care. Hallie is the mother of one of our own, and the site was built free.',
		free: true,
		desktop: '/websites/rally4hallie-desktop.jpg',
		mobile: '/websites/rally4hallie-mobile.jpg'
	},
	{
		name: 'Di Donna Studio',
		url: 'https://didonnastudio.com',
		host: 'didonnastudio.com',
		kind: 'Small business',
		blurb:
			'A booking-first home for Angela Di Donna’s hair, skin, brow, and lash studio in Hernando, Mississippi: every service and price in one place, her story, and the way to book.',
		free: false,
		desktop: '/websites/didonnastudio-desktop.jpg',
		mobile: '/websites/didonnastudio-mobile.jpg'
	}
];

export interface Principle {
	title: string;
	body: string;
}

export const PRINCIPLES: Principle[] = [
	{
		title: 'A human on every message',
		body: 'Our process is AI augmented, but you always talk to a person. AI speeds up the build; it never replaces the conversation.'
	},
	{
		title: 'Open billing',
		body: `You see what the site costs us, itemized, and pay that plus ${MARGIN_PERCENT}%. Our time and work cost you $0.`
	},
	{
		title: 'Free when we can',
		body: 'If your site is simple enough, the cost can be nothing. If it serves a cause, we build it free.'
	}
];
