// Writes figures.json beside this file: the before and after figures the offer page
// shows, worked out by pottery-haven-website's own comparison code from the runs
// committed in that repository, so they match its /site-comparison/ page and nothing
// on the offer page is typed in by hand. The First Touch offer's figures.mjs is the
// model. Not part of the build: run it again whenever that repository commits a newer
// run, then `npx prettier --write`.
//
//   node offers/_k3c72d0v0xsa35bfzkr0/figures.mjs <pottery-haven-website>
//
// Node 22.18 or later, which loads the repository's TypeScript modules directly.
//
// No run is named here. Like /site-comparison/ (src/pages/site-comparison.astro), it
// takes the audit run that says it was taken last, and for fact recall the newest run
// that carries each side, through that repository's own newestRun() and takenAt, so a
// newly committed run (for example a later "-after-<n>" run) is picked up with no edit.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [repo] = process.argv.slice(2);
if (!repo) {
	console.error('usage: figures.mjs <pottery-haven-website>');
	process.exit(1);
}

const load = (file) => import(pathToFileURL(join(repo, file)).href);
const commit = () =>
	execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
const seconds = (s) => `${s.toFixed(1)} s`;
const kb = (n) => `${n.toLocaleString('en-US')} KB`;

const lib = await load('src/lib/site-comparison.ts');
const agentsLib = await load('src/lib/agent-readiness.ts');

// Every <dir>/result.json under a docs/discovery folder, keyed as import.meta.glob keys
// them from src/pages/, so newestRun() strips the same prefix.
function runs(folder) {
	const files = {};
	for (const dir of readdirSync(join(repo, folder))) {
		const path = join(folder, dir, 'result.json');
		if (existsSync(join(repo, path)))
			files[`../../${path}`] = readFileSync(join(repo, path), 'utf8');
	}
	return files;
}

const auditRun = lib.newestRun(runs('docs/discovery/seo-audit'), 'audit run', lib.takenAt.audit);
const audit = lib.compareSites(JSON.parse(auditRun.text));

// Each fact recall side from the newest run that carries it, as the page does
// (runWithSide in src/pages/site-comparison.astro).
const aeoFiles = runs('docs/discovery/aeo');
const runWithSide = (side) =>
	lib.newestRun(
		Object.fromEntries(
			Object.entries(aeoFiles).filter(([, text]) => JSON.parse(text).sides?.[side])
		),
		`fact recall ${side} side`,
		lib.takenAt.factRecallSide(side)
	);
const aeoLive = runWithSide('live');
const aeoLaunch = runWithSide('launch');
const agents = agentsLib.factRecall(JSON.parse(aeoLive.text), JSON.parse(aeoLaunch.text));

function check(name) {
	const row = audit.checks.find((c) => c.check === name);
	if (!row) throw new Error(`no "${name}" row in the site comparison`);
	return row;
}

// A row: plain label, why it matters to the business, the technical source in small
// print, the two values as shown, and the numbers the bars are drawn from.
// `why` may be [plain, impact]: the impact half is shown as a highlighted callout.
const row = (label, why, fine, before, after, bar, target) => ({
	label,
	...(Array.isArray(why) ? { why: why[0], impact: why[1] } : { why }),
	fine,
	before,
	after,
	bar,
	...(target ? { target } : {})
});

// Reference lines drawn across the bars. Only published benchmarks, as in the First
// Touch offer (checked there 2026-11-04):
// - LCP: "sites should strive to have Largest Contentful Paint of 2.5 seconds or less"
//   (https://web.dev/articles/lcp); GOOD_LCP_MS in src/lib/site-comparison.ts is 2,500.
// - Lighthouse scores: "90 to 100 (green): Good"
//   (https://developer.chrome.com/docs/lighthouse/performance/performance-scoring).
// - Page shares (zoom, descriptions, business details): no published benchmark, so the
//   line is the natural goal, every page.
// - Page weight and AI fact shares: no recognised published benchmark, so no line.
const LCP_GOOD = {
	value: lib.GOOD_LCP_MS / 1000,
	label: 'Good',
	good: 'lower',
	text: `Good is ${(lib.GOOD_LCP_MS / 1000).toFixed(1)} seconds or less`,
	source: 'Google’s Core Web Vitals mark for a good page load (web.dev).'
};
const LIGHTHOUSE_GOOD = {
	value: 90,
	label: 'Good',
	good: 'higher',
	text: 'Good is 90 or more',
	source: 'The green “good” band of Google Lighthouse’s score (Chrome developer docs).'
};
const EVERY_PAGE = {
	value: 100,
	label: 'Goal',
	good: 'higher',
	text: 'The goal is every page',
	source: 'No published benchmark; every page is the natural goal.'
};

