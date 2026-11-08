// Writes figures.json beside this file from the runs committed in
// spirithillmaplenursery-website, so no figure on the offer page is typed by hand.
// Model: offers/orebabrmoseow8vsknfk/figures.mjs (Howard's Tinting). Not part of the
// build: run it again when that repository commits a newer run, then
// `npx prettier --write offers/_452dsozecen58yfp0onx/figures.json`.
//
//   node offers/_452dsozecen58yfp0onx/figures.mjs <spirithillmaplenursery-website>
//
// PART 1 (spirithillmaplenursery-website#9): the current site's side only. The client
// repo has a live baseline (docs/discovery/seo-audit/2026-11-08-baseline/,
// docs/discovery/aeo/2026-11-08-baseline/) but no launch-build run and no
// src/lib/site-comparison.ts yet; both arrive with its #6 part 2. Until then this file
// summarizes the live side with the same definitions the sibling's comparison code uses
// (howards-tinting-website src/lib/site-comparison.ts, `summarizeSide`: the mean over
// pages of each page's Lighthouse mobile median, axe nodes summed), and every `after`
// is null.
//
// PART 2 must: once the client repo commits a run with both `live` and `launch`
// targets and its own src/lib/site-comparison.ts, replace `liveSide` below with that
// repo's `compareSites` and its words (as Howard's figures.mjs does), so the offer
// shows exactly what the client's /site-comparison/ page shows, and fill every `after`.
//
// Never read: `targets.live.site.sitemap` (`notOk`, `auditedPagesMissing`). Its 14
// "404" URLs are the audit tool's &apos; decoding error, not the site's
// (docs/discovery/seo-audit/2026-11-08-baseline/README.md), so nothing here cites it.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [repo] = process.argv.slice(2);
if (!repo) {
	console.error('usage: figures.mjs <spirithillmaplenursery-website>');
	process.exit(1);
}

const PREVIEW = 'https://spirithillmaplenursery-website.pages.dev/';
// The client repo's #6 part 2 adds '/site-comparison/' as an unlisted route; until it
// lands this address does not answer.
const COMPARISON = new URL('site-comparison/', PREVIEW).href;
const GOOD_LCP_MS = 2500; // web.dev's line for a good Largest Contentful Paint

const commit = () =>
	execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();

// Every result.json under a docs/discovery folder (or one level deeper, `sub`).
function runs(folder, sub = '') {
	const found = [];
	for (const dir of readdirSync(join(repo, folder))) {
		const path = join(folder, dir, sub, 'result.json');
		if (existsSync(join(repo, path)))
			found.push({ path, json: JSON.parse(readFileSync(join(repo, path), 'utf8')) });
	}
	return found;
}

// The newest run by when it says it was taken, as the sibling's `newestRun` picks; a
// run without a time, or a tie, stops the script.
function newest(list, what, when) {
	const dated = list.map((r) => ({ ...r, time: Date.parse(when(r.json) ?? '') }));
	const bad = dated.find((r) => Number.isNaN(r.time));
	if (bad) throw new Error(`${bad.path} does not say when its ${what} was taken`);
	dated.sort((a, b) => a.time - b.time);
	const [last, before] = [dated.at(-1), dated.at(-2)];
	if (!last) throw new Error(`no ${what} is committed`);
	if (before && before.time === last.time)
		throw new Error(`${before.path} and ${last.path} tie as the newest ${what}`);
	return last;
}
const latest = (xs) => xs.filter(Boolean).sort().at(-1);

const auditRun = newest(
	runs('docs/discovery/seo-audit').filter((r) => r.json.targets?.live),
	'audit run',
	(j) => j.meta?.startedAt
);
const aeoRun = newest(
	runs('docs/discovery/aeo').filter((r) => r.json.sides?.live),
	'fact recall run',
	(j) => j.sides.live.readAt
);
const assistantsRun = newest(
	runs('docs/discovery/aeo', 'assistants'),
	'assistant recall run',
	(j) => latest(Object.values(j.assistants ?? {}).flatMap((a) => a.askedAt ?? []))
);

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const localDate = (iso) =>
	new Intl.DateTimeFormat('en-US', {
		timeZone: 'America/Chicago',
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	}).format(new Date(iso));

function liveSide(result) {
	const target = result.targets.live;
	const slugs = result.meta.pages.filter((p) => p.live !== null).map((p) => p.slug);
	const loaded = slugs
		.filter((s) => target.pages[s]?.http.status === 200)
		.map((s) => target.pages[s]);
	const measured = loaded.filter((p) => (p.lighthouse?.mobile.runs ?? 0) > 0);
	const lh = (read) =>
		measured.map((p) => read(p.lighthouse.mobile)).filter((v) => v !== null && v !== undefined);
	const lcp = lh((r) => r.metrics.lcpMs);
	const ruleOn = (p, id) =>
		[...(p.axe?.desktop.wcag ?? []), ...(p.axe?.phone.wcag ?? [])].some((r) => r.id === id);
	return {
		pages: { loaded: loaded.length, measured: measured.length, tried: slugs.length },
		performance: Math.round(mean(lh((r) => r.scores.performance))),
		lcpSeconds: mean(lcp) / 1000,
		lcpGood: { n: lcp.filter((ms) => ms <= GOOD_LCP_MS).length, of: measured.length },
		kilobytes: Math.round(mean(lh((r) => r.metrics.totalBytes)) / 1024),
		requests: Math.round(mean(lh((r) => r.metrics.requests))),
		seo: Math.round(mean(lh((r) => r.scores.seo))),
		seoPerfect: { n: lh((r) => r.scores.seo).filter((s) => s === 100).length, of: measured.length },
		accessibilityScore: Math.round(mean(lh((r) => r.scores.accessibility))),
		axeDesktopNodes: sum(loaded.map((p) => p.axe?.desktop.wcagNodes ?? 0)),
		axePhoneNodes: sum(loaded.map((p) => p.axe?.phone.wcagNodes ?? 0)),
		contrastPages: {
			n: loaded.filter((p) => ruleOn(p, 'color-contrast')).length,
			of: loaded.length
		},
		noDescription: { n: loaded.filter((p) => !p.technical?.description).length, of: loaded.length },
		lighthouseVersion: result.meta.lighthouseVersion,
		axeVersion: result.meta.axeVersion,
		runs: result.meta.settings.runs,
		phone: result.meta.settings.phoneDevice,
		date: localDate(target.startedAt),
		host: new URL(target.origin).host
	};
}

