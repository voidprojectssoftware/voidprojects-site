// Writes figures.json beside this file: Murphy's Wix site against the rebuild, worked
// out by murphysmemphis-website's own comparison code from the runs committed in that
// repository, so the offer shows what its /site-comparison/ page shows and nothing here
// is typed in by hand. Model: offers/orebabrmoseow8vsknfk/figures.mjs. Not part of the
// build: run it again when that repository commits a newer run, then
// `npx prettier --write offers/<this folder>/figures.json`.
//
//   node offers/<this folder>/figures.mjs <murphysmemphis-website>
//
// Node 22.18 or later, which loads the repository's TypeScript modules directly.
//
// The Wix site loads, so every card has a figure on both sides. `better` says which
// side each one favours; page.svelte words the speed score card from it, so a run where
// the Wix site is ahead gets the comparison page's own explanation of why.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [repo] = process.argv.slice(2);
if (!repo) {
	console.error('usage: figures.mjs <murphysmemphis-website>');
	process.exit(1);
}

const PREVIEW = 'https://murphysmemphis-website.pages.dev/';
const COMPARISON = new URL('site-comparison/', PREVIEW).href; // '/site-comparison/' in its src/routes.ts

const load = (file) => import(pathToFileURL(join(repo, file)).href);
const commit = () =>
	execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();

const lib = await load('src/lib/site-comparison.ts');
const agentsLib = await load('src/lib/agent-readiness.ts');
const words = await load('src/content/site-comparison.ts');
const { size, moved, seconds, siteComparisonCopy: c } = words;
const g = c.glance;
const s = c.sides;

// Every file matching docs/discovery/<folder>/*/<name>, keyed as the page's
// import.meta.glob keys them, so newestRun strips the same prefix.
function files(folder, name) {
	const out = {};
	for (const dir of readdirSync(join(repo, folder))) {
		const path = join(folder, dir, name);
		if (existsSync(join(repo, path))) out[`../../${path}`] = readFileSync(join(repo, path), 'utf8');
	}
	return out;
}

// The runs src/pages/site-comparison.astro reads, picked the way it picks them: the
// newest audit run holding both the live and the launch side, and the newest fact
// recall run, with the geoctl reports from that same directory.
const auditRun = lib.newestRun(
	files('docs/discovery/seo-audit', 'result.json'),
	'audit run',
	lib.takenAt.audit,
	lib.hasBothSides
);
const aeoRun = lib.newestRun(
	files('docs/discovery/aeo', 'result.json'),
	'fact recall run',
	lib.takenAt.factRecall
);
const aeoDir = aeoRun.path.replace(/result\.json$/, '');
const aeoFile = (file) => JSON.parse(readFileSync(join(repo, aeoDir, file), 'utf8'));
const agents = agentsLib.agentReadiness(JSON.parse(aeoRun.text), {
	live: aeoFile('geoctl-live.json'),
	production: aeoFile('geoctl-production.json'),
	launch: aeoFile('geoctl-launch.json')
});

// From here to `agentCards`, the page's own frontmatter, line for line where it makes a
// figure, so each value is the string the page prints.
const audit = lib.compareSites(JSON.parse(auditRun.text));
const { headline: h, method, pageCount } = audit;
const good = (lib.GOOD_LCP_MS / 1000).toFixed(1);

const fraction =
	h.kilobytes.after < h.kilobytes.before
		? lib.aboutAFraction(h.kilobytes.after, h.kilobytes.before)
		: null;
const times = Math.round(h.kilobytes.before / h.kilobytes.after);

// The page's cards, keyed so the offer can order them; the values and notes are the
// page's. `better` is which side the figure favours, from the figures, so the offer
// never has to say it by hand.
const better = (before, after, higherIsBetter) =>
	before === after ? 'same' : after > before === higherIsBetter ? 'after' : 'before';