const h = audit.headline;
const n = audit.count; // each side's own distinct pages: two current pages can share one new page
const pagesFine = `${n.before} current ${n.before === 1 ? 'page' : 'pages'} against the ${n.after} new ${n.after === 1 ? 'page' : 'pages'} that replace ${n.before === 1 ? 'it' : 'them'}`;

// A check counted over pages, drawn as the share of each side's pages that pass it,
// since the two sides do not have the same number of pages.
const shareRow = (label, why, name, what) => {
	const c = check(name);
	return row(
		label,
		why,
		`${what ?? c.what ?? name} Measured on ${pagesFine}.`,
		c.before,
		c.after,
		{ before: 100 * c.share.before, after: 100 * c.share.after, max: 100 },
		EVERY_PAGE
	);
};

const rows = [
	row(
		'Wait before the page shows on a phone',
		[
			`Visitors see your page in ${seconds(h.lcpSeconds.after)} instead of ${seconds(h.lcpSeconds.before)}.`,
			'People leave a slow page before they reach your shop or your party booking.'
		],
		`Largest Contentful Paint, mean of ${pagesFine}; ${h.lcpGood.before} of ${n.before} within 2.5 s today, ${h.lcpGood.after} of ${n.after} rebuilt.`,
		seconds(h.lcpSeconds.before),
		seconds(h.lcpSeconds.after),
		{
			before: h.lcpSeconds.before,
			after: h.lcpSeconds.after,
			max: Math.ceil(Math.max(h.lcpSeconds.before, h.lcpSeconds.after)),
			lowerIsBetter: true
		},
		LCP_GOOD
	),
	row(
		'Speed on a phone, out of 100',
		[
			'Most people look up a studio on their phone first.',
			'This is their first impression of you.'
		],
		`Google Lighthouse performance score, mean of ${pagesFine}.`,
		String(h.performance.before),
		String(h.performance.after),
		{ before: h.performance.before, after: h.performance.after, max: 100 },
		LIGHTHOUSE_GOOD
	),
	row(
		'Data a phone downloads per page',
		'Less to download means the page opens faster on a weak signal and costs visitors less data.',
		`Total transfer size, mean of ${pagesFine}; ${h.requests.before} files a page today, ${h.requests.after} rebuilt.`,
		kb(h.kilobytes.before),
		kb(h.kilobytes.after),
		{
			before: h.kilobytes.before,
			after: h.kilobytes.after,
			max: Math.max(h.kilobytes.before, h.kilobytes.after),
			lowerIsBetter: true
		}
	),
	row(
		'Usable by every visitor, out of 100',
		h.axeDesktopNodes.after === 0
			? `An accessibility scanner found ${h.axeDesktopNodes.before} problems on these pages today, and none on the new ones.`
			: `An accessibility scanner found ${h.axeDesktopNodes.before} problems on these pages today, ${h.axeDesktopNodes.after} on the new ones.`,
		`Google Lighthouse accessibility score on phones, mean of ${pagesFine}; axe-core ${audit.method.wcag} failures on desktop.`,
		String(h.accessibilityScore.before),
		String(h.accessibilityScore.after),
		{ before: h.accessibilityScore.before, after: h.accessibilityScore.after, max: 100 },
		LIGHTHOUSE_GOOD
	),
	shareRow(
		'Pages a visitor can zoom in on',
		'Some visitors need to pinch to enlarge the text before they can read it.',
		'Visitors can zoom in'
	),
	shareRow(
		'Pages with a summary for Google results',
		'The short description Google may show under your name.',
		'A description for search results'
	),
	shareRow(
		'Pages with details Google can read directly',
		// Not "your business details": the check counts any structured data block, and the
		// current pages it finds are product pages with Square's Product block, not the
		// studio's name, address or hours (seo-accessibility-baseline.md finding 11).
		'Facts about you and what you sell, in the structured form Google reads for its results.',
		'Business details for search engines',
		'Structured data (JSON-LD) of any kind on the page.'
	)
];

