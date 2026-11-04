// Writes figures.json beside this file: the before and after figures the offer page
// shows for each site, worked out by each rebuild's own comparison code from the
// audit runs committed in its repository, so they match its /site-comparison/ page
// and nothing on the offer page is typed in by hand. Not part of the build: run it
// again when either repository commits a newer run, then `npx prettier --write`.
//
//   node offers/9p2by3s8x3x1l4jd60ci/figures.mjs <firsttouchpaymentsolutions-website> <softwareearnings-website>
//
// Node 22.18 or later, which loads the repositories' TypeScript modules directly.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [ftpsRepo, seRepo] = process.argv.slice(2);
if (!ftpsRepo || !seRepo) {
	console.error(
		'usage: figures.mjs <firsttouchpaymentsolutions-website> <softwareearnings-website>'
	);
	process.exit(1);
}

// The runs each /site-comparison/ page reads: FTPS names its run in the page,
// Software Earnings takes the newest directory, which these are on 2026-11-04.
const FTPS_AUDIT = 'docs/discovery/seo-audit/2026-10-28-after-88/result.json';
const SE_AUDIT = 'docs/discovery/seo-audit/2026-11-03-after-69/result.json';
const SE_AEO = 'docs/discovery/aeo/2026-11-04-after-96';

const json = (repo, file) => JSON.parse(readFileSync(join(repo, file), 'utf8'));
const load = (repo, file) => import(pathToFileURL(join(repo, file)).href);
const commit = (repo) =>
	execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
const seconds = (s) => `${s.toFixed(1)} s`;

// A row of the repo's own search checks table, by its heading.
function check(comparison, name) {
	const row = comparison.checks.find((c) => c.check === name);
	if (!row) throw new Error(`no "${name}" row in the site comparison`);
	return row;
}

// The headline rows both sites share, from compareSites().
function headline(comparison) {
	const h = comparison.headline;
	const n = comparison.pageCount;
	const structured = check(comparison, 'Business details for search engines');
	const headings = check(comparison, 'Headings in order, no skipped levels');
	return [
		{
			label: 'Speed score on phones',
			note: `Google Lighthouse performance, out of 100, averaged over ${n} pages.`,
			before: String(h.performance.before),
			after: String(h.performance.after)
		},
		{
			label: 'Time until the main content shows',
			note: `On a phone. Google counts 2.5 s or less as good: ${h.lcpGood.before} of ${n} pages meet it today, ${h.lcpGood.after} of ${n} rebuilt.`,
			before: seconds(h.lcpSeconds.before),
			after: seconds(h.lcpSeconds.after)
		},
		{
			label: 'Accessibility score',
			note: 'Google Lighthouse accessibility on phones, out of 100.',
			before: String(h.accessibilityScore.before),
			after: String(h.accessibilityScore.after)
		},
		{
			label: 'Search engine score',
			note: `Google Lighthouse SEO on phones, out of 100. 100 on ${h.seoPerfectPages.before} of ${n} pages today, ${h.seoPerfectPages.after} of ${n} rebuilt.`,
			before: String(h.seo.before),
			after: String(h.seo.after)
		},
		{
			label: 'Business details for search engines',
			note: 'Structured data: name, phone, location and services, in the format Google reads.',
			before: structured.before.replace(/ pages$/, ''),
			after: structured.after.replace(/ pages$/, '')
		},
		{
			label: 'Headings in order',
			note: 'One clear outline per page, which search engines and screen readers both follow.',
			before: headings.before.replace(/ pages$/, ''),
			after: headings.after.replace(/ pages$/, '')
		}
	];
}

const ftpsLib = await load(ftpsRepo, 'src/lib/site-comparison.ts');
const seLib = await load(seRepo, 'src/lib/site-comparison.ts');
const seAgents = await load(seRepo, 'src/lib/agent-readiness.ts');

const ftps = ftpsLib.compareSites(json(ftpsRepo, FTPS_AUDIT));
const se = seLib.compareSites(json(seRepo, SE_AUDIT));
const aeo = (name) => json(seRepo, `${SE_AEO}/${name}`);
const agents = seAgents.agentReadiness(
	aeo('result.json'),
	{
		live: aeo('geoctl-live.json'),
		production: aeo('geoctl-production.json'),
		launch: aeo('geoctl-launch.json')
	},
	aeo('agent-readiness.json')
);
const share = (channel, side) => seAgents.percent(agents.totals[channel][side]);
const checks = agents.totals.b.before.expected;

const figures = {
	sites: [
		{
			id: 'ftps',
			name: 'First Touch Payment Solutions',
			current: `https://${ftps.method.beforeHost}/`,
			preview: 'https://firsttouchpaymentsolutions-website.pages.dev/',
			measured: ftps.method.beforeDate,
			pages: ftps.pageCount,
			source: { commit: commit(ftpsRepo), run: FTPS_AUDIT },
			rows: headline(ftps),
			ai: null
		},
		{
			id: 'se',
			name: 'Software Earnings',
			current: `https://${se.method.beforeHost}/`,
			preview: 'https://softwareearnings-website.pages.dev/',
			measured: se.method.beforeDate,
			pages: se.pageCount,
			source: { commit: commit(seRepo), run: SE_AUDIT, aeo: SE_AEO },
			rows: headline(se),
			ai: {
				facts: agents.facts,
				checks,
				rows: [
					{
						label: 'Facts in the structured data',
						note: 'Business details written into each page for search engines and AI tools.',
						before: share('a', 'before'),
						after: share('a', 'after')
					},
					{
						label: 'Facts in the page text without scripts',
						note: 'How a crawler that does not run scripts reads the page.',
						before: share('b', 'before'),
						after: share('b', 'after')
					},
					{
						label: 'Facts in the llms.txt summary for AI tools',
						note: 'A plain list of the site’s pages and what they say.',
						before: share('c', 'before'),
						after: share('c', 'after')
					},
					{
						label: 'geoctl agent readiness score',
						note: `An open-source audit, out of ${agents.geoctl.live.max}; the rebuild as it will run at launch.`,
						before: String(agents.geoctl.live.score),
						after: String(agents.geoctl.launch.score)
					}
				]
			}
		}
	]
};

const out = join(dirname(fileURLToPath(import.meta.url)), 'figures.json');
writeFileSync(out, `${JSON.stringify(figures, null, '\t')}\n`);
console.log(`wrote ${out}`);
