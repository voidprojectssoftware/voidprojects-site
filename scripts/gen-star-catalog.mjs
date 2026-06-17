// @ts-check
// Build the star catalogue shipped to the browser.
//
//   HYG CSV  ->  trimmed JSON (source of truth)  ->  quantized .bin (shipped)
//
// The binary layout lives in src/lib/sky/catalog-format.js and is shared with the
// runtime decoder, so this script never hand-rolls byte offsets.
//
// Usage:
//   node scripts/gen-star-catalog.mjs                  re-quantize from the JSON
//   node scripts/gen-star-catalog.mjs --download       fetch the default CSV and rebuild
//   node scripts/gen-star-catalog.mjs --url <url>      rebuild from a custom CSV URL
//   node scripts/gen-star-catalog.mjs --csv <path>     rebuild from a local CSV
//   node scripts/gen-star-catalog.mjs --mag-limit 5.5  change the brightness cutoff
//   node scripts/gen-star-catalog.mjs --help
//
// See src/lib/sky/README.md for the full guide.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Command, InvalidArgumentError } from 'commander';
import { encode } from '../src/lib/sky/catalog-format.js';

/** @typedef {import('../src/lib/sky/catalog-format.js').Star} Star */

const DEFAULT_MAG_LIMIT = 6.5;
const DEFAULT_CSV_URL =
	'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_PATH = join(root, 'src/lib/sky/star-catalog.json');
const BIN_PATH = join(root, 'static/star-catalog.bin');
const DEFAULT_CACHE = join(root, 'data/hyg.csv'); // git-ignored download location

// --- CLI ---------------------------------------------------------------------

/** Coerce + validate a magnitude argument. @param {string} value */
function parseMagLimit(value) {
	const n = Number(value);
	if (!Number.isFinite(n)) throw new InvalidArgumentError('must be a number.');
	return n;
}

const program = new Command()
	.name('gen-star-catalog')
	.description(
		'Build the star catalogue: HYG CSV -> trimmed JSON (source) -> quantized .bin (shipped).\n' +
			'With no source flags, re-quantizes the .bin from the committed JSON.'
	)
	.option('-d, --download', 'download the CSV (from --url) and rebuild the JSON + .bin')
	.option('--url <url>', `CSV source URL to download (default: HYG v41)`)
	.option('--cache <path>', 'where to save the downloaded CSV', DEFAULT_CACHE)
	.option('--csv <path>', 'rebuild from an already-downloaded local CSV')
	.option(
		'-m, --mag-limit <number>',
		'keep stars at least this bright',
		parseMagLimit,
		DEFAULT_MAG_LIMIT
	)
	.parse();

const opts =
	/** @type {{ download?: boolean, url?: string, cache: string, csv?: string, magLimit: number }} */ (
		program.opts()
	);
const magLimit = opts.magLimit;
// Passing --url implies a download even without -d.
const wantsDownload = Boolean(opts.download || opts.url);

// --- CSV model ---------------------------------------------------------------

/** Columns we read from the HYG CSV. */
const COLUMNS = /** @type {const} */ (['id', 'ra', 'dec', 'mag', 'ci']);

/** A typed view of one HYG row (numbers parsed; `id` kept as string). */
/** @typedef {{ id: string, ra: number, dec: number, mag: number, ci: number }} HygRow */

/** Minimal CSV field splitter that respects double-quoted fields. */
function splitCsv(/** @type {string} */ line) {
	/** @type {string[]} */
	const out = [];
	let cur = '';
	let quoted = false;
	for (let i = 0; i < line.length; i++) {
		const c = line[i];
		if (quoted) {
			if (c === '"') {
				if (line[i + 1] === '"') ((cur += '"'), i++);
				else quoted = false;
			} else cur += c;
		} else if (c === '"') quoted = true;
		else if (c === ',') (out.push(cur), (cur = ''));
		else cur += c;
	}
	out.push(cur);
	return out;
}

/**
 * Build a typed row reader bound to a header line. Resolves each needed column's
 * index once (throwing if any are missing) so the rest of the code accesses
 * fields by name instead of by magic index.
 * @param {string} headerLine
 * @returns {(line: string) => HygRow}
 */
