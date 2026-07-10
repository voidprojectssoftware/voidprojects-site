// @ts-check
// Compile the hand-tuned cue script into the JSON the browser loads.
//
//   scripts/vo/hero.cues.txt  ->  static/vo/hero.cues.json
//
// The script is the source of truth for timing; this only reshapes it. Seed the
// script once with `npm run align:vo`, then hand-tune it forever.
//
// Usage:
//   node scripts/build-cues.mjs
//   node scripts/build-cues.mjs --script <path> --out <path> --audio /vo/hero.m4a
//   node scripts/build-cues.mjs --check          parse + validate, write nothing
//
// See docs/subtitles/README.md.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const { values } = parseArgs({
	options: {
		script: { type: 'string', default: 'scripts/vo/hero.cues.txt' },
		out: { type: 'string', default: 'static/vo/hero.cues.json' },
		audio: { type: 'string', default: '/vo/hero.m4a' },
		check: { type: 'boolean', default: false },
		help: { type: 'boolean', default: false }
	}
});

if (values.help) {
	console.log('usage: node scripts/build-cues.mjs [--script f] [--out f] [--audio url] [--check]');
	process.exit(0);
}

/** A word carries an explicit start as `word[1.24]`; the brackets are not part of the text. */
const PINNED = /^(.*)\[(\d+(?:\.\d+)?)\]$/;

/**
 * Spread the unpinned words of one phrase across the gaps between its pinned ones,
 * weighting each word by its length so "architectural" gets more room than "a".
 * Word 0 falls back to the phrase start and the tail is bounded by the phrase end,
 * so every word lands inside `[start, end]` whether or not anything is pinned.
 *
 * @param {{text: string, at: number | null}[]} words
 * @param {number} start
 * @param {number} end
 * @returns {number[]} each word's start time
 */
function spread(words, start, end) {
	const times = words.map((w) => w.at);
	if (times[0] === null) times[0] = start;

	const weight = words.map((w) => Math.max(1, w.text.length));
	let anchor = 0;
	while (anchor < words.length) {
		// Next pinned word after `anchor`, or the phrase end acting as one.
		let next = anchor + 1;
		while (next < words.length && times[next] === null) next++;
		const from = /** @type {number} */ (times[anchor]);
		const to = next < words.length ? /** @type {number} */ (times[next]) : end;

		const total = weight.slice(anchor, next).reduce((a, b) => a + b, 0);
		let run = 0;
		for (let i = anchor; i < next - 1; i++) {
			run += weight[i];
			times[i + 1] = from + (to - from) * (run / total);
		}
		anchor = next;
	}
	return /** @type {number[]} */ (times);
}

/** @param {string} src @returns {{start: number, end: number, text: string, words: {t: number, d: number, w: string}[]}[]} */
function parse(src) {
	const cues = [];
	const problems = [];

	src.split('\n').forEach((raw, i) => {
		const line = raw.replace(/#.*$/, '').trim();
		if (!line) return;
		const lineNo = i + 1;
		const before = problems.length;

		const m = line.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(.*)$/);
		if (!m) {
			problems.push(`${lineNo}: expected "<start> <end> <text>", got: ${line}`);
			return;
		}
		const start = Number(m[1]);
		const end = Number(m[2]);
		if (end <= start) problems.push(`${lineNo}: end ${end} is not after start ${start}`);

		const words = m[3]
			.split(/\s+/)
			.filter(Boolean)
			.map((tok) => {
				const pin = tok.match(PINNED);
				return pin ? { text: pin[1], at: Number(pin[2]) } : { text: tok, at: null };
			});
		if (words.length === 0) {
			problems.push(`${lineNo}: no words`);
			return;
		}
		for (const w of words) {
			if (w.at !== null && (w.at < start || w.at > end)) {
				problems.push(`${lineNo}: ${w.text}[${w.at}] falls outside ${start}..${end}`);
			}
		}

		// A bad bound or a stray pin makes every later word on the line look out of
		// order too, so only check ordering once the line is otherwise sound.
		const times = spread(words, start, end);
		if (problems.length === before) {
			for (let k = 1; k < times.length; k++) {
				if (times[k] < times[k - 1]) {
					problems.push(`${lineNo}: ${words[k].text} starts before ${words[k - 1].text}`);
				}
			}
		}

		cues.push({
			start: round(start),
			end: round(end),
			text: words.map((w) => w.text).join(' '),
			words: words.map((w, k) => ({
				t: round(times[k]),
				d: round((k + 1 < times.length ? times[k + 1] : end) - times[k]),
				w: w.text
			}))
		});
	});

	if (problems.length) {
		console.error(`${problems.length} problem(s) in the cue script:`);
		for (const p of problems) console.error(`  ${p}`);
		process.exit(1);
	}

	// The runtime cursor walks the cues in order; sorting here means a hand-edit that
	// reorders two lines is not a bug the browser has to notice.
	cues.sort((a, b) => a.start - b.start);
	for (let i = 1; i < cues.length; i++) {
		if (cues[i].start < cues[i - 1].end) {
			console.warn(`note: "${cues[i].text}" starts before "${cues[i - 1].text}" ends (overlap)`);
		}
	}
	return cues;
}

/** @param {number} n */
const round = (n) => Math.round(n * 1000) / 1000;

const scriptPath = resolve(root, values.script);
const cues = parse(readFileSync(scriptPath, 'utf8'));
const duration = cues.length ? cues[cues.length - 1].end : 0;
const words = cues.reduce((n, c) => n + c.words.length, 0);

if (values.check) {
	console.log(
		`${cues.length} cues, ${words} words, ends at ${duration.toFixed(2)}s — script is valid`
	);
	process.exit(0);
}

const outPath = resolve(root, values.out);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({ audio: values.audio, duration, cues }, null, '\t') + '\n');
console.log(`${cues.length} cues, ${words} words -> ${values.out}`);
