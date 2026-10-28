// Content for the /websites landing page, the target of the "Made by Void
// Projects" footer link on every site we build.

export const CONTACT_EMAIL = 'hello@voidprojects.ai';

// "The site is for" choices on the contact form; /api/contact accepts only these.
export const CONTACT_KINDS = [
	'A business',
	'A cause',
	'Something personal',
	'Not sure yet'
] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

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

// What the client is spared, drawn as floating struck-out scenes (NeverGrid) and
// answered by the one thing they do instead (INSTEAD, with ENGINEER).
export const NEVER: { scene: 'chat' | 'builder' | 'code' | 'hosting'; text: string }[] = [
	{ scene: 'chat', text: 'Go back and forth with an AI agent in a chat window' },
	{ scene: 'builder', text: 'Drag and drop your own site together in a buggy builder' },
	{ scene: 'code', text: 'See a line of code' },
	{ scene: 'hosting', text: 'Figure out hosting, domains, or any other technical answer' }
];

export const INSTEAD = 'Talk with an actual engineer, start to finish.';

// The engineer shown as the answer to NEVER; mirrors Blake's card on the homepage team section.
export const ENGINEER = {
	name: 'Blake Hastings',
	role: 'Co-Founder',
	subrole: 'Protostar Technical Lead',
	skills: ['C#', 'TypeScript', 'AI/Agentic Systems', 'Refactoring', 'Modular Design'],
	email: 'blakehastings@voidprojects.ai',
	linkedin: 'https://www.linkedin.com/in/the-blake-hastings/',
	bio: [
		'I love to engage with emerging technologies, push myself with challenging projects, and continually chase the cool stuff. Experimenting with AI agents, automating my life away, breaking websites. I do it all passionately!',
		'You might find me traveling to new cities, hiking, camping, and playing far too many video games.'
	]
};

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
		body: 'when we can make it so. Once a site grows complex enough, it can’t reasonably stay free, and we’ll talk that through with you.'
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
			body: 'Your engineer guides the output of our agents to build exactly what you described.'
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

// Sites for causes (memorials, medical support, fundraisers): teased on /websites,
// told in full on /websites/causes.
export const CAUSES = {
	href: '/websites/causes',
	title: 'Building something for a cause?',
	body: 'A memorial, a cancer support site, a fundraiser, a community group. If your site exists to help people, we’ll do our best to build it for free.',
	kinds: [
		{
			title: 'Memorials',
			body: 'A place to remember someone, share their story, and gather photos and messages from the people who loved them.'
		},
		{
			title: 'Medical and cancer support',
			body: 'Keep family and friends updated through treatment, and give them real ways to help.'
		},
		{
			title: 'Fundraisers',
			body: 'Explain the need, share progress, and point every visitor to where they can give.'
		},
		{
			title: 'Community groups',
			body: 'Neighborhood efforts, clubs, and volunteer groups that need a home online.'
		},
		{
			title: 'Animal rescue',
			body: 'Show the animals who need homes and make it easy to adopt, foster, or donate.'
		},
		{
			title: 'Awareness campaigns',
			body: 'Get the word out about a cause, an event, or something your community needs to know.'
		}
	],
	promise: [
		'We’ll do our best to build it for free: design, build, and every round of changes.',
		'You get the same engineers and the same process as every other site we build.',
		'If your site needs something that genuinely costs money, we’ll tell you up front and talk it through. Never a surprise.'
	]
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
