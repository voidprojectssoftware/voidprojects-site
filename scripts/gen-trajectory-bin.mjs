// @ts-check
// Build the trajectory data shipped to the browser from the fetched JSON.
//
//   trajectories.json (source of truth, from fetch-trajectories.mjs)
//     -> trajectories.bin      points + year markers (src/lib/trajectory/trajectory-format.js)
//     -> trajectory-meta.json  names, colours, launch dates, planet rings
//
// Usage:
//   node scripts/gen-trajectory-bin.mjs           rewrite the .bin and meta JSON, then verify
//   node scripts/gen-trajectory-bin.mjs --check   only verify the committed files against the JSON
//
// Verification decodes the binary and compares every point and year marker with
// the JSON. The tolerance is 0: the JSON is rounded to 1e-4 AU and the binary
// stores exactly those integers, so any difference is a bug.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { encode, decode } from '../src/lib/trajectory/trajectory-format.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'lib', 'trajectory');
const JSON_PATH = join(dir, 'trajectories.json');
const BIN_PATH = join(dir, 'trajectories.bin');
const META_PATH = join(dir, 'trajectory-meta.json');

const source = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
/** @type {{ id: string, name: string, color: string, launch: string, points: [number, number][], years: { year: number, i: number }[] }[]} */
const craft = source.craft;

const metaOf = () => ({
	meta: source.meta,
	planets: source.planets,
	craft: craft.map(({ id, name, color, launch }) => ({ id, name, color, launch }))
});

if (!process.argv.includes('--check')) {
	const buffer = encode(craft);
	writeFileSync(BIN_PATH, Buffer.from(buffer));
	writeFileSync(META_PATH, JSON.stringify(metaOf(), null, '\t') + '\n');
	console.log(`wrote ${BIN_PATH}: ${buffer.byteLength} bytes`);
	console.log(`wrote ${META_PATH}`);
}

const bin = readFileSync(BIN_PATH);
const decoded = decode(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
const meta = JSON.parse(readFileSync(META_PATH, 'utf8'));
const problems = [];
if (JSON.stringify(meta) !== JSON.stringify(metaOf()))
	problems.push('trajectory-meta.json is stale');
if (decoded.length !== craft.length)
	problems.push(`craft count ${decoded.length} != ${craft.length}`);
let points = 0;
let maxErr = 0;
craft.forEach((c, k) => {
	const d = decoded[k];
	if (!d) return;
	if (d.points.length !== c.points.length) problems.push(`${c.id}: point count differs`);
	c.points.forEach(([x, y], i) => {
		const [dx, dy] = d.points[i] ?? [NaN, NaN];
		const err = Math.max(Math.abs(dx - x), Math.abs(dy - y));
		maxErr = Math.max(maxErr, err);
		if (!(err === 0) || !Object.is(dx, x) || !Object.is(dy, y))
			problems.push(`${c.id}[${i}]: [${dx}, ${dy}] != [${x}, ${y}]`);
		points++;
	});
	if (JSON.stringify(d.years) !== JSON.stringify(c.years)) problems.push(`${c.id}: years differ`);
});

if (problems.length) {
	console.error(`trajectory binary does not match ${JSON_PATH}:`);
	for (const p of problems.slice(0, 20)) console.error(`  ${p}`);
	process.exit(1);
}
console.log(
	`verified ${craft.length} craft, ${points} points: max abs error ${maxErr} AU (tolerance 0), years identical`
);
