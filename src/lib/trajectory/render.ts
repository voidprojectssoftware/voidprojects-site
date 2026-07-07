// Renders the four deep-space probe trajectories (Pioneer 10/11, Voyager 1/2)
// into a single standalone SVG mark. Data is real heliocentric ecliptic position
// from JPL HORIZONS (see scripts/fetch-trajectories.mjs), projected onto X-Y.
//
// The signature swirl (the gravity-assist encounter phase) lives within ~10 AU
// while the cruise runs out to ~70 AU, so a radial scale is the key control: a
// log scale compresses the long straight cruise and blooms the inner spiral into
// the recognizable logo shape.

import { DATA, type TrajectoryCraft } from './data.js';

type Craft = TrajectoryCraft;

// CRAFT_META / CRAFT_IDS are defined in ./data and re-exported via ./index (barrel).

export type RadialScale = 'linear' | 'sqrt' | 'log';
export type TrajectoryPalette = 'aurum' | 'brand' | 'mono' | 'spectral';

export interface TrajectoryOptions {
	craft: string[]; // ids to draw
	scale: RadialScale;
	maxAU: number; // crop radius; paths truncate here
	rotation: number; // degrees
	stroke: number; // weight multiplier
	smoothing: number; // 0 = rigid polyline, ~1 = Catmull-Rom spline, up to 1.5 rounder
	palette: TrajectoryPalette;
	planetRings: boolean;
	yearDots: boolean;
	yearEvery: number; // dot every N years
	sun: boolean;
}

export interface TrajectoryMeta {
	craft: number;
	points: number;
	maxAU: number;
	scale: RadialScale;
}

export interface BuiltTrajectory {
	svg: string;
	meta: TrajectoryMeta;
}

// Geometry.
const VB = 300;
const CX = VB / 2;
const CY = VB / 2;
const R = 132;

// Spectral uses each craft's own color (from the data); the rest are one ink.
const INK: Record<Exclude<TrajectoryPalette, 'spectral'>, string> = {
	aurum: '#e8c58a',
	brand: '#b79cf5',
	mono: '#e6e3da'
};

const f = (n: number) => Math.round(n * 100) / 100;

function scaleR(r: number, maxAU: number, kind: RadialScale): number {
	const t =
		kind === 'log'
			? Math.log1p(r) / Math.log1p(maxAU)
			: kind === 'sqrt'
				? Math.sqrt(r) / Math.sqrt(maxAU)
				: r / maxAU;
	return Math.min(1, t) * R;
}

function project(
	x: number,
	y: number,
	maxAU: number,
	scale: RadialScale,
	cos: number,
	sin: number
): [number, number] {
	const r = Math.hypot(x, y);
	const pr = scaleR(r, maxAU, scale);
	// Ecliptic angle, then global rotation; y flipped so north is up (math plot).
	const a0 = Math.atan2(y, x);
	const px = pr * Math.cos(a0);
	const py = pr * Math.sin(a0);
	return [CX + px * cos - py * sin, CY - (px * sin + py * cos)];
}

function inkFor(craft: Craft, palette: TrajectoryPalette): string {
	return palette === 'spectral' ? craft.color : INK[palette];
}

// Build an SVG path through the projected points. At smoothing 0 it is a straight
// polyline; above that it is a Catmull-Rom spline (interpolating, so it still
// passes through every point, including the year dots) with roundness scaled by
// `smoothing`. k = 1/6 is the classic Catmull-Rom tension.
function pathData(pts: [number, number][], smoothing: number): string {
	if (pts.length < 2) return '';
	if (smoothing <= 0) return 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L');
	const k = smoothing / 6;
	let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[i - 1] ?? pts[i];
		const p1 = pts[i];
		const p2 = pts[i + 1];
		const p3 = pts[i + 2] ?? p2;
		const c1x = p1[0] + (p2[0] - p0[0]) * k;
		const c1y = p1[1] + (p2[1] - p0[1]) * k;
		const c2x = p2[0] - (p3[0] - p1[0]) * k;
		const c2y = p2[1] - (p3[1] - p1[1]) * k;
		d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`;
	}
	return d;
}

export function buildTrajectory(opts: TrajectoryOptions): BuiltTrajectory {
	const rot = (opts.rotation * Math.PI) / 180;
	const cos = Math.cos(rot);
	const sin = Math.sin(rot);
	const w = 1.1 * opts.stroke;
	const shown = DATA.craft.filter((c) => opts.craft.includes(c.id));

	let body = '';
	let totalPoints = 0;

	// Faint planet reference rings (drawn first, behind the paths).
	if (opts.planetRings) {
		for (const p of DATA.planets) {
			if (p.a > opts.maxAU) continue;
			const pr = scaleR(p.a, opts.maxAU, opts.scale);
			body += `<circle cx="${CX}" cy="${CY}" r="${f(pr)}" fill="none" stroke="#ffffff" stroke-opacity="0.1" stroke-width="${f(w * 0.6)}"/>`;
		}
	}

	for (const c of shown) {
		const ink = inkFor(c, opts.palette);
		// Truncate the path at the crop radius (keeps the inner swirl).
		let cut = c.points.length;
		for (let i = 0; i < c.points.length; i++) {
			if (Math.hypot(c.points[i][0], c.points[i][1]) > opts.maxAU) {
				cut = i + 1; // include the crossing point so the line reaches the edge
				break;
			}
		}
		const pts = c.points.slice(0, cut);
		totalPoints += pts.length;
		if (pts.length < 2) continue;

		// Project to pixel space first, then smooth there so the radial scale can't
		// distort the spline.
		const proj = pts.map(([x, y]) => project(x, y, opts.maxAU, opts.scale, cos, sin));
		body += `<path d="${pathData(proj, opts.smoothing)}" fill="none" stroke="${ink}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`;

		// Year dots along the path (they sit exactly on the interpolating spline).
		if (opts.yearDots) {
			for (const y of c.years) {
				if (y.i >= cut) break;
				if (opts.yearEvery > 1 && y.year % opts.yearEvery !== 0) continue;
				const [px, py] = proj[y.i];
				body += `<circle cx="${f(px)}" cy="${f(py)}" r="${f(1.1 + w * 0.4)}" fill="${ink}"/>`;
			}
		}

		// A slightly larger dot at the craft's current (cropped) end.
		const [ex, ey] = proj[proj.length - 1];
		body += `<circle cx="${f(ex)}" cy="${f(ey)}" r="${f(1.6 + w * 0.5)}" fill="${ink}"/>`;
	}

	// The Sun at the origin, drawn last so it sits on top of the converging paths.
	if (opts.sun) {
		const gold = opts.palette === 'brand' ? '#d9c8ff' : '#ffe6a8';
		body += `<circle cx="${CX}" cy="${CY}" r="${f(2.4 + w * 0.4)}" fill="${gold}"/>`;
	}

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}" fill="none">${body}</svg>`;

	return {
		svg,
		meta: { craft: shown.length, points: totalPoints, maxAU: opts.maxAU, scale: opts.scale }
	};
}
