// Content for the /websites landing page, the target of the "Made by Void
// Projects" footer link on every site we build.

export const CONTACT_EMAIL = 'hello@voidprojects.ai';

export const MARGIN_PERCENT = 30;

// Minecraft-style splash on the hero headline; one is picked at random per load.
export const SPLASHES = [
	'We hate Wix too!',
	'Squarespace is just squares!',
	'No drag and drop!',
	'Now with 100% more humans!',
	'Not a chatbot!',
	'Zero lines of code for you!',
	'Your nephew can relax now!',
	'Better than a template!',
	'Talk to an actual engineer!',
	'No buggy builders!',
	'Hand-built, AI-boosted!'
];

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

// What the client is spared. Rendered as a struck-through "you'll never have to"
// list, ending in the one thing they do instead (INSTEAD).
export const NEVER = [
	'Go back and forth with an AI agent in a chat window',
	'Drag and drop your own site together in a buggy builder',
	'See a line of code',
	'Figure out hosting, domains, or any other technical answer'
];

export const INSTEAD = 'Talk with an actual engineer, start to finish';

// "What it costs": a big figure with its explanation.
export const PRICING: { figure: string; body: string }[] = [
	{
		figure: `+${MARGIN_PERCENT}%`,
		body: 'on top of what your site costs us. That’s the whole bill.'
	},
	{
		figure: '$0',
		body: 'for our time and work. Design, build, and every round of changes.'
	},
	{
		figure: 'Free',
		body: 'when we can make it so, and simple sites for a cause are. Once a site grows complex enough, it can’t reasonably stay free, and we’ll talk that through with you.'
	}
];

// The "How we work" flow: one conversation in, a build/review/feedback loop that
// repeats until the client is happy, then launch.
export const FLOW = {
	start: {
		title: 'We talk',
		body: 'Tell a person on our team what you need, in your own words.'
	},
	loop: [
		{
			title: 'We build',
			body: 'Our agentic system turns the conversation into a working site.'
		},
		{
			title: 'You see it',
			body: 'A live preview at every step. Never a black box.'
		},
		{
			title: 'Your feedback',
			body: 'Just tell us what you think, however is easiest for you. That’s all we need; we take it from there.'
		}
	],
	loopLabel: 'Feedback becomes changes fast. Repeat until it’s right.',
	end: {
		title: 'It goes live',
		body: 'When you’re happy, we launch it and handle the technical side.'
	}
};

// After launch the same loop keeps running; shown under the flow (AfterLaunch).
export const AFTER_LAUNCH = {
	title: 'Live doesn’t mean done.',
	body: 'The same loop keeps running after launch. Tell us what you’d like changed and it’s live again the same day, often within the hour, without the back-and-forth. Your site changes whenever you want it to.',
	requests: ['Swap the front page photo', 'Try a warmer font', 'Rework the services section']
};

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
