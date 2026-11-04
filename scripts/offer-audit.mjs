// Measured SEO/AEO comparison for an offer page (#79).
//
// Runs the same checks on a prospect's current site and on our preview, then
// writes one timestamped JSON file (shape: src/lib/offers/audit.ts) that the
// offer page renders. Dev-time only: nothing here runs on visitors' requests.
//
// Per site: one Lighthouse run (mobile), one page load with JavaScript off (what
// most AI crawlers and link previews read), one with JavaScript on (what a visitor
// sees), and plain GETs for robots.txt, the sitemap and llms.txt. Read only: no
// forms, no clicks. Every check fails soft, so a missing robots.txt is a "fail"
// row, not a crash.
//
// Usage: npm run audit:offer -- <current-url> <preview-url> [--out <dir>]

import { Command } from 'commander';
import lighthouse from 'lighthouse';
import { chromium } from 'playwright';
import * as prettier from 'prettier';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT = join(ROOT, 'offer-audits');
const TIMEOUT_MS = 30000;
const USER_AGENT =
	'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 VoidProjectsAudit/1.0 (+https://voidprojects.ai)';

// Crawlers that feed AI answers; a robots.txt that shuts these out hides the site
// from ChatGPT, Claude, Perplexity and Google's AI features.
const AI_BOTS = [
	'GPTBot',
	'OAI-SearchBot',
	'ChatGPT-User',
	'ClaudeBot',
	'Claude-SearchBot',
	'PerplexityBot',
	'Google-Extended',
	'CCBot'
];

const LIGHTHOUSE_CATEGORIES = [
	{ id: 'performance', lh: 'performance', label: 'Mobile speed' },
	{ id: 'accessibility', lh: 'accessibility', label: 'Accessibility' },
	{ id: 'seo', lh: 'seo', label: 'Search basics' },
	{ id: 'bestPractices', lh: 'best-practices', label: 'Best practices' }
];

const program = new Command()
	.name('offer-audit')
	.description('Compare a prospect site with our preview and write the offer audit JSON')
	.argument('<current-url>', "the prospect's site today")
	.argument('<preview-url>', 'the preview we built for them')
	.option('--out <dir>', 'folder for the JSON file', DEFAULT_OUT)
	.parse();

// ---- helpers ----

function freePort() {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.unref();
		server.on('error', reject);
		server.listen(0, '127.0.0.1', () => {
			const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());
			server.close(() => resolve(port));
		});
	});
}

// Prefer installed Chrome (closest to what PageSpeed Insights runs); fall back to
// Playwright's bundled Chromium.
async function launchBrowser(port) {
	const args = [`--remote-debugging-port=${port}`];
	try {
		return await chromium.launch({ channel: 'chrome', args });
	} catch {
		return await chromium.launch({ channel: 'chromium', args });
	}
}

