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
	skills: ['Agentic Development', 'C#', '.NET', 'Web Dev', 'Agile', 'Enterprise Systems'],
	email: 'blakehastings@voidprojects.ai',
	linkedin: 'https://www.linkedin.com/in/the-blake-hastings/',
	bio: [
		'I love to engage with emerging technologies, push myself with challenging projects, and continually chase the cool stuff. Experimenting with AI agents, automating my life away, breaking websites. I do it all passionately!',
		'You might find me traveling to new cities, hiking, and camping, always with a computer by my side.'
	]
};

// "What it costs": a big figure with its explanation.
export const PRICING: { figure: string; body: string; link?: { href: string; label: string } }[] = [
	{
		figure: 'Free',
		body: 'for causes, whenever we can manage it. If a cause site grows to cost us real money, we’ll talk it through with you first.',
		link: { href: '/websites/causes', label: 'Building for a cause?' }
	},
	{
		figure: '$25',
		body: 'a month for static sites: business or personal pages that don’t change and have no live data. That covers hosting, upkeep, security updates, and our time to design and build it.'
	},
	{
		figure: 'Match',
		body: 'a site builder’s price. Our promise: if you could build it yourself on Squarespace Basic or Wix Light, we’ll build and host it for you at their monthly price.'
	},
	{
		figure: '$25+',
		body: 'for dynamic sites with live data, accounts, or bookings, priced from what hosting and maintaining them actually costs us.'
	},
	{
		figure: 'Quote',
		body: 'for sites that need higher reliability or extra care. Tell us what you need and we’ll give you a price.'
	},
	{
		figure: '+$0',
		body: 'on your domain. You pay exactly what it costs us to register it, or to transfer the one you already have.'
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
	requests: [
		{ via: 'text', text: 'Swap the front page photo' },
		{ via: 'email', text: 'Try a warmer font' },
		{ via: 'call', text: 'Rework the services section' }
	] as { via: 'text' | 'email' | 'call'; text: string }[]
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
			hook: 'Keep their story alive.',
			body: 'A place to remember someone, share their story, and gather photos and messages from the people who loved them.'
		},
		{
			title: 'Medical and cancer support',
			hook: 'One place for every update.',
			body: 'Keep family and friends updated through treatment, and give them real ways to help.'
		},
		{
			title: 'Fundraisers',
			hook: 'Turn visitors into givers.',
			body: 'Explain the need, share progress, and point every visitor to where they can give.'
		},
		{
			title: 'Community groups',
			hook: 'A home for your people.',
			body: 'Neighborhood efforts, clubs, and volunteer groups that need a home online.'
		},
		{
			title: 'Animal rescue',
			hook: 'Help them find a home.',
			body: 'Show the animals who need homes and make it easy to adopt, foster, or donate.'
		},
		{
			title: 'Awareness campaigns',
			hook: 'Get the word out.',
			body: 'Get the word out about a cause, an event, or something your community needs to know.'
		}
	],
	promise: [
		'We’ll do our best to build it for free: design, build, and every round of changes.',
		'You get the same engineers and the same process as every other site we build.',
		'If your site needs something that goes above what we can cover in cost, we will tell you up front and talk it through. Never a surprise.'
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
