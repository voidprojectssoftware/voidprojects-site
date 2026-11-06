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
	price?: string; // what the client pays, shown on the card, e.g. "$50/m"
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
		price: '$0/m',
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
		price: '$50/m',
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
export const PRICING: {
	figure: string;
	spoken?: string; // the figure as prose, for PRICING_SUMMARY, when the display form is shorthand
	body: string;
	link?: { href: string; label: string };
	offer: { name: string; usd?: number; monthly?: boolean }; // the JSON-LD Offer; no usd means quoted
}[] = [
	{
		figure: 'Free',
		body: 'for causes, whenever we can manage it.',
		link: { href: '/websites/causes', label: 'Building for a cause?' },
		offer: { name: 'Website for a cause', usd: 0 }
	},
	{
		figure: '$25/m',
		spoken: '$25 a month',
		body: 'for a static site: business or personal pages that don’t change, with your domain at cost. Already paying for a site? We’ll match what you pay now and take over hosting and upkeep. No build fee. No contract. Cancel any time.',
		offer: { name: 'Static website', usd: 25, monthly: true }
	},
	{
		figure: 'Quote',
		body: 'for anything dynamic, like live data, accounts, or bookings, or anything that needs higher reliability or extra care. We price it from what hosting and maintaining it costs us.',
		link: { href: '/websites?preset=quote#contact', label: 'Ask for a quote' },
		offer: { name: 'Dynamic website' }
	}
];

// The $25/m row, quoted in the /websites head copy.
export const STATIC_SITE = PRICING.find((p) => p.offer.monthly)!;

// Contact form starters, picked by a link's ?preset= key so the URL stays short and
// shareable. The form only fills an empty message, and the visitor can edit or clear it.
export const CONTACT_PRESETS: Record<string, { kind: ContactKind; message: string }> = {
	quote: {
		kind: 'A business',
		message:
			'I’d like a quote for a site that needs (live data, accounts, bookings, higher reliability, something else): \n\nAbout my business: '
	}
};

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

// Upkeep and security, included in the price. Every figure and CVE below is cited;
// the yearly counts are CVEs published per calendar year by the NVD CVE API
// (pubStartDate/pubEndDate windows, noRejected), queried 2026-11-01.
export const MAINTENANCE = {
	title: 'Updates and security are included.',
	body: [
		'New security holes are found in software every day, and more each year. Our agents continuously watch security news, the National Vulnerability Database (NVD), and GitHub security advisories.',
		'When a fix comes out for something your site depends on, we update your site as soon as it is available. An engineer reviews every fix before it goes live. It is part of the price, not an extra.'
	],
	counts: {
		title: 'Reported security flaws (CVEs) per year',
		source: { label: 'NVD', href: 'https://nvd.nist.gov/developers/vulnerabilities' },
		note: '48,151 in 2025, more than seven times as many as in 2016.',
		years: [
			{ year: 2016, count: 6449 },
			{ year: 2017, count: 14642 },
			{ year: 2018, count: 16510 },
			{ year: 2019, count: 17305 },
			{ year: 2020, count: 18322 },
			{ year: 2021, count: 20149 },
			{ year: 2022, count: 25073 },
			{ year: 2023, count: 28816 },
			{ year: 2024, count: 39953 },
			{ year: 2025, count: 48151 }
		]
	},
	exposures: {
		title: 'What a self-managed WordPress site faced in 2026',
		intro: 'A few of the year’s real, published flaws. Each one needed an update to close.',
		items: [
			{
				when: 'April 2026',
				what: 'cPanel & WHM',
				body: 'A login bypass let attackers into this hosting control panel without a password. CISA lists it as exploited, with known ransomware use.',
				links: [
					{ label: 'CVE-2026-41940', href: 'https://nvd.nist.gov/vuln/detail/CVE-2026-41940' }
				]
			},
			{
				when: 'July 2026',
				what: 'WordPress itself',
				body: 'Two flaws chained together let an attacker with no login run code on default installs of WordPress 6.9 and newer. CISA lists both as exploited.',
				links: [
					{ label: 'CVE-2026-63030', href: 'https://nvd.nist.gov/vuln/detail/CVE-2026-63030' },
					{ label: 'CVE-2026-60137', href: 'https://nvd.nist.gov/vuln/detail/CVE-2026-60137' },
					{
						label: 'WordPress 7.0.2',
						href: 'https://wordpress.org/news/2026/07/wordpress-7-0-2-release/'
					}
				]
			},
			{
				when: 'September 2026',
				what: 'WordPress itself',
				body: 'A page-template flaw, open to anyone, could lead to running code on some common server and theme setups. The fix went back to every version since 4.7. CISA listed it as exploited three days after it was published.',
				links: [
					{ label: 'CVE-2026-87902', href: 'https://nvd.nist.gov/vuln/detail/CVE-2026-87902' },
					{
						label: 'WordPress advisory',
						href: 'https://github.com/WordPress/wordpress-develop/security/advisories/GHSA-7hp8-65ch-5whp'
					}
				]
			}
		],
		source: {
			label: 'CISA Known Exploited Vulnerabilities',
			href: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog'
		}
	}
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
		body: 'Our own feedback tools cut out the usual back-and-forth, so your idea turns into a finished site faster, with far less fuss.'
	}
];
