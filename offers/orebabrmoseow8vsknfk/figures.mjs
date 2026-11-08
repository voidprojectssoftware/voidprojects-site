// Writes figures.json beside this file: the current site against the rebuild, worked
// out by howards-tinting-website's own comparison code from the runs committed in that
// repository, so the offer shows what its /site-comparison/ page shows and nothing here
// is typed in by hand. Model: offers/9p2by3s8x3x1l4jd60ci/figures.mjs. Not part of the
// build: run it again when that repository commits a newer run, then
// `npx prettier --write offers/orebabrmoseow8vsknfk/figures.json`.
//
//   node offers/orebabrmoseow8vsknfk/figures.mjs <howards-tinting-website>
//
// Node 22.18 or later, which loads the repository's TypeScript modules directly.
//
// The old site, howardstinting.com, does not load (that repo's ADR 0010). Where it has
// no figure, compareSites and agentReadiness return null and the comparison page shows
// its `didNotLoad` words; so does this file, never a zero and never a score of the error
// page that answered instead.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [repo] = process.argv.slice(2);
if (!repo) {
	console.error('usage: figures.mjs <howards-tinting-website>');
	process.exit(1);
}

const PREVIEW = 'https://howards-tinting-website.pages.dev/';
const COMPARISON = new URL('site-comparison/', PREVIEW).href; // '/site-comparison/' in its src/routes.ts

const load = (file) => import(pathToFileURL(join(repo, file)).href);
const commit = () =>
	execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();

const lib = await load('src/lib/site-comparison.ts');
const agentsLib = await load('src/lib/agent-readiness.ts');
const words = await load('src/content/site-comparison.ts');
const { didNotLoad, seconds, listed, siteComparisonCopy: c } = words;
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
const keep = (files, test) =>
	Object.fromEntries(Object.entries(files).filter(([, text]) => test(JSON.parse(text))));

// The runs src/pages/site-comparison.astro reads, picked the way it picks them: the
// newest audit with both "live" and "launch" targets, the newest fact recall run with
// both sides, and the newest assistant recall run.
const auditRun = lib.newestRun(
	keep(
		runs('docs/discovery/seo-audit'),
		(r) => 'live' in (r.targets ?? {}) && 'launch' in (r.targets ?? {})
	),
	'audit run',
	lib.takenAt.audit
);
const aeoRun = lib.newestRun(
	keep(runs('docs/discovery/aeo'), (r) => 'live' in (r.sides ?? {}) && 'launch' in (r.sides ?? {})),
	'fact recall run',
	lib.takenAt.factRecall
);
const assistantsRun = lib.newestRun(
	runs('docs/discovery/aeo', 'assistants'),
	'assistant recall run',
	lib.takenAt.assistants
);

// From here to `agentCards`, the page's own frontmatter, line for line where it makes a
// figure, so each value is the string the page prints.
const audit = lib.compareSites(JSON.parse(auditRun.text));
const { headline: h, method } = audit;
const oldHost = method.beforeHost.replace(/^www\./, '');
const agents = agentsLib.agentReadiness(
	JSON.parse(aeoRun.text),
	JSON.parse(assistantsRun.text),
	oldHost
);
const goodLine = (lib.GOOD_LCP_MS / 1000).toFixed(1);
const afterPages = audit.pageCount.after.n;
const show = (v, fmt) => (v === null ? didNotLoad : fmt(v));

const byStatus = new Map();
for (const a of audit.failed.addresses) {
	if (a.status === 200) continue;
	const seen = byStatus.get(a.status) ?? { n: 0, cf: false };
	byStatus.set(a.status, { n: seen.n + 1, cf: seen.cf || a.cloudflare1001 });
}
const statusWords = [...byStatus].map(([status, { n, cf }]) =>
	status === 0 ? g.statuses.none(n) : g.statuses.error(n, status, cf)
);
const failedNote =
	h.performance.before === null
		? g.failedNote(
				listed(statusWords),
				g.lighthouse(audit.failed.lighthouseAttempts, audit.failed.lighthouseErrors.join(', '))
			)
		: null;

const pagesCheck = (id) => {
	const v = audit.checks.find((x) => x.id === id)?.after;
	return v && v.kind === 'pages' ? v : null;
};
const indexable = pagesCheck('indexable');

// Reference lines, as First Touch's figures.mjs draws them (published benchmarks only):
// web.dev's 2.5 s for a good LCP, the same GOOD_LCP_MS the comparison page uses, and
// Lighthouse's green band from 90.
const LCP_GOOD = {
	value: lib.GOOD_LCP_MS / 1000,
	label: 'Good',
	good: 'lower',
	text: `Good is ${goodLine} seconds or less`,
	source: 'Google’s Core Web Vitals mark for a good page load (web.dev).'
};
const LIGHTHOUSE_GOOD = {
	value: 90,
	label: 'Good',
	good: 'higher',
	text: 'Good is 90 or more',
	source: 'The green “good” band of Google Lighthouse’s score (Chrome developer docs).'
};
// A bar for each side that has a number; a side with none (null) draws no bar.
const bar = (pair, max, target) => ({
	bar: { before: pair.before, after: pair.after, max },
	target
});