const cards = {
	performance: {
		title: g.performance.title,
		before: String(h.performance.before),
		after: String(h.performance.after),
		note: [
			g.performance.note(moved(h.performance.before, h.performance.after, true)),
			h.performance.after < h.performance.before &&
			h.tbtSeconds.after > h.tbtSeconds.before &&
			h.lcpSeconds.after < h.lcpSeconds.before
				? g.performance.heldDown(h.tbtSeconds.before, h.tbtSeconds.after, h.lcpSeconds.after)
				: ''
		]
			.filter(Boolean)
			.join(' '),
		better: better(h.performance.before, h.performance.after, true)
	},
	lcp: {
		title: g.lcp.title,
		before: seconds(h.lcpSeconds.before),
		after: seconds(h.lcpSeconds.after),
		note: g.lcp.note(good, h.lcpGood.before, h.lcpGood.after, pageCount),
		better: better(h.lcpSeconds.before, h.lcpSeconds.after, false)
	},
	weight: {
		title: g.weight.title,
		before: size(h.kilobytes.before),
		after: size(h.kilobytes.after),
		note: fraction
			? g.weight.fraction(fraction)
			: times >= 2
				? g.weight.times(times)
				: g.weight.note(moved(h.kilobytes.before, h.kilobytes.after, false)),
		better: better(h.kilobytes.before, h.kilobytes.after, false)
	},
	requests: {
		title: g.requests.title,
		before: String(h.requests.before),
		after: String(h.requests.after),
		note: g.requests.note(moved(h.requests.before, h.requests.after, false)),
		better: better(h.requests.before, h.requests.after, false)
	},
	seo: {
		title: g.seo.title,
		before: String(h.seo.before),
		after: String(h.seo.after),
		note: g.seo.note(h.seoPerfect.before, h.seoPerfect.after, pageCount),
		better: better(h.seo.before, h.seo.after, true)
	},
	axe: {
		title: g.axe.title,
		before: String(h.axeDesktopNodes.before),
		after: String(h.axeDesktopNodes.after),
		note: g.axe.note(
			method.wcag,
			h.axePhoneNodes.before,
			h.axePhoneNodes.after,
			h.accessibility.before,
			h.accessibility.after
		),
		better: better(h.axeDesktopNodes.before, h.axeDesktopNodes.after, false)
	}
};

const ch = c.agents.channels;
const llmRan = !('skipped' in agents.llm);
const agentChannels = ['a', 'b', 'c', 'd'].filter((x) => x !== 'd' || llmRan);
const agentCards = agentChannels.map((channel) => {
	const totals = agents.totals[channel];
	const what =
		channel === 'c' ? ch.c.what(agents.llmsTxt.before, agents.llmsTxt.after) : ch[channel].what;
	const counts = [
		totals.before.found !== null &&
			`${s.before}: ${c.agents.ofChecks(totals.before.found, totals.before.expected)}`,
		totals.after.found !== null &&
			`${s.after}: ${c.agents.ofChecks(totals.after.found, totals.after.expected)}`
	].filter(Boolean);
	return {
		title: ch[channel].title,
		before: agentsLib.percent(totals.before, c.agents.none),
		after: agentsLib.percent(totals.after, c.agents.none),
		note: [what, ...counts].join(' ')
	};
});
const geo = agents.geoctl;

const figures = {
	name: 'Murphy’s',
	current: `https://${method.beforeHost}/murphysmemphis`,
	preview: PREVIEW,
	comparison: COMPARISON,
	sides: s,
	measured: {
		before: method.beforeDate,
		after: method.afterDate,
		pairs: pageCount,
		phone: method.phoneDevice,
		lighthouse: method.lighthouseVersion,
		runs: method.runs
	},
	source: {
		commit: commit(),
		audit: auditRun.path,
		aeo: aeoRun.path
	},
	glance: {
		lead: g.lead(pageCount),
		cards,
		// The same measurements as numbers, so the offer can say what each one means for the
		// bar (seconds, data, pages) by computing its sentence rather than typing it.
		numbers: {
			pages: pageCount,
			goodLcpSeconds: lib.GOOD_LCP_MS / 1000,
			lcpSeconds: h.lcpSeconds,
			lcpGood: h.lcpGood,
			kilobytes: h.kilobytes,
			requests: h.requests,
			seo: h.seo,
			seoPerfect: h.seoPerfect,
			axeDesktopNodes: h.axeDesktopNodes,
			axePhoneNodes: h.axePhoneNodes,
			accessibility: h.accessibility,
			performance: h.performance,
			tbtSeconds: h.tbtSeconds
		}
	},
	ai: {
		lead: c.agents.lead(agents.facts, agents.pages.length, agents.totals.b.after.expected),
		cards: agentCards,
		facts: agents.facts,
		totals: Object.fromEntries(agentChannels.map((ch) => [ch, agents.totals[ch]])),
		geoctl: c.agents.geoctl.body({
			max: geo.live.max,
			live: geo.live.score,
			livePages: geo.live.pages,
			launch: geo.launch.score,
			launchPages: geo.launch.pages,
			production: geo.production.score
		})
	}
};

const out = join(dirname(fileURLToPath(import.meta.url)), 'figures.json');
writeFileSync(out, `${JSON.stringify(figures, null, '\t')}\n`);
console.log(`wrote ${out}`);
console.log(`  audit ${auditRun.path}\n  aeo ${aeoRun.path}`);
