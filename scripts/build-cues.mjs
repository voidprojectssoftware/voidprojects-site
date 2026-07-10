// @ts-check
// Compile the hand-tuned cue script into the JSON the browser loads, tagging each
// word with its part of speech on the way through.
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
//   node scripts/build-cues.mjs --pos            print the tag chosen for every word
//
// Parts of speech come from compromise; where it is wrong, POS_OVERRIDES corrects it.
//
// See docs/subtitles/README.md.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import nlp from 'compromise';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const { values } = parseArgs({
	options: {
		script: { type: 'string', default: 'scripts/vo/hero.cues.txt' },
		out: { type: 'string', default: 'static/vo/hero.cues.json' },
		audio: { type: 'string', default: '/vo/hero.m4a' },
		check: { type: 'boolean', default: false },
		pos: { type: 'boolean', default: false },
		help: { type: 'boolean', default: false }
	}
});

if (values.help) {
	console.log(
		'usage: node scripts/build-cues.mjs [--script f] [--out f] [--audio url] [--check] [--pos]'
	);
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

/**
 * compromise tags a term with everything it knows — "I" is `Noun,Pronoun`, "our" is
 * `Noun,Possessive` — so the order here is the priority, most specific first. Nouns
 * come last because almost every nominal carries the `Noun` tag as well.
 *
 * @type {[string, string][]}
 */
const POS_PRIORITY = [
	['Pronoun', 'pronoun'],
	['There', 'pronoun'], // the existential "there's"
	['Possessive', 'pronoun'],
	['Value', 'numeral'],
	['Verb', 'verb'],
	['Adjective', 'adjective'],
	['Adverb', 'adverb'],
	['Determiner', 'determiner'],
	['Preposition', 'preposition'],
	['Conjunction', 'conjunction'],
	['Noun', 'noun']
];

const VALID_POS = new Set(POS_PRIORITY.map(([, pos]) => pos));

/** @param {string[]} tags @returns {string | null} */
function classify(tags) {
	for (const [tag, pos] of POS_PRIORITY) if (tags.includes(tag)) return pos;
	return null;
}

/**
 * Where compromise is wrong, and what it should have said. Keyed by the word with its
 * edge punctuation stripped and lowercased ("code," -> "code"); a bare key corrects
 * every occurrence, and `word#n` corrects only the nth (1-based) — needed when the
 * same word is genuinely two parts of speech in two places.
 *
 * Every entry must match a word and must disagree with the tagger, or the build fails.
 * An override that silently stops applying is how a table like this rots.
 *
 * @type {Record<string, string>}
 */
const POS_OVERRIDES = {
	code: 'noun', // last of a list of nouns; compromise reads the bare infinitive
	tell: 'verb', // "let us tell stories": compromise takes it for the noun (a poker tell)
	now: 'adverb', // sentence-final; compromise expects the "now that" conjunction
	what: 'pronoun' // "what to work on": compromise tags it QuestionWord and nothing else
};

/** Strip edge punctuation, keep the internal apostrophes and hyphens: `"want."` -> `want`. */
const normalize = (/** @type {string} */ w) =>
	w
		.toLowerCase()
		.replace(/^[^\p{L}\p{N}]+/u, '')
		.replace(/[^\p{L}\p{N}]+$/u, '');

/**
 * Apply {@link POS_OVERRIDES} to the tagged words, then check the table against what it
 * actually did: an entry that matched nothing is a typo or a stale line left behind by a
 * script edit, and one that agrees with the tagger is dead weight that will quietly
 * outlive the bug it was written for.
 *
 * @param {{word: {w: string, p?: string}}[]} spans
 * @returns {Set<object>} the words that were corrected
 */
function applyOverrides(spans) {
	for (const [key, pos] of Object.entries(POS_OVERRIDES)) {
		if (!VALID_POS.has(pos)) fail(`override "${key}" names an unknown part of speech: ${pos}`);
	}

	/** @type {Record<string, number>} */
	const seen = {};
	/** @type {Set<string>} */
	const matched = new Set();
	/** @type {string[]} */
	const redundant = [];
	/** @type {Set<object>} */
	const corrected = new Set();

	for (const { word } of spans) {
		const norm = normalize(word.w);
		const nth = (seen[norm] = (seen[norm] ?? 0) + 1);
		const key = `${norm}#${nth}` in POS_OVERRIDES ? `${norm}#${nth}` : norm;
		const pos = POS_OVERRIDES[key];
		if (pos === undefined) continue;

		matched.add(key);
		if (word.p === pos) redundant.push(`${key} is already ${pos}`);
		else corrected.add(word);
		word.p = pos;
	}

	const unmatched = Object.keys(POS_OVERRIDES).filter((k) => !matched.has(k));
	if (unmatched.length) fail(`override(s) match no word in the script: ${unmatched.join(', ')}`);
	if (redundant.length) fail(`override(s) the tagger already gets right: ${redundant.join(', ')}`);
	return corrected;
}

/** @param {string} msg */
function fail(msg) {
	console.error(`error: ${msg}`);
	process.exit(1);
}

/**
 * Tag every word with its part of speech, in place.
 *
 * The whole voiceover is tagged as one document rather than cue by cue: a phrase is
 * a fragment, and compromise reads "code," as a verb or a noun depending on the
 * sentence around it. Cue words carry their punctuation, so joining them back with
 * spaces reconstructs prose close enough to the original for its sentence splitter.
 *
 * Terms are then matched back to words by character offset, which survives the two
 * ways compromise declines to hand back the tokens it was given: a contraction
 * expands ("there's" -> "there" + a zero-length "is" carrying the verb tags), and a
 * hyphenate splits ("how-to" -> "how" + "to"). Both land inside the word's span, so
 * a word takes the first tag among the terms overlapping it that names a part of
 * speech — reaching past compromise's untagged `There` and `QuestionWord` to the
 * term that actually knows something.
 *
 * This is what compromise thinks, uncorrected; {@link applyOverrides} has the last word.
 *
 * @param {{words: {t: number, d: number, w: string, p?: string}[]}[]} cues
 * @returns {{word: {w: string, p?: string}, start: number, end: number}[]} one span per word
 */
function tagParts(cues) {
	/** @type {{word: {w: string, p?: string}, start: number, end: number}[]} */
	const spans = [];
	let text = '';
	for (const cue of cues) {
		for (const word of cue.words) {
			if (text) text += ' ';
			spans.push({ word, start: text.length, end: text.length + word.w.length });
			text += word.w;
		}
	}

	const doc = nlp(text);
	/** @type {{offset: {start: number, length: number}, tags: string[]}[]} */
	const terms = doc
		.json({ offset: true, terms: { offset: true, tags: true } })
		.flatMap((/** @type {{terms: never[]}} */ s) => s.terms);

	let ti = 0;
	for (const span of spans) {
		// Both lists run left to right, so the cursor only ever moves forward.
		while (ti < terms.length && terms[ti].offset.start + terms[ti].offset.length < span.start) ti++;
		let pos = null;
		for (let j = ti; j < terms.length && terms[j].offset.start <= span.end && !pos; j++) {
			pos = classify(terms[j].tags);
		}
		span.word.p = pos ?? 'other';
	}
	return spans;
}

const scriptPath = resolve(root, values.script);
const cues = parse(readFileSync(scriptPath, 'utf8'));
const spans = tagParts(cues);
const corrected = applyOverrides(spans);

if (values.pos) {
	for (const { word } of spans) {
		const mark = corrected.has(word) ? '*' : ' '; // starred: an override, not compromise
		console.log(`${mark} ${String(word.p).padEnd(12)} ${word.w}`);
	}
	process.exit(0);
}

/** @type {Record<string, number>} */
const counts = {};
for (const { word } of spans) counts[/** @type {string} */ (word.p)] ??= 0;
for (const { word } of spans) counts[/** @type {string} */ (word.p)]++;

const tally = Object.entries(counts)
	.sort((a, b) => b[1] - a[1])
	.map(([pos, n]) => `${pos} ${n}`)
	.join(', ');
console.log(`parts of speech: ${tally}`);
console.log(`  (${corrected.size} corrected by hand; run --pos to see which)`);
if (counts.other) console.log(`  (${counts.other} untagged; run --pos to see which)`);
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