const summaryCards = [
	{
		title: g.opens.title,
		before: g.opens.before(audit.opens.before.n, audit.opens.before.of),
		after: g.opens.after(audit.opens.after.n, audit.opens.after.of),
		note: g.opens.note(audit.opens.before.of, audit.opens.after.of)
	},
	{
		title: g.performance.title,
		before: show(h.performance.before, String),
		after: show(h.performance.after, String),
		note: g.performance.note(afterPages),
		...bar(h.performance, 100, LIGHTHOUSE_GOOD)
	},
	{
		title: g.lcp.title,
		before: show(h.lcpSeconds.before, seconds),
		after: show(h.lcpSeconds.after, seconds),
		note: g.lcp.note(goodLine, h.lcpGood.after.n, h.lcpGood.after.of),
		// The page's speed chart scale: wide enough to show Google's line.
		...bar(
			h.lcpSeconds,
			Math.max(
				Number(goodLine) * 1.25,
				...[h.lcpSeconds.before, h.lcpSeconds.after].filter((s) => s !== null).map((s) => s * 1.1)
			),
			LCP_GOOD
		)
	},
	{
		title: g.kilobytes.title,
		before: show(h.kilobytes.before, g.kilobytes.unit),
		after: show(h.kilobytes.after, g.kilobytes.unit),
		note: g.kilobytes.note
	},
	{
		title: g.requests.title,
		before: show(h.requests.before, String),
		after: show(h.requests.after, String),
		note: g.requests.note
	},
	{
		title: g.seo.title,
		before: show(h.seo.before, String),
		after: show(h.seo.after, String),
		note: g.seo.note(
			h.seoPerfect.after.n,
			h.seoPerfect.after.of,
			indexable ? indexable.of - indexable.n : 0
		),
		...bar(h.seo, 100, LIGHTHOUSE_GOOD)
	},
	{
		title: g.axe.title,
		before: show(h.axeDesktopNodes.before, String),
		after: show(h.axeDesktopNodes.after, String),
		note: g.axe.note(
			method.wcag,
			afterPages,
			h.axePhoneNodes.after ?? 0,
			h.accessibilityScore.after ?? 0
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
const pm = agents.pageModel;
const ch = c.agents.cards;
const agentCards = [
	pm.after && {
		title: ch.model.title,
		before: asOf(pm.before ?? { found: null, why: 'did-not-load' }, ofFacts(pm.after.expected)),
		after: asOf(pm.after, ofFacts(pm.after.expected)),
		note:
			pm.after.found === null
				? ''
				: ch.model.note(
						pm.after.found,
						pm.after.expected,
						'runs' in agents.llm ? agents.llm.runs : 0
					)
	},
	{
		title: ch.text.title,
		before: asOf(t.b.before, ofFacts(t.b.before.expected)),
		after: asOf(t.b.after, ofFacts(t.b.after.expected)),
		note: ch.text.note(t.b.after.found ?? 0, t.b.after.expected)
	},
	{
		title: ch.structured.title,
		before: asOf(t.a.before, ofFacts(t.a.before.expected)),
		after: asOf(t.a.after, ofFacts(t.a.after.expected)),
		note: ch.structured.note(t.a.after.found, t.a.after.expected)
	},
	{
		title: ch.summary.title,
		before: asOf(t.c.before, ofFacts(t.c.before.expected)),
		after: asOf(t.c.after, ofFacts(t.c.after.expected)),
		note: ch.summary.note(agents.llmsTxt.after)
	}
].filter(Boolean);

const search = agents.assistants.search;
const memory = agents.assistants.memory;
const todayText = search
	? c.agents.today({
			found: search.found ?? 0,
			expected: search.expected,
			runs: search.runs,
			memoryFound: memory.reduce((n, m) => n + (m.found ?? 0), 0) / Math.max(memory.length, 1),
			memoryModels: memory.length
		})
	: null;
const weekdays = agents.hours.find((x) => x.id === 'hours.weekdays');
const hoursCited = agents.hours.reduce((n, x) => n + x.citingOld, 0);
const hoursAnswers = agents.hours.reduce((n, x) => n + x.runs, 0);
const quoted = weekdays
	? listed([...new Set(weekdays.answers.filter(Boolean).map((a) => `“${a}”`))])
	: '';
const hoursText =
	hoursAnswers > 0 && quoted
		? c.agents.hours({ citing: hoursCited, answers: hoursAnswers, host: oldHost, quoted })
		: null;
// Every card says whether the current site has a figure, so the offer page can draw
// "did not load" apart from a value without comparing strings itself.
const mark = (card) => ({ ...card, hasFigure: card.before !== didNotLoad });

const figures = {
	name: 'Howard’s Tinting',
	current: `https://${method.beforeHost}/`,
	preview: PREVIEW,
	comparison: COMPARISON,
	didNotLoad,
	sides: c.sides,
	measured: {
		before: method.beforeDate,
		after: method.afterDate,
		pages: afterPages,
		addresses: audit.opens.before.of,
		phone: method.phoneDevice,
		lighthouse: method.lighthouseVersion,
		runs: method.runs
	},
	source: {
		commit: commit(),
		audit: auditRun.path,
		aeo: aeoRun.path,
		assistants: assistantsRun.path
	},
	glance: { cards: summaryCards.map(mark), failedNote },
	ai: {
		facts: agents.facts,
		today: todayText,
		hours: hoursText,
		hoursAfter: c.agents.hoursAfter(agents.hours.some((x) => x.onRebuildText)),
		cards: agentCards.map(mark)
	}
};

const out = join(dirname(fileURLToPath(import.meta.url)), 'figures.json');
writeFileSync(out, `${JSON.stringify(figures, null, '\t')}\n`);
console.log(`wrote ${out}`);
console.log(`  audit ${auditRun.path}\n  aeo ${aeoRun.path}\n  assistants ${assistantsRun.path}`);
