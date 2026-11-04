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
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [ftpsRepo, seRepo] = process.argv.slice(2);
if (!ftpsRepo || !seRepo) {
	console.error(
		'usage: figures.mjs <firsttouchpaymentsolutions-website> <softwareearnings-website>'
	);
	process.exit(1);
}

// The runs each /site-comparison/ page reads: FTPS names its run in the page;
// Software Earnings takes the newest run by when it says it was taken, which its own
// newestRun() and takenAt pick here too.
const FTPS_AUDIT = 'docs/discovery/seo-audit/2026-10-28-after-88/result.json';

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

// Reference lines drawn across the bars. Only published benchmarks, checked 2026-11-04:
// - LCP: "sites should strive to have Largest Contentful Paint of 2.5 seconds or less"
//   (https://web.dev/articles/lcp), the same 2,500 ms as GOOD_LCP_MS in both repos.
// - Lighthouse scores: "90 to 100 (green): Good"
//   (https://developer.chrome.com/docs/lighthouse/performance/performance-scoring); the
//   report colours every category's gauge the same way (PASS_THRESHOLD = 0.9 in
//   Lighthouse's shared/util.js), so it applies to the SEO and accessibility scores too.
// - Page counts (clear outline, business details): no published benchmark, so the line
//   is the natural goal, every page.
// - AI fact shares and the geoctl score: no recognised published benchmark, so no line.
const LCP_GOOD = {
	value: 2.5,
	label: 'Good', // shown under the line, with an arrow toward the good side
	good: 'lower', // which side of the line is good
	text: 'Good is 2.5 seconds or less', // the value, for screen readers
	source: 'Google’s Core Web Vitals mark for a good page load (web.dev).'
};
const LIGHTHOUSE_GOOD = {
	value: 90,
	label: 'Good',
	good: 'higher',
	text: 'Good is 90 or more',
	source: 'The green “good” band of Google Lighthouse’s score (Chrome developer docs).'
};
const allPages = (n) => ({
	value: n,
	label: 'Goal',
	good: 'higher',
	text: `The goal is all ${n} pages`,
	source: 'No published benchmark; every page is the natural goal.'
});
const ofPages = (text) => Number(text.match(/^(\d+) of/)?.[1]);

// The headline rows both sites share, from compareSites().
function headline(comparison) {
	const h = comparison.headline;
	const n = comparison.pageCount;
	const structured = check(comparison, 'Business details for search engines');
	const headings = check(comparison, 'Headings in order, no skipped levels');
	const of = (text) => text.replace(/ pages$/, '');
	return [
		row(
			'Wait before the page shows on a phone',
			[
				`Visitors see your page in ${seconds(h.lcpSeconds.after)} instead of ${seconds(h.lcpSeconds.before)}.`,
				'People leave slow pages before they find your number.'
			],
			`Largest Contentful Paint, mean of ${n} pages; ${h.lcpGood.before} of ${n} pages within 2.5 s today, ${h.lcpGood.after} of ${n} rebuilt.`,
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
				'Most people check out a business on a phone first.',
				'This is their first impression of you.'
			],
			`Google Lighthouse performance score, mean of ${n} pages.`,
			String(h.performance.before),
			String(h.performance.after),
			{ before: h.performance.before, after: h.performance.after, max: 100 },
			LIGHTHOUSE_GOOD
		),
		row(
			'Ready for Google, out of 100',
			'Nothing basic is missing when Google decides how to list you.',
			`Google Lighthouse SEO score on phones, mean of ${n} pages; 100 on ${h.seoPerfectPages.before} of ${n} today, ${h.seoPerfectPages.after} of ${n} rebuilt.`,
			String(h.seo.before),
			String(h.seo.after),
			{ before: h.seo.before, after: h.seo.after, max: 100 },
			LIGHTHOUSE_GOOD
		),
		row(
			'Usable by every visitor, out of 100',
			'Customers using a screen reader or large text can read and use every page.',
			`Google Lighthouse accessibility score on phones, mean of ${n} pages.`,
			String(h.accessibilityScore.before),
			String(h.accessibilityScore.after),
			{ before: h.accessibilityScore.before, after: h.accessibilityScore.after, max: 100 },
			LIGHTHOUSE_GOOD
		),
		row(
			'Pages with a clear outline',
			'Search engines and AI assistants can tell what each page is about.',
			'Headings in order, no skipped levels.',
			of(headings.before),
			of(headings.after),
			{ before: ofPages(headings.before), after: ofPages(headings.after), max: n },
			allPages(n)
		),
		row(
			'Pages with your business details for Google',
			'Kept as it is today: your name, phone and services stay readable to Google.',
			'Structured data (JSON-LD) on the page.',
			of(structured.before),
			of(structured.after),
			{ before: ofPages(structured.before), after: ofPages(structured.after), max: n },
			allPages(n)
		)
	];
}