// Lighthouse's SEO score is left out while the new pages ask search engines not to list
// them: every page of the site is unlisted until the owner launches it (pottery-haven-
// website ADR 0004), and Lighthouse marks that down, so the score would compare a
// listed site with one that is hidden on purpose. It returns by itself once a run
// measures listed pages.
const listedAfter = n.after - audit.counts.noindex.after;
if (listedAfter === n.after) {
	rows.splice(
		4,
		0,
		row(
			'Ready for Google, out of 100',
			'Nothing basic is missing when Google decides how to list you.',
			`Google Lighthouse SEO score on phones, mean of ${pagesFine}.`,
			String(h.seo.before),
			String(h.seo.after),
			{ before: h.seo.before, after: h.seo.after, max: 100 },
			LIGHTHOUSE_GOOD
		)
	);
}

// What AI assistants can read: fact recall channels that ran on either side.
const share = (channel, side) => agentsLib.percent(agents.totals[channel][side], 'none');
const found = (channel, side) => {
	const r = agents.totals[channel][side];
	return r.found === null ? 0 : (100 * r.found) / r.expected;
};
const ran = (channel) =>
	agents.totals[channel].before.found !== null || agents.totals[channel].after.found !== null;
const aiRow = (channel, label, why, fine) =>
	row(
		label,
		why,
		`${fine} Share of ${agents.totals[channel].before.expected} checks of ${agents.facts} facts about the studio, on the same pages.`,
		share(channel, 'before'),
		share(channel, 'after'),
		{ before: found(channel, 'before'), after: found(channel, 'after'), max: 100 }
	);
const aiRows = [
	ran('b') &&
		aiRow(
			'b',
			'Your facts readable without running scripts',
			[
				'Your current pages draw every word with a script, and many AI tools and crawlers do not run scripts.',
				'They now see what a visitor sees: your hours, address and party packages.'
			],
			'Page text with JavaScript off.'
		),
	ran('a') &&
		aiRow(
			'a',
			'Your facts AI assistants can read directly',
			'AI assistants answer questions about studios like yours, and can quote your details instead of guessing them.',
			'Structured data (JSON-LD).'
		),
	ran('c') &&
		aiRow(
			'c',
			'Your facts in the summary written for AI tools',
			'AI tools get a clean list of what you offer and how to reach you.',
			'llms.txt and markdown versions of each page.'
		)
].filter(Boolean);

// Shop pages the new site builds from the preview catalog's filler until Square is
// connected (pottery-haven-website #36): compareSites() marks each such pair with the
// audit config's `filler` sentence, and its /site-comparison/ labels them and says none
// of the products are the studio's (src/content/site-comparison.ts `filler`). The offer
// shows no page or product names, only averages, so it keeps the pairs, as that page
// does, and says the same in its own words wherever the figures are shown.
const fillerPages = new Set(audit.pairs.filter((p) => p.filler).map((p) => p.rebuildPath)).size;
const filler = fillerPages
	? {
			pages: fillerPages,
			note: `${fillerPages} of the ${n.after} new pages measured are shop pages. Until the shop is connected to your Square catalog they show made-up sample products with Latin names and prices nobody charges, none of them yours, so for those pages the figures compare the page itself, not the products on it.`
		}
	: null;

const figures = {
	name: 'Pottery Haven',
	current: `https://${audit.method.beforeHost}/`,
	measured: audit.method.beforeDate,
	pages: n,
	notRebuilt: audit.notRebuilt.length, // current pages the new site has no page for in this run
	filler,
	source: {
		commit: commit(),
		run: auditRun.path,
		aeo: { live: dirname(aeoLive.path), launch: dirname(aeoLaunch.path) }
	},
	rows,
	ai: aiRows.length ? { facts: agents.facts, rows: aiRows } : null
};

const out = join(dirname(fileURLToPath(import.meta.url)), 'figures.json');
writeFileSync(out, `${JSON.stringify(figures, null, '\t')}\n`);
console.log(`wrote ${out}`);
console.log(
	`audit run ${auditRun.path}; fact recall live ${aeoLive.path}, launch ${aeoLaunch.path}`
);
