// Writes figures.json beside this file: the current site against the rebuild, worked
// out by integrityrealestateservices-website's own comparison code from the runs
// committed in that repository, so the offer shows what its /site-comparison/ page
// (client ADR 0016) shows and nothing here is typed in by hand. Model:
// offers/orebabrmoseow8vsknfk/figures.mjs (Howard's Tinting) and PR #106 (Spirit Hill).
// Not part of the build: run it again when that repository commits a newer run, then
// `npx prettier --write offers/_z57aquk4ycyvdrz1jsul/figures.json`.
//
//   node offers/_z57aquk4ycyvdrz1jsul/figures.mjs <integrityrealestateservices-website> [commit]
//
// The argument is a checkout or an export of the client repository (for example
// `git archive origin/main | tar -x -C <dir>`); `commit` names what it holds when the
// folder is not a git checkout. Node 22.18 or later, which loads the repository's
// TypeScript modules directly.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [repo, commitArg] = process.argv.slice(2);
if (!repo) {
	console.error('usage: figures.mjs <integrityrealestateservices-website> [commit]');
	process.exit(1);
}

const PREVIEW = 'https://integrityrealestateservices-website.pages.dev/';
const COMPARISON = new URL('site-comparison/', PREVIEW).href; // '/site-comparison/' in its src/routes.ts

const load = (file) => import(pathToFileURL(join(repo, file)).href);
const commit = () =>
	commitArg ??
	execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();

const lib = await load('src/lib/site-comparison.ts');
const agentsLib = await load('src/lib/agent-readiness.ts');
const words = await load('src/content/site-comparison.ts');
const { about, didNotLoad, seconds, sizeWords, siteComparisonCopy: c } = words;
const g = c.glance;

// Every result.json under a docs/discovery folder (or one level deeper, `sub`), keyed
// as the page's import.meta.glob keys them, so newestRun strips the same prefix.
function runs(folder, sub = '') {
	const files = {};
	for (const dir of readdirSync(join(repo, folder))) {
		const path = join(folder, dir, sub, 'result.json');
		if (existsSync(join(repo, path)))
			files[`../../${path}`] = readFileSync(join(repo, path), 'utf8');
	}
	return files;
}
// The page's `runsWith`: runs holding every named target or side.
const runsWith = (files, key, names) =>
	Object.fromEntries(
		Object.entries(files).filter(([, text]) => {
			const held = JSON.parse(text)[key] ?? {};
			return names.every((n) => n in held);
		})
	);

// The runs src/pages/site-comparison.astro reads, picked the way it picks them.
const auditRun = lib.newestRun(
	runsWith(runs('docs/discovery/seo-audit'), 'targets', ['live', 'launch']),
	'audit run',
	lib.takenAt.audit
);
const factRuns = runs('docs/discovery/aeo');
const liveFactsRun = lib.newestRun(
	runsWith(factRuns, 'sides', ['live']),
	'fact recall run of the live site',
	lib.takenAt.factRecall
);
const launchFactsRun = lib.newestRun(
	runsWith(factRuns, 'sides', ['launch']),
	'fact recall run of the launch build',
	lib.takenAt.factRecall
);
const assistantsRun = lib.newestRun(
	runs('docs/discovery/aeo', 'assistants'),
	'assistant recall run',
	lib.takenAt.assistants
);

// From here to `missedText`, the page's own frontmatter, line for line where it makes a
// figure, so each value is the string the page prints. The card order is the page's:
// time to main content first, the owner's lead for this client.
const audit = lib.compareSites(JSON.parse(auditRun.text));
const { headline: h, method } = audit;
const agents = agentsLib.agentReadiness(
	JSON.parse(liveFactsRun.text),
	JSON.parse(launchFactsRun.text),
	JSON.parse(assistantsRun.text)
);
const goodLine = (lib.GOOD_LCP_MS / 1000).toFixed(1);
const afterPages = audit.pageCount.after.n;
const show = (v, fmt) => (v === null ? didNotLoad : fmt(v));

const pagesCheck = (id) => {
	const v = audit.checks.find((x) => x.id === id)?.after;
	return v && v.kind === 'pages' ? v : null;
};
const indexable = pagesCheck('indexable');

const lcpCount = (v) => (v === null ? didNotLoad : g.lcp.count(v.n, v.of));
const kb = h.kilobytes;
const sizeSentence =
	kb.before !== null && kb.after !== null
		? sizeWords(lib.aboutAFraction(kb.after, kb.before), kb.after, kb.before)
		: '';