const ftpsLib = await load(ftpsRepo, 'src/lib/site-comparison.ts');
const seLib = await load(seRepo, 'src/lib/site-comparison.ts');
const seAgents = await load(seRepo, 'src/lib/agent-readiness.ts');

// Every <dir>/<file> under a docs/discovery folder, keyed as import.meta.glob keys them.
function runs(repo, folder, file) {
	const files = {};
	for (const dir of readdirSync(join(repo, folder))) {
		const path = join(folder, dir, file);
		if (existsSync(join(repo, path)))
			files[`../../${path}`] = readFileSync(join(repo, path), 'utf8');
	}
	return files;
}
const seAuditRun = seLib.newestRun(
	runs(seRepo, 'docs/discovery/seo-audit', 'result.json'),
	'audit run',
	seLib.takenAt.audit
);
const seAeoRun = seLib.newestRun(
	runs(seRepo, 'docs/discovery/aeo', 'result.json'),
	'fact recall run',
	seLib.takenAt.factRecall
);
const SE_AUDIT = seAuditRun.path;
const SE_AEO = dirname(seAeoRun.path);

const ftps = ftpsLib.compareSites(json(ftpsRepo, FTPS_AUDIT));
const se = seLib.compareSites(JSON.parse(seAuditRun.text));
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
const found = (channel, side) => {
	const r = agents.totals[channel][side];
	return (100 * r.found) / r.expected;
};
const aiRow = (channel, label, why, fine) =>
	row(
		label,
		why,
		`${fine} Share of ${agents.totals[channel].before.expected} checks of ${agents.facts} facts.`,
		share(channel, 'before'),
		share(channel, 'after'),
		{ before: found(channel, 'before'), after: found(channel, 'after'), max: 100 }
	);
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
					aiRow(
						'a',
						'Your facts AI assistants can read directly',
						[
							'AI assistants answer questions about businesses like yours.',
							'They can quote your details instead of guessing them.'
						],
						'Structured data (JSON-LD).'
					),
					aiRow(
						'b',
						'Your facts readable without running scripts',
						'Many AI tools do not run scripts; they now see what a visitor sees.',
						'Page text with JavaScript off.'
					),
					aiRow(
						'c',
						'Your facts in the summary written for AI tools',
						'AI tools get a clean list of your products, people and contact details.',
						'llms.txt and markdown versions of each page.'
					),
					row(
						'Independent AI readiness check, out of 100',
						'Confirms AI crawlers are let in and can find and read the site.',
						'geoctl open-source audit; the rebuild as it will run at launch.',
						String(agents.geoctl.live.score),
						String(agents.geoctl.launch.score),
						{
							before: agents.geoctl.live.score,
							after: agents.geoctl.launch.score,
							max: agents.geoctl.live.max
						}
					)
				]
			}
		}
	]
};

const out = join(dirname(fileURLToPath(import.meta.url)), 'figures.json');
writeFileSync(out, `${JSON.stringify(figures, null, '\t')}\n`);
console.log(`wrote ${out}`);
