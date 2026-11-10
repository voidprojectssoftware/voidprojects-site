// Writes figures.json beside this file: what the public can learn about Aunt Mimi's today
// (the before side), read from the runs committed in auntmimiscakepops-website, so
// nothing here is typed in by hand. The business has no website, so the before side is
// never a site score: it is what AI assistants answer, what a web search returns and
// which facts its Facebook, Instagram and Google pages state (client ADR 0012,
// docs/discovery/aeo/2026-11-09-baseline/, summarized in docs/discovery/baseline-2026-11-09.md).
// Model: offers/orebabrmoseow8vsknfk/figures.mjs (Howard's Tinting) and the drafts in
// PRs #107 and #108. Not part of the build: run it again when the client commits a newer
// run, then `npx prettier --write offers/_pjg3wgpyxpd49nbhnklo/figures.json`.
//
//   node offers/_pjg3wgpyxpd49nbhnklo/figures.mjs <auntmimiscakepops-website> [commit]
//
// The argument is a checkout or an export of the client repository (for example
// `git archive origin/main | tar -x -C <dir>`); `commit` names what it holds when the
// folder is not a git checkout.
//
// TODO(after side, client #7 part 2): the launch build's measurements and the client's
// /site-comparison/ page are not on client main yet. Every card's `after` is null until
// then. When part 2 merges, import the client's own comparison code here (as #107 and
// #108 import src/lib/site-comparison.ts and src/lib/agent-readiness.ts), read the run
// its page reads, fill `after` from it and use the page's own titles and notes, so the
// offer prints what /site-comparison/ prints.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [repo, commitArg] = process.argv.slice(2);
if (!repo) {
	console.error('usage: figures.mjs <auntmimiscakepops-website> [commit]');
	process.exit(1);
}

const PREVIEW = 'https://auntmimiscakepops-website.pages.dev/'; // client astro.config.mjs `site`
const commit = () =>
	commitArg ??
	execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();

// The newest dated baseline folder under docs/discovery/aeo/ (ADR 0012: a rerun goes in a
// new dated folder beside the old one, and an old run is never edited).
const AEO = 'docs/discovery/aeo';
const baselines = readdirSync(join(repo, AEO))
	.filter((d) => /^\d{4}-\d{2}-\d{2}-baseline$/.test(d))
	.filter((d) => existsSync(join(repo, AEO, d, 'presence', 'result.json')))
	.sort();
if (!baselines.length) throw new Error(`no ${AEO}/<date>-baseline/ run in ${repo}`);
const base = `${AEO}/${baselines.at(-1)}`;
const paths = {
	assistants: `${base}/assistants/result.json`,
	presence: `${base}/presence/result.json`,
	search: `${base}/search-observed.md`
};
const read = (path) => readFileSync(join(repo, path), 'utf8');
const assistants = JSON.parse(read(paths.assistants));
const presence = JSON.parse(read(paths.presence));
const searchText = read(paths.search);