const live = liveSide(auditRun.json);
const s = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const of = ({ n, of: total }) => `${n} of ${total}`;
const seconds = (v) => `${v.toFixed(1)} s`;

const LIGHTHOUSE_GOOD = 'Google Lighthouse marks 90 or more as good.';
const glance = [
	{
		id: 'performance',
		title: 'Speed score on a phone',
		before: String(live.performance),
		after: null,
		note: `Google Lighthouse, out of 100, averaged over ${s(live.pages.measured, 'page', 'pages')}. ${LIGHTHOUSE_GOOD}`
	},
	{
		id: 'lcp',
		title: 'Time until the main content shows',
		before: seconds(live.lcpSeconds),
		after: null,
		note: `On a phone. ${of(live.lcpGood)} pages showed it within Google’s good mark of ${seconds(GOOD_LCP_MS / 1000)}.`
	},
	{
		id: 'kilobytes',
		title: 'Data downloaded per page',
		before: `${live.kilobytes.toLocaleString('en-US')} KB`,
		after: null,
		note: 'What a phone downloads to show one page, on average.'
	},
	{
		id: 'requests',
		title: 'Files requested per page',
		before: String(live.requests),
		after: null,
		note: 'Each one is a separate trip to a server before the page is complete.'
	},
	{
		id: 'seo',
		title: 'Search score',
		before: String(live.seo),
		after: null,
		note: `Google Lighthouse’s search check, out of 100. ${of(live.seoPerfect)} pages scored 100; ${of(live.noDescription)} pages have no description for search results.`
	},
	{
		id: 'axe',
		title: 'Accessibility problems found',
		before: String(live.axeDesktopNodes),
		after: null,
		note: `Places on the page that fail WCAG 2.2 A and AA in an automated test (axe) on a laptop screen, across ${s(live.pages.loaded, 'page', 'pages')}; ${live.axePhoneNodes} more on a phone. Text too faint to read was found on ${of(live.contrastPages)} pages.`
	}
];
const wcagTags = auditRun.json.meta.settings.wcagTags;
if (!(wcagTags.includes('wcag22a') && wcagTags.includes('wcag22aa'))) {
	throw new Error('the audit did not test WCAG 2.2 A and AA; reword the axe card');
}

const t = aeoRun.json.sides.live.totals;
const pct = (n) => `${Math.round((100 * n) / t.expected)}%`;
const facts = (n) => `${Number.isInteger(n) ? n : n.toFixed(1)} of ${t.expected}`;
const aiCards = [
	{
		id: 'structured',
		title: 'Facts in structured data',
		before: facts(t.a),
		after: null,
		note: 'The labelled data search engines and AI tools read first: address, phone, hours and the like.'
	},
	{
		id: 'text',
		title: 'Facts in the page text',
		before: facts(t.b),
		after: null,
		note: `What a program reading the page without running its scripts finds (${pct(t.b)}).`
	},
	{
		id: 'summary',
		title: 'Facts in the summary for AI tools',
		before: facts(t.c),
		after: null,
		note: 'The llms.txt file and plain-text copies of each page, written for AI assistants.'
	},
	{
		id: 'model',
		title: 'Facts an AI model gives after reading the page',
		before: facts(t.d.recalled),
		after: null,
		note: `${aeoRun.json.sides.live.llm?.runs ?? 0} runs of an AI model answering questions from each page.`
	}
];

const a = assistantsRun.json.assistants;
const search = Object.values(a).find((x) => x.tools === 'WebSearch');
const memory = Object.values(a).filter((x) => !x.tools);
const round1 = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const today = search
	? `Asked about the nursery by name, an AI assistant that searches the web gave ${round1(search.recalled)} of ${search.facts} facts on average over ${search.runs} tries. ` +
		`${s(memory.length, 'assistant', 'assistants')} answering from memory alone gave at most ${round1(Math.max(...memory.map((m) => m.recalled)))} of ${search.facts}.`
	: null;

const figures = {
	name: 'Spirit Hill Maple Nursery',
	current: `https://${live.host}/`,
	preview: PREVIEW,
	comparison: COMPARISON,
	previewMeasured: false, // part 2 sets true and fills every `after`
	sides: { before: 'Your site today', after: 'Your new site' },
	measured: {
		before: live.date,
		after: null,
		pages: live.pages.measured,
		phone: live.phone,
		lighthouse: live.lighthouseVersion,
		axe: live.axeVersion,
		runs: live.runs
	},
	source: {
		commit: commit(),
		audit: auditRun.path,
		aeo: aeoRun.path,
		assistants: assistantsRun.path
	},
	glance: { cards: glance },
	ai: { expected: t.expected, today, cards: aiCards }
};

const out = join(dirname(fileURLToPath(import.meta.url)), 'figures.json');
writeFileSync(out, `${JSON.stringify(figures, null, '\t')}\n`);
console.log(`wrote ${out}`);
console.log(`  audit ${auditRun.path}\n  aeo ${aeoRun.path}\n  assistants ${assistantsRun.path}`);
