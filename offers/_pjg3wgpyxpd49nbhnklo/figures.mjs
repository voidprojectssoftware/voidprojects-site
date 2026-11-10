// Writes figures.json beside this file from auntmimiscakepops-website's own
// docs/discovery/site-comparison/figures.json, which that repository writes with
// scripts/write-comparison-figures.mjs and src/lib/site-comparison.ts, the code its
// /site-comparison/ page runs (client ADR 0016; `npm run check:figures` there fails when the
// file falls behind its newest runs). Nothing is recomputed or typed here: every label,
// value and line of fine print is copied as the client wrote it, so the offer cannot say a
// different number from the comparison page. Not part of the build: run it again whenever
// the client commits new figures, then
// `npx prettier --write offers/_pjg3wgpyxpd49nbhnklo/figures.json`.
//
//   node offers/_pjg3wgpyxpd49nbhnklo/figures.mjs <auntmimiscakepops-website> [commit]
//
// The argument is a checkout or an export of the client repository (for example
// `git archive origin/main | tar -x -C <dir>`); `commit` names what it holds when the
// folder is not a git checkout.
//
// The business has no website, so the before side is never a site score (client ADR 0012):
// the site rows say "No website today", and two AI rows deliberately set two different
// measures side by side, which the client labels "Two measures, not one" in their fine
// print. The page draws no bar across any row and claims nothing about what assistants or
// Google will return after launch.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [repo, commitArg] = process.argv.slice(2);
if (!repo) {
	console.error('usage: figures.mjs <auntmimiscakepops-website> [commit]');
	process.exit(1);
}

const FIGURES = 'docs/discovery/site-comparison/figures.json';
const client = JSON.parse(readFileSync(join(repo, FIGURES), 'utf8'));
const commit =
	commitArg ??
	execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();

const row = (r, i, group) => {
	for (const key of ['label', 'why', 'fine', 'before']) {
		if (typeof r[key] !== 'string') throw new Error(`${FIGURES}: ${group} row ${i} has no ${key}`);
	}
	return {
		id: `${group}-${i}`,
		label: r.label,
		why: r.why,
		impact: r.impact ?? null,
		fine: r.fine,
		before: r.before,
		after: r.after ?? null
	};
};

const { site, ai } = client;
const figures = {
	name: site.name,
	preview: site.preview,
	comparison: site.comparison,
	measured: site.measured,
	pages: site.pages,
	currentNote: site.currentNote,
	facts: ai.facts,
	assistantFacts: ai.assistantFacts,
	sides: { before: 'Today', after: 'With the new site' },
	source: { commit, figures: FIGURES, ...site.source },
	site: client.rows.map((r, i) => row(r, i, 'site')),
	ai: ai.rows.map((r, i) => row(r, i, 'ai'))
};

const out = join(dirname(fileURLToPath(import.meta.url)), 'figures.json');
writeFileSync(out, `${JSON.stringify(figures, null, '\t')}\n`);
console.log(`wrote ${out}\n  from ${FIGURES} at ${commit}`);
