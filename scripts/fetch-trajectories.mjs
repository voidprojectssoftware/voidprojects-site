// Pull heliocentric ecliptic trajectories for deep-space probes from NASA/JPL
// HORIZONS and write a compact JSON the brand renderer reads. Position is
// projected onto the ecliptic X-Y plane (the "viewed from north ecliptic pole"
// view); the Z climb out of the plane is dropped. Re-run: npm run gen:trajectories
//
// COMMAND is the SPICE spacecraft id. Each craft has its own coverage window, so
// if a guessed start/stop falls outside it HORIZONS reports the valid bounds and
// we retry clamped to them rather than failing.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'src', 'lib', 'trajectory', 'trajectories.json');
const BASE = 'https://ssd.jpl.nasa.gov/api/horizons.api';

// The four that left the solar system are the default set; the rest are extra
// toggles with their own distinctive inner-system swirls. `color` drives the
// spectral palette in the renderer.
const CRAFT = [
	{ id: 'pioneer10', name: 'Pioneer 10', command: '-23', start: '1972-03-04', stop: '2000-01-01', color: '#e8c58a' },
	{ id: 'pioneer11', name: 'Pioneer 11', command: '-24', start: '1973-04-07', stop: '1995-09-01', color: '#e79a72' },
	{ id: 'voyager2', name: 'Voyager 2', command: '-32', start: '1977-08-21', stop: '2000-01-01', color: '#b79cf5' },
	{ id: 'voyager1', name: 'Voyager 1', command: '-31', start: '1977-09-06', stop: '2000-01-01', color: '#7fd7e8' },
	{ id: 'newhorizons', name: 'New Horizons', command: '-98', start: '2006-01-20', stop: '2022-01-01', color: '#86e8b0' },
	{ id: 'cassini', name: 'Cassini', command: '-82', start: '1997-10-16', stop: '2017-09-14', color: '#f0a6c8' },
	{ id: 'galileo', name: 'Galileo', command: '-77', start: '1989-10-20', stop: '2003-09-20', color: '#c9b68a' },
	{ id: 'ulysses', name: 'Ulysses', command: '-55', start: '1990-10-07', stop: '2009-06-29', color: '#9aa8f5' },
	{ id: 'juno', name: 'Juno', command: '-61', start: '2011-08-06', stop: '2016-07-04', color: '#e6d27a' },
	{ id: 'parker', name: 'Parker Solar Probe', command: '-96', start: '2018-08-13', stop: '2024-06-01', color: '#ff9d6f' },
	{ id: 'messenger', name: 'MESSENGER', command: '-236', start: '2004-08-04', stop: '2011-03-17', color: '#8fd0c0' },
	{ id: 'dawn', name: 'Dawn', command: '-203', start: '2007-09-28', stop: '2018-10-30', color: '#d6a0e8' }
];

// Outer-planet mean orbital radii (AU) for faint reference rings — not fetched.
const PLANETS = [
	{ name: 'Jupiter', a: 5.2 },
	{ name: 'Saturn', a: 9.54 },
	{ name: 'Uranus', a: 19.19 },
	{ name: 'Neptune', a: 30.07 }
];

const round = (n) => Math.round(n * 1e4) / 1e4;

// Shift a HORIZONS date like "1989-OCT-19" by whole days, returning YYYY-MM-DD.
const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
function shiftDay(horizonsDate, days) {
	const [y, mon, d] = horizonsDate.split('-');
	const m = MONTHS.findIndex((x) => x.toLowerCase() === mon.slice(0, 3).toLowerCase());
	const dt = new Date(Date.UTC(Number(y), m, Number(d) + days));
	return dt.toISOString().slice(0, 10);
}

async function request(command, start, stop) {
	const params = new URLSearchParams({
		format: 'text',
		COMMAND: `'${command}'`,
		OBJ_DATA: 'NO',
		MAKE_EPHEM: 'YES',
		EPHEM_TYPE: 'VECTORS',
		CENTER: "'500@10'", // Sun body center
		REF_PLANE: 'ECLIPTIC',
		START_TIME: `'${start}'`,
		STOP_TIME: `'${stop}'`,
		STEP_SIZE: "'1 MO'",
		VEC_TABLE: '1',
		OUT_UNITS: 'AU-D',
		CSV_FORMAT: 'YES'
	});
	const res = await fetch(`${BASE}?${params.toString()}`);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.text();
}

async function fetchCraft(c) {
	let start = c.start;
	let stop = c.stop;
	let text = '';
	for (let attempt = 0; attempt < 3; attempt++) {
		text = await request(c.command, start, stop);
		if (text.includes('$$SOE')) break;
		// Clamp to the coverage bounds HORIZONS reports, then retry.
		const prior = text.match(/prior to A\.D\.\s+([\d]{4}-[A-Za-z]{3}-[\d]{2})/);
		const after = text.match(/after A\.D\.\s+([\d]{4}-[A-Za-z]{3}-[\d]{2})/);
		if (!prior && !after) throw new Error(`no data\n${text.slice(0, 400)}`);
		// Coverage bounds are reported with a time-of-day; nudge a day inward so the
		// clamped range clears the intra-day epoch instead of re-hitting it.
		if (prior) start = shiftDay(prior[1], +1);
		if (after) stop = shiftDay(after[1], -1);
	}
	if (!text.includes('$$SOE')) throw new Error('no data after clamping');

	const soe = text.indexOf('$$SOE');
	const eoe = text.indexOf('$$EOE');
	const points = [];
	const years = [];
	let lastYear = null;
	for (const line of text.slice(soe + 5, eoe).trim().split('\n')) {
		const cols = line.split(',').map((s) => s.trim());
		const x = Number(cols[2]);
		const y = Number(cols[3]);
		if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
		const idx = points.length;
		points.push([round(x), round(y)]);
		const yr = Number(cols[1].match(/(\d{4})-/)?.[1]);
		if (yr && yr !== lastYear) {
			years.push({ year: yr, i: idx });
			lastYear = yr;
		}
	}
	const [fx, fy] = points[points.length - 1];
	console.log(`  ${c.name.padEnd(20)} ${String(points.length).padStart(4)} pts, final r = ${Math.hypot(fx, fy).toFixed(1)} AU`);
	return { id: c.id, name: c.name, color: c.color, launch: c.start, points, years };
}

console.log('Fetching trajectories from JPL HORIZONS...');
const craft = [];
for (const c of CRAFT) {
	try {
		craft.push(await fetchCraft(c));
	} catch (err) {
		console.warn(`  ${c.name}: SKIPPED (${err.message.split('\n')[0]})`);
	}
	await new Promise((r) => setTimeout(r, 400)); // be polite between requests
}

const payload = {
	meta: {
		generated: new Date().toISOString(),
		source: 'NASA/JPL HORIZONS',
		frame: 'heliocentric ecliptic, X-Y projection (north ecliptic pole)',
		step: '1 month',
		units: 'AU'
	},
	planets: PLANETS,
	craft
};

await writeFile(OUT, JSON.stringify(payload) + '\n');
console.log(`Wrote ${craft.length} craft to ${OUT}`);
