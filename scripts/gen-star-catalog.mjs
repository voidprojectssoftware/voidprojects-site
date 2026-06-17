// Build the star catalogue shipped to the browser.
//
// Pipeline:  HYG CSV  ->  trimmed JSON (source of truth)  ->  quantized .bin (shipped)
//
// Two ways to run (see src/lib/sky/README.md for the full guide):
//
//   1. Re-quantize from the committed JSON (no download, fast):
//        node scripts/gen-star-catalog.mjs
//
//   2. Rebuild everything from a fresh HYG CSV (to change MAG_LIMIT or catalogue
//      version). Download the CSV first (it is ~34 MB, do NOT commit it):
//        curl -L -o data/hyg.csv https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv
//        node scripts/gen-star-catalog.mjs data/hyg.csv
//
// Outputs:
//   src/lib/sky/star-catalog.json  (intermediate, readable, kept in git as source)
//   static/star-catalog.bin        (what the app fetches at runtime)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ---- config -----------------------------------------------------------------
const MAG_LIMIT = 6.5; // keep stars at least this bright (lower = fewer stars, smaller file)
// -----------------------------------------------------------------------------

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_PATH = join(root, 'src/lib/sky/star-catalog.json');
const BIN_PATH = join(root, 'static/star-catalog.bin');
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// minimal CSV splitter that respects double-quoted fields
function splitCsv(line) {
	const out = [];
	let cur = '';
	let q = false;
	for (let i = 0; i < line.length; i++) {
		const c = line[i];
		if (q) {
			if (c === '"') {
				if (line[i + 1] === '"') {
					cur += '"';
					i++;
				} else q = false;
			} else cur += c;
		} else if (c === '"') q = true;
		else if (c === ',') {
			out.push(cur);
			cur = '';
		} else cur += c;
	}
	out.push(cur);
	return out;
}

// HYG CSV -> flat [ra, dec, mag, ci, ...] and write the JSON source of truth
function buildJsonFromCsv(csvPath) {
	const lines = readFileSync(csvPath, 'utf8').split(/\r?\n/);
	const h = splitCsv(lines[0]);
	const iId = h.indexOf('id');
	const iRa = h.indexOf('ra'); // hours
	const iDec = h.indexOf('dec'); // degrees
	const iMag = h.indexOf('mag'); // apparent magnitude
	const iCi = h.indexOf('ci'); // B-V colour index
	if ([iRa, iDec, iMag, iCi].some((i) => i < 0)) throw new Error('unexpected CSV columns');

	const rows = [];
	for (let i = 1; i < lines.length; i++) {
		if (!lines[i]) continue;
		const f = splitCsv(lines[i]);
		if (f[iId] === '0') continue; // skip the Sun
		const mag = parseFloat(f[iMag]);
		if (!isFinite(mag) || mag > MAG_LIMIT) continue;
		const ra = parseFloat(f[iRa]);
		const dec = parseFloat(f[iDec]);
		if (!isFinite(ra) || !isFinite(dec)) continue;
		let ci = parseFloat(f[iCi]);
		if (!isFinite(ci)) ci = 0.65;
		rows.push([+ra.toFixed(4), +dec.toFixed(4), +mag.toFixed(2), +ci.toFixed(2)]);
	}
	rows.sort((a, b) => a[2] - b[2]); // brightest first
	const flat = [];
	for (const r of rows) flat.push(...r);
	writeFileSync(JSON_PATH, JSON.stringify({ magLimit: MAG_LIMIT, count: rows.length, stars: flat }));
	console.log(`wrote ${JSON_PATH}: ${rows.length} stars`);
	return flat;
}

// flat [ra, dec, mag, ci, ...] -> quantized binary (6 bytes/star + 4-byte header)
function buildBinFromFlat(flat) {
	const count = flat.length / 4;
	const buf = Buffer.alloc(4 + count * 6);
	buf.writeUInt32LE(count, 0);
	let o = 4;
	for (let i = 0; i < flat.length; i += 4) {
		buf.writeUInt16LE(clamp(Math.round((flat[i] / 24) * 65535), 0, 65535), o); // ra hours
		buf.writeInt16LE(clamp(Math.round((flat[i + 1] / 90) * 32767), -32767, 32767), o + 2); // dec deg
		buf.writeUInt8(clamp(Math.round((flat[i + 2] + 2) * 28), 0, 255), o + 4); // mag
		buf.writeUInt8(clamp(Math.round(((flat[i + 3] + 0.4) / 2.4) * 255), 0, 255), o + 5); // ci
		o += 6;
	}
	if (!existsSync(dirname(BIN_PATH))) mkdirSync(dirname(BIN_PATH), { recursive: true });
	writeFileSync(BIN_PATH, buf);
	console.log(`wrote ${BIN_PATH}: ${count} stars, ${buf.length} bytes`);
}

// ---- run --------------------------------------------------------------------
const csvArg = process.argv[2];
let flat;
if (csvArg) {
	flat = buildJsonFromCsv(csvArg);
} else if (existsSync(JSON_PATH)) {
	console.log('no CSV given; re-quantizing from existing JSON');
	flat = JSON.parse(readFileSync(JSON_PATH, 'utf8')).stars;
} else {
	console.error('No JSON found and no CSV path given. See header / README for how to fetch the CSV.');
	process.exit(1);
}
buildBinFromFlat(flat);
