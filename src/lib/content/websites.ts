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
	screenshot: string; // desktop capture under static/
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
		screenshot: '/websites/rally4hallie-desktop.jpg'
	},
	{
		name: 'Di Donna Studio',
		url: 'https://didonnastudio.com',
		host: 'didonnastudio.com',
		kind: 'Small business',
		blurb:
			'A booking-first home for Angela Di Donna’s hair, skin, brow, and lash studio in Hernando, Mississippi: every service and price in one place, her story, and the way to book.',
		free: false,
		screenshot: '/websites/didonnastudio-desktop.jpg'
	}
];

export interface Point {
	title: string;
	body: string;
}

// What the client is spared. Rendered as a struck-through "you'll never have to" list.
export const NEVER = [
	'See a line of code',
	'Wrestle a drag-and-drop builder with a buggy UI',
	'Figure out hosting, domains, or any other technical answer'
];

export const PRINCIPLES: Point[] = [
	{
		title: 'A human on every message',
		body: 'Our process is AI augmented, but you always talk to a person. AI speeds up the build; it never replaces the conversation.'
	},
	{
		title: 'Open billing',
		body: `You pay what your site costs us plus ${MARGIN_PERCENT}%. Our time and work cost you $0.`
	},
	{
		title: 'Free when we can',
		body: 'If we can make your site free, we will, and simple sites for a cause are. Once a site grows complex enough, it can’t reasonably stay free, and we’ll talk that through with you.'
	}
];

// The "how is this possible?" answer.
export const HOW: Point[] = [
	{
		title: 'Our agents do the heavy lifting',
		body: 'The brunt of the development work is handled by an agentic system we built ourselves, steered by engineers who know what good software looks like.'
	},
	{
		title: 'Results right away',
		body: 'You see a working version almost immediately, not weeks later, and each round of changes comes back fast.'
	},
	{
		title: 'Feedback without the overhead',
		body: 'Our own feedback tools cut out the usual back-and-forth, so your vision becomes a finished site far more smoothly than was possible before.'
	}
];