const summaryCards = [
	{
		id: 'lcp',
		title: g.lcp.title,
		before: show(h.lcpSeconds.before, seconds),
		after: show(h.lcpSeconds.after, seconds),
		note: g.lcp.note(goodLine, lcpCount(h.lcpGood.before), lcpCount(h.lcpGood.after))
	},
	{
		id: 'performance',
		title: g.performance.title,
		before: show(h.performance.before, String),
		after: show(h.performance.after, String),
		note: g.performance.note
	},
	{
		id: 'kilobytes',
		title: g.kilobytes.title,
		before: show(kb.before, g.kilobytes.unit),
		after: show(kb.after, g.kilobytes.unit),
		note: g.kilobytes.note(sizeSentence)
	},
	{
		id: 'requests',
		title: g.requests.title,
		before: show(h.requests.before, String),
		after: show(h.requests.after, String),
		note: g.requests.note
	},
	{
		id: 'seo',
		title: g.seo.title,
		before: show(h.seo.before, String),
		after: show(h.seo.after, String),
		note: g.seo.note(
			h.seoPerfect.after.n,
			h.seoPerfect.after.of,
			indexable ? indexable.of - indexable.n : 0
		)
	},
	{
		id: 'accessibility',
		title: g.accessibility.title,
		before: show(h.accessibilityScore.before, String),
		after: show(h.accessibilityScore.after, String),
		note: g.accessibility.note
	},
	{
		id: 'axe',
		title: g.axe.title,
		before: show(h.axeDesktopPerPage.before, about),
		after: show(h.axeDesktopPerPage.after, about),
		note: g.axe.note(
			method.wcag,
			about(h.axePhonePerPage.before ?? 0),
			about(h.axePhonePerPage.after ?? 0)
		)
	}
];

const t = agents.totals;
const asOf = (r, fmt) =>
	r.found === null
		? r.why === 'did-not-load'
			? didNotLoad
			: r.why === 'absent'
				? c.agents.absent
				: c.agents.notRun
		: fmt(r.found);
const ofFacts = (expected) => (n) => `${Number.isInteger(n) ? n : n.toFixed(1)} of ${expected}`;
const ch = c.agents.cards;
const llmRuns = 'runs' in agents.llm.after ? agents.llm.after.runs : 0;
const agentCards = [
	{ id: 'model', title: ch.model.title, key: 'd', note: ch.model.note(llmRuns) },
	{ id: 'text', title: ch.text.title, key: 'b', note: ch.text.note },
	{ id: 'structured', title: ch.structured.title, key: 'a', note: ch.structured.note },
	{ id: 'summary', title: ch.summary.title, key: 'c', note: ch.summary.note }
].map((card) => ({
	id: card.id,
	title: card.title,
	before: asOf(t[card.key].before, ofFacts(t[card.key].before.expected)),
	after: asOf(t[card.key].after, ofFacts(t[card.key].after.expected)),
	note: card.note
}));

const search = agents.assistants.search;
const memory = agents.assistants.memory;
const todayText = search
	? c.agents.today({
			found: search.found,
			expected: search.expected,
			runs: search.runs,
			memoryFound: memory.reduce((n, m) => n + m.found, 0) / Math.max(memory.length, 1),
			memoryModels: memory.length
		})
	: null;

// The page's HELD_BACK: facts the new site holds back until the brokerage confirms them
// (client ADR 0013, decision 4).
const HELD_BACK = new Set([
	'phone.broker',
	'email',
	'legalName',
	'license.arkansas',
	'license.redfin'
]);
const missed = agents.missedInText.after;
const missedText = c.agents.missed(
	missed.length,
	agents.facts,
	missed.filter((id) => HELD_BACK.has(id)).length
);

const figures = {
	name: 'Integrity Real Estate Services',
	current: `https://${method.beforeHost}/`,
	preview: PREVIEW,
	comparison: COMPARISON,
	didNotLoad,
	sides: c.sides,
	measured: {
		before: method.beforeDate,
		after: method.afterDate,
		pagesBefore: audit.pageCount.before.n,
		pagesAfter: afterPages,
		phone: method.phoneDevice,
		lighthouse: method.lighthouseVersion,
		axe: method.axeVersion,
		runs: method.runs
	},
	source: {
		commit: commit(),
		audit: auditRun.path,
		liveFacts: liveFactsRun.path,
		launchFacts: launchFactsRun.path,
		assistants: assistantsRun.path
	},
	glance: { lead: g.lead(afterPages), cards: summaryCards },
	ai: { today: todayText, cards: agentCards, missed: missedText || null }
};

const out = join(dirname(fileURLToPath(import.meta.url)), 'figures.json');
writeFileSync(out, `${JSON.stringify(figures, null, '\t')}\n`);
console.log(`wrote ${out}`);
console.log(
	`  audit ${auditRun.path}\n  live facts ${liveFactsRun.path}\n  launch facts ${launchFactsRun.path}\n  assistants ${assistantsRun.path}`
);