// One decimal at most, as the client's summaries print a mean of three runs.
const num = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const words = (n) =>
	['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][n] ?? String(n);
const list = (items) =>
	items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

// Assistant recall: memory-only models and the one that may search the web.
const all = Object.values(assistants.assistants);
const memory = all.filter((a) => !a.webSearchRequests && a.id.startsWith('memory-'));
const search = all.find((a) => a.id.startsWith('search-'));
if (!memory.length || !search)
	throw new Error(`${paths.assistants}: expected memory and search assistants`);
const scored = assistants.meta.factsScored;
const memoryBest = Math.max(...memory.map((a) => a.recalled));
const memoryRuns = memory[0].runs;

// What the searching assistant found, in plain words. The fact ids are the client key's
// (scripts/measure-fact-recall.config.mjs); an id this table does not name is reported
// as is, so a new fact cannot vanish from the sentence.
const PLAIN = {
	'address.street': 'your street address',
	'address.zip': 'your ZIP code',
	phone: 'a phone number',
	'products.custom-cakes': 'that you make custom cakes',
	truck: 'that you have a food truck',
	facebook: 'your Facebook page',
	instagram: 'your Instagram'
};
const searchFound = Object.entries(search.perFact)
	.filter(([, p]) => p.recalled > 0)
	.map(([id]) => PLAIN[id] ?? id);
const searchMissed = (prefix) =>
	Object.entries(search.perFact)
		.filter(([id]) => id.startsWith(prefix))
		.every(([, p]) => p.recalled === 0);

// Web search, as observed: the table under "## The results" in search-observed.md.
const rows = [...searchText.matchAll(/^\| `([^`]+)` \| (\d+) \| ([^|]+) \|$/gm)].map((m) => ({
	query: m[1],
	results: Number(m[2]),
	found: m[3].trim() !== 'none'
}));
if (!rows.length) throw new Error(`${paths.search}: no result rows found`);
const totalResults = rows.reduce((n, r) => n + r.results, 0);
const queriesFound = rows.filter((r) => r.found).length;

// Presence: which facts each public page states as text, and which only in a photo.
const facts = presence.meta.facts;
const fb = presence.sources.FB;
const photoOnly = presence.anywhere.ids.photoOnly;
const count = (prefix) => photoOnly.filter((id) => id.startsWith(prefix)).length;
const photoParts = [
	count('flavors.') && `all ${words(count('flavors.'))} cake pop flavors`,
	count('price.') && `${count('price.') === 2 ? 'both' : words(count('price.'))} cake pop prices`,
	photoOnly.includes('products.ice-cream') && 'the ice cream'
].filter(Boolean);

const cards = [
	{
		id: 'search',
		title: 'Searches that show you',
		before: `${queriesFound} of ${rows.length}`,
		after: null, // TODO(client #7 part 2): not measurable before launch; say so from the page's own wording
		note: `We searched ${words(rows.length)} ways a customer might, including “${rows[0].query}” and “${rows[1].query}”. None of the ${totalResults} results was you: other Bartlett bakeries and wedding directories came up instead.`
	},
	{
		id: 'memory',
		title: 'What AI assistants know about you',
		before: `${num(memoryBest)} of ${scored}`,
		after: null, // TODO(client #7 part 2): fact recall of the launch build (what an assistant reading the new pages gets)
		note: `${words(memory.length).replace(/^./, (c) => c.toUpperCase())} AI assistants were asked about Aunt Mimi’s by name and town, ${words(memoryRuns)} times each, with no web access. Out of ${scored} things a customer might ask, from your phone number to your flavors, they knew ${memoryBest === 0 ? 'none' : num(memoryBest)}.`
	},
	{
		id: 'search-assistant',
		title: 'What an AI assistant finds by searching the web',
		before: `${num(search.recalled)} of ${scored}`,
		after: null, // TODO(client #7 part 2)
		note: `Across ${words(search.runs)} tries it found ${list(searchFound)}.${
			searchMissed('flavors.') && searchMissed('price.') && searchMissed('order.')
				? ' It found no flavor, no price and no way to order.'
				: ''
		}`
	},
	{
		id: 'facebook',
		title: 'Facts a search engine can read on your Facebook page',
		before: `${fb.text} of ${facts}`,
		after: null, // TODO(client #7 part 2): fact recall channel (b), the launch build's text
		note: `Another ${fb.photoOnly} are on the page only inside photos, where a person can read them and a search engine cannot.`
	},
	{
		id: 'photo-only',
		title: 'Facts that are only in photos, anywhere',
		before: `${photoOnly.length} of ${facts}`,
		after: null, // TODO(client #7 part 2)
		note: `Across Facebook, Instagram and Google: ${list(photoParts)}.`
	}
];

const figures = {
	name: 'Aunt Mimi’s Cake Pops & More',
	preview: PREVIEW,
	comparison: null, // TODO(client #7 part 2): new URL('site-comparison/', PREVIEW).href once the page exists
	sides: { before: 'Today, with no website', after: 'With the new site' },
	measured: {
		assistants: assistants.meta.date,
		presence: presence.meta.readOn,
		facts
	},
	source: {
		commit: commit(),
		assistants: paths.assistants,
		presence: paths.presence,
		search: paths.search,
		after: null // TODO(client #7 part 2): the launch build's audit and fact recall runs
	},
	cards
};

const out = join(dirname(fileURLToPath(import.meta.url)), 'figures.json');
writeFileSync(out, `${JSON.stringify(figures, null, '\t')}\n`);
console.log(`wrote ${out}\n  from ${base} at ${figures.source.commit}`);