async function fetchText(url) {
	try {
		const res = await fetch(url, {
			headers: { 'user-agent': USER_AGENT },
			redirect: 'follow',
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
		const text = await res.text();
		return { status: res.status, contentType: res.headers.get('content-type') ?? '', text };
	} catch (err) {
		return { status: null, contentType: '', text: '', error: String(err?.cause ?? err) };
	}
}

// Many sites answer every path with their HTML page, so a 200 alone does not mean
// the file exists.
function isRealFile(res) {
	if (res.status !== 200) return false;
	if (/text\/html/i.test(res.contentType)) return false;
	return !/^\s*<(!doctype\s+html|html)/i.test(res.text);
}

function countWords(text) {
	return text.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
}

function plural(n, word) {
	return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function check(id, group, label, status, value, explanation) {
	return { id, group, label, status, value, explanation };
}

// Runs one check; a thrown error becomes a "fail" row that records why.
async function safe(id, group, label, fn) {
	try {
		return await fn();
	} catch (err) {
		return {
			...check(
				id,
				group,
				label,
				'fail',
				null,
				'We could not measure this, so it counts as a miss.'
			),
			error: String(err?.message ?? err)
		};
	}
}

// ---- page snapshots ----

// Reads everything the HTML checks need from one loaded page. Runs inside the page
// through the DevTools protocol, which works even when the page's own scripts are off.
function readPage() {
	const meta = (sel) => document.querySelector(sel)?.getAttribute('content')?.trim() ?? null;
	const og = {};
	for (const el of document.querySelectorAll('meta[property^="og:"], meta[name^="og:"]')) {
		const key = el.getAttribute('property') ?? el.getAttribute('name');
		const content = el.getAttribute('content')?.trim();
		if (key && content && !(key in og)) og[key] = content;
	}
	const titleEl = document.querySelector('head title') ?? document.querySelector('title');
	return {
		viewport: meta('meta[name="viewport"]'),
		title: titleEl?.textContent?.trim() || null,
		description: meta('meta[name="description"]'),
		og,
		canonical: document.querySelector('link[rel~="canonical"]')?.getAttribute('href') ?? null,
		jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map(
			(el) => el.textContent ?? ''
		),
		headings: [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((el) => ({
			level: Number(el.tagName[1]),
			text: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120)
		})),
		text: (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim()
	};
}

async function snapshot(browser, url, javaScriptEnabled) {
	const context = await browser.newContext({
		javaScriptEnabled,
		userAgent: USER_AGENT,
		viewport: { width: 412, height: 823 },
		isMobile: true
	});
	try {
		const page = await context.newPage();
		const res = await page.goto(url, { waitUntil: 'load', timeout: TIMEOUT_MS });
		// Give client-rendered sites a moment to paint their content.
		if (javaScriptEnabled) await page.waitForTimeout(2500);
		return {
			finalUrl: page.url(),
			status: res?.status() ?? null,
			...(await page.evaluate(readPage))
		};
	} finally {
		await context.close();
	}
}

// ---- checks ----

async function lighthouseChecks(url, port) {
	const metric = (lhr, id) => {
		const v = lhr.audits[id]?.numericValue;
		return typeof v === 'number' ? Math.round(v * 1000) / 1000 : null;
	};
	let lhr = null;
	let error = null;
	try {
		const result = await lighthouse(url, {
			port,
			output: 'json',
			logLevel: 'error',
			onlyCategories: LIGHTHOUSE_CATEGORIES.map((c) => c.lh)
		});
		lhr = result?.lhr ?? null;
		if (lhr?.runtimeError) error = `${lhr.runtimeError.code}: ${lhr.runtimeError.message}`;
	} catch (err) {
		error = String(err?.message ?? err);
	}
	const version = lhr?.lighthouseVersion ?? null;
	const checks = LIGHTHOUSE_CATEGORIES.map(({ id, lh, label }) => {
		const raw = lhr?.categories?.[lh]?.score;
		const score = typeof raw === 'number' ? Math.round(raw * 100) : null;
		const value = { score };
		if (id === 'performance') {
			value.metrics = {
				firstContentfulPaintMs: lhr && metric(lhr, 'first-contentful-paint'),
				largestContentfulPaintMs: lhr && metric(lhr, 'largest-contentful-paint'),
				totalBlockingTimeMs: lhr && metric(lhr, 'total-blocking-time'),
				cumulativeLayoutShift: lhr && metric(lhr, 'cumulative-layout-shift')
			};
		}
		const row = check(id, 'lighthouse', label, 'fail', value, '');
		if (score === null) {
			row.explanation = "Google's Lighthouse test could not score this page on a phone.";
			if (error) row.error = error;
			return row;
		}
		// Lighthouse's own bands: 90+ green, 50 to 89 orange, under 50 red.
		row.status = score >= 90 ? 'pass' : score >= 50 ? 'warn' : 'fail';
		row.explanation = lighthouseLine(id, score, row.status);
		return row;
	});
	return { checks, version };
}

function lighthouseLine(id, score, status) {
	const of = `${score} out of 100 on a phone`;
	const lines = {
		performance: {
			pass: `Scores ${of}: pages load fast, so visitors stay.`,
			warn: `Scores ${of}: pages load slowly enough that some visitors give up.`,
			fail: `Scores ${of}: pages load so slowly that many visitors leave before they see anything.`
		},
		accessibility: {
			pass: `Scores ${of}: people using screen readers or larger text can use the site.`,
			warn: `Scores ${of}: some visitors with poor eyesight or a screen reader will struggle.`,
			fail: `Scores ${of}: many visitors with poor eyesight or a screen reader cannot use the site.`
		},
		seo: {
			pass: `Scores ${of}: the basics Google checks before ranking a page are in place.`,
			warn: `Scores ${of}: some basics Google checks before ranking a page are missing.`,
			fail: `Scores ${of}: Google finds many basic problems that hold back rankings.`
		},
		bestPractices: {
			pass: `Scores ${of}: the site follows modern security and quality standards.`,
			warn: `Scores ${of}: some security or quality standards are not met.`,
			fail: `Scores ${of}: the site misses many modern security and quality standards.`
		}
	};
	return lines[id][status];
}

function viewportCheck(page) {
	const content = page.viewport;
	const value = { content };
	if (!content)
		return check(
			'viewport',
			'search',
			'Phone layout',
			'fail',
			value,
			'The page does not tell phones to fit it to the screen, so it shows tiny, zoomed-out text.'
		);
	if (!/width\s*=\s*device-width/i.test(content))
		return check(
			'viewport',
			'search',
			'Phone layout',
			'warn',
			value,
			'The page tells phones how to size it, but not to match the screen width.'
		);
	return check(
		'viewport',
		'search',
		'Phone layout',
		'pass',
		value,
		'The page tells phones to fit it to the screen.'
	);
}

function titleCheck(page) {
	const text = page.title;
	const length = text?.length ?? 0;
	const value = { text, length };
	if (!text)
		return check(
			'title',
			'search',
			'Page title',
			'fail',
			value,
			'The page has no title, which is the headline Google shows in search results.'
		);
	if (length < 10 || length > 65)
		return check(
			'title',
			'search',
			'Page title',
			'warn',
			value,
			`The title is ${length} characters; Google shows about 50 to 60, so it is ${length < 10 ? 'too short to say much' : 'cut off in results'}.`
		);
	return check(
		'title',
		'search',
		'Page title',
		'pass',
		value,
		'The title is a good length for the headline Google shows in search results.'
	);
}

function descriptionCheck(page) {
	const text = page.description;
	const length = text?.length ?? 0;
	const value = { text, length };
	if (!text)
		return check(
			'metaDescription',
			'search',
			'Search snippet',
			'fail',
			value,
			'There is no description, so Google picks random text from the page to show under the title.'
		);
	if (length < 50 || length > 160)
		return check(
			'metaDescription',
			'search',
			'Search snippet',
			'warn',
			value,
			`The description is ${length} characters; about 50 to 160 reads best under the title in Google.`
		);
	return check(
		'metaDescription',
		'search',
		'Search snippet',
		'pass',
		value,
		'There is a well-sized description for Google to show under the title.'
	);
}

const OG_NAMES = { 'og:title': 'a title', 'og:description': 'a summary', 'og:image': 'a picture' };

function openGraphCheck(page) {
	const required = ['og:title', 'og:description', 'og:image'];
	const missing = required.filter((k) => !page.og[k]);
	const value = { tags: page.og, missing };
	if (missing.length === required.length)
		return check(
			'openGraph',
			'search',
			'Link previews',
			'fail',
			value,
			'Links shared on Facebook, LinkedIn or in texts show no picture or summary.'
		);
	if (missing.length)
		return check(
			'openGraph',
			'search',
			'Link previews',
			'warn',
			value,
			`Shared links are missing ${missing.map((k) => OG_NAMES[k]).join(' and ')}, so previews look incomplete.`
		);
	return check(
		'openGraph',
		'search',
		'Link previews',
		'pass',
		value,
		'Links shared on social media and in texts show a title, summary and picture.'
	);
}

function canonicalCheck(page) {
	let href = page.canonical;
	let sameOrigin = null;
	if (href) {
		try {
			const abs = new URL(href, page.finalUrl);
			href = abs.href;
			sameOrigin = abs.origin === new URL(page.finalUrl).origin;
		} catch {
			sameOrigin = false;
		}
	}
	const value = { href, sameOrigin };
	if (!href)
		return check(
			'canonical',
			'search',
			'Preferred address',
			'warn',
			value,
			'The page does not name its preferred address, so Google may split its ranking across copies.'
		);
	if (!sameOrigin)
		return check(
			'canonical',
			'search',
			'Preferred address',
			'warn',
			value,
			'The page names a preferred address on a different website, so this copy will not rank.'
		);
	return check(
		'canonical',
		'search',
		'Preferred address',
		'pass',
		value,
		'The page names its preferred address, so Google ranks one version of it.'
	);
}

function structuredDataCheck(page) {
	const types = new Set();
	const errors = [];
	let parsed = 0;
	const collect = (node) => {
		if (Array.isArray(node)) return node.forEach(collect);
		if (!node || typeof node !== 'object') return;
		const t = node['@type'];
		for (const name of Array.isArray(t) ? t : t ? [t] : []) types.add(String(name));
		for (const v of Object.values(node)) if (v && typeof v === 'object') collect(v);
	};
	page.jsonLd.forEach((raw, i) => {
		try {
			collect(JSON.parse(raw));
			parsed++;
		} catch (err) {
			errors.push(`block ${i + 1}: ${err.message}`);
		}
	});
	const value = { blocks: page.jsonLd.length, parsed, types: [...types].sort(), errors };
	if (!page.jsonLd.length)
		return check(
			'structuredData',
			'search',
			'Business details for machines',
			'fail',
			value,
			'There is no structured data, so Google and AI tools must guess your hours, services and location.'
		);
	if (errors.length || !types.size)
		return check(
			'structuredData',
			'search',
			'Business details for machines',
			'warn',
			value,
			`Structured data is there but ${errors.length ? 'some of it is broken' : 'it does not say what it describes'}, so machines may ignore it.`
		);
	return check(
		'structuredData',
		'search',
		'Business details for machines',
		'pass',
		value,
		`Google and AI tools can read who you are directly (${[...types].slice(0, 4).join(', ')}).`
	);
}

// Groups robots.txt into user-agent blocks and decides who is shut out of "/".
function parseRobots(text) {
	const groups = [];
	const sitemaps = [];
	let current = null;
	let lastWasAgent = false;
	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.replace(/#.*/, '').trim();
		const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
		if (!m) continue;
		const key = m[1].toLowerCase();
		const val = m[2].trim();
		if (key === 'sitemap') {
			if (val) sitemaps.push(val);
			continue;
		}
		if (key === 'user-agent') {
			if (!lastWasAgent || !current) {
				current = { agents: [], disallowRoot: false, allowRoot: false };
				groups.push(current);
			}
			current.agents.push(val.toLowerCase());
			lastWasAgent = true;
			continue;
		}
		lastWasAgent = false;
		if (!current) continue;
		if (key === 'disallow' && val === '/') current.disallowRoot = true;
		if (key === 'allow' && val === '/') current.allowRoot = true;
	}
	const groupFor = (agent) =>
		groups.find((g) => g.agents.includes(agent.toLowerCase())) ??
		groups.find((g) => g.agents.includes('*'));
	const blocked = (agent) => {
		const g = groupFor(agent);
		return Boolean(g && g.disallowRoot && !g.allowRoot);
	};
	return {
		sitemaps,
		blocksAllCrawlers: blocked('*'),
		blockedAiBots: AI_BOTS.filter(blocked)
	};
}

async function robotsCheck(origin) {
	const url = `${origin}/robots.txt`;
	const res = await fetchText(url);
	const found = isRealFile(res);
	const parsed = found
		? parseRobots(res.text)
		: { sitemaps: [], blocksAllCrawlers: false, blockedAiBots: [] };
	const value = { url, httpStatus: res.status, found, ...parsed };
	const row = (status, line) =>
		check('robotsTxt', 'search', 'Crawler instructions', status, value, line);
	if (!found)
		return row(
			'fail',
			'There is no robots.txt, the file that tells Google and AI crawlers what to read and where the sitemap is.'
		);
	if (parsed.blocksAllCrawlers)
		return row(
			'fail',
			'robots.txt tells every search engine to stay away, so the site cannot rank.'
		);
	if (parsed.blockedAiBots.length)
		return row(
			'warn',
			`robots.txt shuts out ${plural(parsed.blockedAiBots.length, 'AI crawler')} (${parsed.blockedAiBots.join(', ')}), so AI answers will not mention you.`
		);
	return row('pass', 'robots.txt lets search engines and AI crawlers in.');
}

async function sitemapCheck(origin, robotsSitemaps) {
	const candidates = [
		...robotsSitemaps,
		`${origin}/sitemap.xml`,
		`${origin}/sitemap_index.xml`
	].filter((u, i, all) => all.indexOf(u) === i);
	let last = { url: null, httpStatus: null };
	for (const url of candidates.slice(0, 4)) {
		const res = await fetchText(url);
		last = { url, httpStatus: res.status };
		if (res.status === 200 && /<(urlset|sitemapindex)[\s>]/i.test(res.text)) {
			const urlCount = (res.text.match(/<loc>/gi) ?? []).length;
			return check(
				'sitemap',
				'search',
				'Sitemap',
				'pass',
				{ url, httpStatus: res.status, found: true, urlCount },
				`A sitemap lists ${plural(urlCount, 'page')}, so search engines find every page quickly.`
			);
		}
	}
	return check(
		'sitemap',
		'search',
		'Sitemap',
		'fail',
		{ ...last, found: false, urlCount: null },
		'There is no sitemap, so search engines have to discover pages one link at a time.'
	);
}

function serverTextCheck(serverPage, renderedPage) {
	const serverWords = countWords(serverPage.text);
	const renderedWords = renderedPage ? countWords(renderedPage.text) : 0;
	const ratio = renderedWords
		? Math.min(1, Math.round((serverWords / renderedWords) * 100) / 100)
		: null;
	const value = { serverWords, renderedWords, ratio, sample: serverPage.text.slice(0, 200) };
	const row = (status, line) =>
		check('serverText', 'ai', 'Readable without JavaScript', status, value, line);
	if (serverWords < 30)
		return row(
			'fail',
			'Without running scripts the page is nearly blank, and most AI tools do not run scripts, so they see almost nothing.'
		);
	if (serverWords < 100 || (ratio !== null && ratio < 0.5))
		return row(
			'warn',
			`Only ${serverWords} of ${renderedWords || serverWords} words are readable without scripts, so AI tools miss part of the page.`
		);
	return row(
		'pass',
		`${serverWords} words are readable straight from the page, so AI tools can read it as a visitor does.`
	);
}

function headingsCheck(page) {
	const outline = page.headings.filter((h) => h.text);
	const h1Count = outline.filter((h) => h.level === 1).length;
	let skippedLevels = false;
	for (let i = 1; i < outline.length; i++) {
		if (outline[i].level > outline[i - 1].level + 1) skippedLevels = true;
	}
	if (outline.length && outline[0].level > 1) skippedLevels = true;
	const value = { outline: outline.slice(0, 40), h1Count, skippedLevels };
	const row = (status, line) => check('headings', 'ai', 'Clear headings', status, value, line);
	if (!outline.length)
		return row(
			'fail',
			'The page has no headings, so search engines and AI tools cannot tell what each part is about.'
		);
	if (h1Count !== 1)
		return row(
			'warn',
			h1Count === 0
				? 'There is no main heading, so machines have to guess what the page is about.'
				: `There are ${h1Count} main headings instead of one, which muddies what the page is about.`
		);
	if (skippedLevels)
		return row('warn', 'Headings skip levels, so the outline machines read is harder to follow.');
	return row(
		'pass',
		`One main heading and ${plural(outline.length - 1, 'subheading')} in order give machines a clear outline.`
	);
}

async function llmsTxtCheck(origin) {
	const url = `${origin}/llms.txt`;
	const res = await fetchText(url);
	const found = isRealFile(res);
	const firstLine = found ? (res.text.split(/\r?\n/).find((l) => l.trim()) ?? '').trim() : null;
	const value = { url, httpStatus: res.status, found, firstLine };
	if (!found)
		return check(
			'llmsTxt',
			'ai',
			'AI summary file',
			'warn',
			value,
			'There is no llms.txt, a short summary file some AI tools read first; it is new, but cheap to add.'
		);
	return check(
		'llmsTxt',
		'ai',
		'AI summary file',
		'pass',
		value,
		'An llms.txt gives AI tools a ready-made summary of the business.'
	);
}

// ---- per site ----

async function auditSite(browser, port, url) {
	console.log(`\nAuditing ${url}`);
	console.log('  Lighthouse (mobile)...');
	const lh = await lighthouseChecks(url, port);

	console.log('  Page with JavaScript off and on...');
	let serverPage = null;
	let renderedPage = null;
	let loadError = null;
	try {
		serverPage = await snapshot(browser, url, false);
	} catch (err) {
		loadError = String(err?.message ?? err).split('\n')[0];
	}
	try {
		renderedPage = await snapshot(browser, url, true);
	} catch {
		// serverText falls back to a ratio of null
	}

	const pageCheck = (id, group, label, fn) =>
		safe(id, group, label, () => {
			if (!serverPage) throw new Error(`page did not load: ${loadError}`);
			return fn(serverPage);
		});

	const finalUrl = serverPage?.finalUrl ?? renderedPage?.finalUrl ?? null;
	const origin = new URL(finalUrl ?? url).origin;

	console.log('  robots.txt, sitemap, llms.txt...');
	const robots = await safe('robotsTxt', 'search', 'Crawler instructions', () =>
		robotsCheck(origin)
	);
	const checks = [
		...lh.checks,
		await pageCheck('viewport', 'search', 'Phone layout', viewportCheck),
		await pageCheck('title', 'search', 'Page title', titleCheck),
		await pageCheck('metaDescription', 'search', 'Search snippet', descriptionCheck),
		await pageCheck('openGraph', 'search', 'Link previews', openGraphCheck),
		await pageCheck('canonical', 'search', 'Preferred address', canonicalCheck),
		await pageCheck(
			'structuredData',
			'search',
			'Business details for machines',
			structuredDataCheck
		),
		robots,
		await safe('sitemap', 'search', 'Sitemap', () =>
			sitemapCheck(origin, robots.value?.sitemaps ?? [])
		),
		await pageCheck('serverText', 'ai', 'Readable without JavaScript', (p) =>
			serverTextCheck(p, renderedPage)
		),
		await pageCheck('headings', 'ai', 'Clear headings', headingsCheck),
		await safe('llmsTxt', 'ai', 'AI summary file', () => llmsTxtCheck(origin))
	];
	const counts = { pass: 0, warn: 0, fail: 0 };
	for (const c of checks) counts[c.status]++;
	return {
		site: {
			requestedUrl: url,
			finalUrl,
			httpStatus: serverPage?.status ?? null,
			checks,
			counts
		},
		lighthouseVersion: lh.version
	};
}

function printSummary(audit) {
	const mark = { pass: 'PASS', warn: 'warn', fail: 'FAIL' };
	const rows = audit.current.checks.map((c, i) => {
		const p = audit.preview.checks[i];
		const score = (x) =>
			x.group === 'lighthouse' && x.value?.score != null ? ` ${x.value.score}` : '';
		return [c.label, `${mark[c.status]}${score(c)}`, `${mark[p.status]}${score(p)}`];
	});
	const head = ['Check', 'Current', 'Preview'];
	const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
	const line = (r) => `| ${r.map((cell, i) => cell.padEnd(widths[i])).join(' | ')} |`;
	console.log(`\n${line(head)}`);
	console.log(`|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`);
	rows.forEach((r) => console.log(line(r)));
	const total = (s) => `${s.counts.pass} pass, ${s.counts.warn} warn, ${s.counts.fail} fail`;
	console.log(`\nCurrent: ${total(audit.current)}`);
	console.log(`Preview: ${total(audit.preview)}`);
}

async function main() {
	const [currentUrl, previewUrl] = program.args.map((u) => new URL(u).href);
	const { out } = program.opts();
	const generatedAt = new Date().toISOString();

	const port = await freePort();
	const browser = await launchBrowser(port);
	let current;
	let preview;
	try {
		current = await auditSite(browser, port, currentUrl);
		preview = await auditSite(browser, port, previewUrl);
	} finally {
		await browser.close();
	}

	const pkg = JSON.parse(
		await readFile(join(ROOT, 'node_modules', 'lighthouse', 'package.json'), 'utf8')
	);
	/** @type {import('../src/lib/offers/audit.ts').OfferAudit} */
	const audit = {
		schemaVersion: 1,
		generatedAt,
		lighthouseVersion: current.lighthouseVersion ?? preview.lighthouseVersion ?? pkg.version,
		formFactor: 'mobile',
		current: current.site,
		preview: preview.site
	};

	const host = new URL(currentUrl).hostname.replace(/^www\./, '').replace(/[^a-z0-9.-]/gi, '-');
	const stamp = generatedAt.replace(/\.\d+Z$/, 'Z').replace(/:/g, '-');
	const file = join(out, `${host}-${stamp}.json`);
	await mkdir(out, { recursive: true });
	// Format as prettier would, so `npm run lint` passes on committed results.
	const config = (await prettier.resolveConfig(file)) ?? {};
	const json = await prettier.format(JSON.stringify(audit), {
		...config,
		plugins: [],
		filepath: file
	});
	await writeFile(file, json);

	printSummary(audit);
	console.log(`\nWrote ${relative(process.cwd(), file)}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