function makeRowReader(headerLine) {
	const header = splitCsv(headerLine);
	/** @type {Record<(typeof COLUMNS)[number], number>} */
	const at = /** @type {any} */ ({});
	for (const name of COLUMNS) {
		const idx = header.indexOf(name);
		if (idx < 0) throw new Error(`HYG CSV is missing the "${name}" column`);
		at[name] = idx;
	}
	return (line) => {
		const f = splitCsv(line);
		return {
			id: f[at.id],
			ra: parseFloat(f[at.ra]),
			dec: parseFloat(f[at.dec]),
			mag: parseFloat(f[at.mag]),
			ci: parseFloat(f[at.ci])
		};
	};
}

// --- sources -----------------------------------------------------------------

/**
 * Download the CSV to a local path and return that path.
 * @param {string} url
 * @param {string} dest
 * @returns {Promise<string>}
 */
async function downloadCsv(url, dest) {
	console.log(`downloading ${url}`);
	const res = await fetch(url);
	if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`);
	if (!existsSync(dirname(dest))) mkdirSync(dirname(dest), { recursive: true });
	const bytes = Buffer.from(await res.arrayBuffer());
	writeFileSync(dest, bytes);
	console.log(`saved ${dest} (${(bytes.byteLength / 1e6).toFixed(1)} MB)`);
	return dest;
}

/**
 * Parse + trim a HYG CSV into stars (brightest first) and rewrite the JSON.
 * @param {string} csvPath
 * @returns {Star[]}
 */
function starsFromCsv(csvPath) {
	const lines = readFileSync(csvPath, 'utf8').split(/\r?\n/);
	const readRow = makeRowReader(lines[0]);

	/** @type {Star[]} */
	const stars = [];
	for (let i = 1; i < lines.length; i++) {
		if (!lines[i]) continue;
		const row = readRow(lines[i]);
		if (row.id === '0') continue; // skip the Sun
		if (!Number.isFinite(row.mag) || row.mag > magLimit) continue;
		if (!Number.isFinite(row.ra) || !Number.isFinite(row.dec)) continue;
		stars.push({
			ra: +row.ra.toFixed(4),
			dec: +row.dec.toFixed(4),
			mag: +row.mag.toFixed(2),
			ci: +(Number.isFinite(row.ci) ? row.ci : 0.65).toFixed(2)
		});
	}
	stars.sort((a, b) => a.mag - b.mag);

	const flat = stars.flatMap((s) => [s.ra, s.dec, s.mag, s.ci]);
	writeFileSync(JSON_PATH, JSON.stringify({ magLimit, count: stars.length, stars: flat }));
	console.log(`wrote ${JSON_PATH}: ${stars.length} stars (mag <= ${magLimit})`);
	return stars;
}

/**
 * Load stars from the committed JSON (flat [ra, dec, mag, ci, ...]).
 * @returns {Star[]}
 */
function starsFromJson() {
	const flat = /** @type {number[]} */ (JSON.parse(readFileSync(JSON_PATH, 'utf8')).stars);
	/** @type {Star[]} */
	const stars = [];
	for (let i = 0; i < flat.length; i += 4) {
		stars.push({ ra: flat[i], dec: flat[i + 1], mag: flat[i + 2], ci: flat[i + 3] });
	}
	return stars;
}

// --- run ---------------------------------------------------------------------

/** @type {Star[]} */
let stars;
if (wantsDownload) {
	const csvPath = await downloadCsv(opts.url ?? DEFAULT_CSV_URL, opts.cache);
	stars = starsFromCsv(csvPath);
} else if (opts.csv) {
	stars = starsFromCsv(opts.csv);
} else if (existsSync(JSON_PATH)) {
	console.log('no source flags; re-quantizing from existing JSON');
	stars = starsFromJson().filter((s) => s.mag <= magLimit);
} else {
	console.error('No JSON found and no source given. See src/lib/sky/README.md.');
	process.exit(1);
}

if (!existsSync(dirname(BIN_PATH))) mkdirSync(dirname(BIN_PATH), { recursive: true });
const buffer = encode(stars);
writeFileSync(BIN_PATH, Buffer.from(buffer));
console.log(`wrote ${BIN_PATH}: ${stars.length} stars, ${buffer.byteLength} bytes`);
