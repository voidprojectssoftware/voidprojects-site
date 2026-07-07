// Generative logo engine rooted in real spacecraft trajectories. A raw plot of
// the paths is not a logo; this turns the data into candidate MARKS by abstracting
// it: take one probe's real path, window a segment of it, project it through a
// radial scale, then replicate it with rotational (and optional mirror) symmetry
// around the Sun into a balanced emblem, optionally framed and set on a backing
// shape. DOM-free; returns a standalone, exportable SVG string.
//
// Two layers: deriveSpec(seed, globals) rolls a full explicit TLSpec from a seed
// (this is the brute-force search); renderSpec(spec) draws a spec with no
// randomness. The gallery derives specs from seeds; the per-mark editor hands a
// spec straight to renderSpec so every knob is adjustable. The derivation's RNG
// draw order is fixed, so a given seed always yields the same mark.

import { DATA, type TrajectoryCraft } from './trajectory-data.js';

export type TLPalette = 'brand' | 'aurum' | 'argent' | 'mono' | 'spectral' | 'duo';
export type TLScale = 'linear' | 'sqrt' | 'log';
export type TLFrame = 'none' | 'circle' | 'ring' | 'hex' | 'diamond';
export type TLSymmetry = 'mixed' | 'emblem' | 'single';
export type TLSegment = 'full' | 'inner' | 'outer' | 'mid';
export type TLStyle = 'line' | 'lineDots' | 'dots';
export type TLBgShape = 'none' | 'rect' | 'rounded' | 'circle' | 'hex' | 'diamond';
export type TLBgFill = string; // 'none' for transparent, otherwise any CSS color

export interface TLBackground {
	shape: TLBgShape;
	size: number; // fraction of the 240 viewBox; 1 = full, >1 bleeds off-edge
	fill: TLBgFill;
}

// A fully explicit description of one mark — everything the renderer needs.
export interface TLSpec {
	craftId: string;
	scale: TLScale;
	reach: number; // crop radius in AU
	segment: TLSegment;
	order: number; // rotational symmetry (1 = single arm)
	mirror: boolean;
	rotationDeg: number; // global rotation of the emblem
	smoothing: number; // 0 = polyline, 1 ≈ Catmull-Rom, up to 1.5 rounder
	style: TLStyle;
	stroke: number; // weight multiplier
	palette: TLPalette;
	frame: TLFrame; // stroked outline
	sun: boolean;
	bg: TLBackground; // filled backing shape
}

// Globals shared across a gallery; the rest of a spec is rolled from the seed.
export interface TLGlobals {
	stroke: number;
	palette: TLPalette;
	frameMode: TLFrame | 'random';
	symmetry: TLSymmetry;
	pool: string[]; // craft ids allowed as source arms
}

export interface TLMeta {
	craft: string;
	symmetry: number;
	mirror: boolean;
	scale: TLScale;
	reach: number;
	segment: TLSegment;
	frame: TLFrame;
}
export interface BuiltTL {
	svg: string;
	meta: TLMeta;
}

// --- deterministic RNG ---
function mulberry32(seed: number): () => number {
	let a = seed | 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const f = (n: number) => Math.round(n * 100) / 100;
function weighted<T>(rnd: () => number, table: [T, number][]): T {
	const total = table.reduce((s, [, w]) => s + w, 0);
	let r = rnd() * total;
	for (const [v, w] of table) {
		if ((r -= w) < 0) return v;
	}
	return table[table.length - 1][0];
}

// --- geometry ---
const VB = 240;
const C = VB / 2;
const R = 96; // content radius

const INK: Record<Exclude<TLPalette, 'spectral'>, string> = {
	brand: '#b79cf5',
	aurum: '#e8c58a',
	argent: '#d8dee9',
	mono: '#e6e3da',
	duo: '#b79cf5'
};
const DUO_B = '#e8c58a';

const craftById = (id: string): TrajectoryCraft =>
	DATA.craft.find((c) => c.id === id) ?? DATA.craft[0];

function scaleR(r: number, reach: number, kind: TLScale): number {
	const t =
		kind === 'log'
			? Math.log1p(r) / Math.log1p(reach)
			: kind === 'sqrt'
				? Math.sqrt(r) / Math.sqrt(reach)
				: r / reach;
	return Math.min(1, t) * R;
}

function smoothPath(pts: [number, number][], smoothing: number): string {
	if (pts.length < 2) return '';
	if (smoothing <= 0) return 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L');
	const k = smoothing / 6;
	let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[i - 1] ?? pts[i];
		const p1 = pts[i];
		const p2 = pts[i + 1];
		const p3 = pts[i + 2] ?? p2;
		d +=
			`C${f(p1[0] + (p2[0] - p0[0]) * k)} ${f(p1[1] + (p2[1] - p0[1]) * k)} ` +
			`${f(p2[0] - (p3[0] - p1[0]) * k)} ${f(p2[1] - (p3[1] - p1[1]) * k)} ${f(p2[0])} ${f(p2[1])}`;
	}
	return d;
}

function polygonPoints(sides: number, radius: number, rotDeg: number): string {
	const pts = [];
	for (let i = 0; i < sides; i++) {
		const a = (rotDeg * Math.PI) / 180 + (i / sides) * 2 * Math.PI;
		pts.push(`${f(C + radius * Math.cos(a))},${f(C + radius * Math.sin(a))}`);
	}
	return pts.join(' ');
}

function framePath(frame: TLFrame, ink: string, w: number): string {
	const line = `fill="none" stroke="${ink}" stroke-width="${f(w)}"`;
	switch (frame) {
		case 'circle':
			return `<circle cx="${C}" cy="${C}" r="${R + 10}" ${line}/>`;
		case 'ring':
			return (
				`<circle cx="${C}" cy="${C}" r="${R + 12}" ${line}/>` +
				`<circle cx="${C}" cy="${C}" r="${R + 5}" fill="none" stroke="${ink}" stroke-width="${f(w * 0.6)}" opacity="0.5"/>`
			);
		case 'hex':
			return `<polygon points="${polygonPoints(6, R + 12, -90)}" ${line}/>`;
		case 'diamond': {
			const wx = R + 8;
			const hy = R + 18;
			return `<polygon points="${C},${f(C - hy)} ${f(C + wx)},${C} ${C},${f(C + hy)} ${f(C - wx)},${C}" ${line}/>`;
		}
		default:
			return '';
	}
}

function backgroundSvg(bg: TLBackground): string {
	if (bg.shape === 'none' || !bg.fill || bg.fill === 'none') return '';
	const fill = bg.fill;
	const half = bg.size * 120;
	switch (bg.shape) {
		case 'rect':
			return `<rect x="${f(C - half)}" y="${f(C - half)}" width="${f(half * 2)}" height="${f(half * 2)}" fill="${fill}"/>`;
		case 'rounded':
			return `<rect x="${f(C - half)}" y="${f(C - half)}" width="${f(half * 2)}" height="${f(half * 2)}" rx="${f(half * 0.22)}" fill="${fill}"/>`;
		case 'circle':
			return `<circle cx="${C}" cy="${C}" r="${f(half)}" fill="${fill}"/>`;
		case 'hex':
			return `<polygon points="${polygonPoints(6, half, -90)}" fill="${fill}"/>`;
		case 'diamond':
			return `<polygon points="${polygonPoints(4, half, -90)}" fill="${fill}"/>`;
		default:
			return '';
	}
}

function windowSlice(pts: [number, number][], mode: TLSegment): [number, number][] {
	const n = pts.length;
	const span = (a: number, b: number) =>
		pts.slice(Math.floor(a * n), Math.max(Math.floor(b * n), Math.floor(a * n) + 2));
	switch (mode) {
		case 'inner':
			return span(0, 0.5);
		case 'outer':
			return span(0.32, 1);
		case 'mid':
			return span(0.2, 0.82);
		default:
			return pts;
	}
}

// Roll a full spec from a seed + globals. RNG draw order is fixed so a seed maps
// to a stable mark; new fields (smoothing, bg) are constants that consume no draw.
export function deriveSpec(seed: number, g: TLGlobals): TLSpec {
	const rnd = mulberry32(seed);
	const pool = DATA.craft.filter((c) => g.pool.includes(c.id));
	const craft = pool.length ? pool[Math.floor(rnd() * pool.length)] : DATA.craft[0];
	const last = craft.points[craft.points.length - 1];
	const craftMaxR = Math.hypot(last[0], last[1]);

	const scale = weighted<TLScale>(rnd, [
		['log', 3],
		['sqrt', 2],
		['linear', 2]
	]);
	const zoom = rnd();
	const reach = Math.max(6, Math.round(8 + zoom * (craftMaxR - 8)));
	const segment = weighted<TLSegment>(rnd, [
		['full', 3],
		['inner', 2],
		['outer', 2],
		['mid', 1]
	]);
	const order =
		g.symmetry === 'single'
			? 1
			: g.symmetry === 'emblem'
				? weighted(rnd, [
						[3, 2],
						[4, 3],
						[5, 3],
						[6, 3],
						[8, 2]
					])
				: weighted(rnd, [
						[1, 1],
						[2, 2],
						[3, 3],
						[4, 3],
						[5, 2],
						[6, 2],
						[8, 1]
					]);
	const mirror = order <= 4 && rnd() < 0.35;
	const rotationDeg = rnd() * (360 / order);
	const style = weighted<TLStyle>(rnd, [
		['line', 4],
		['lineDots', 2],
		['dots', 1]
	]);
	const frame: TLFrame =
		g.frameMode === 'random'
			? weighted<TLFrame>(rnd, [
					['none', 3],
					['circle', 3],
					['ring', 2],
					['hex', 2],
					['diamond', 2]
				])
			: g.frameMode;
	const sun = order >= 3 && rnd() < 0.7;

	return {
		craftId: craft.id,
		scale,
		reach,
		segment,
		order,
		mirror,
		rotationDeg,
		smoothing: 1,
		style,
		stroke: g.stroke,
		palette: g.palette,
		frame,
		sun,
		bg: { shape: 'none', size: 1, fill: 'none' }
	};
}

export function renderSpec(spec: TLSpec): BuiltTL {
	const craft = craftById(spec.craftId);
	const w = 1.1 * spec.stroke;
	const rot = (spec.rotationDeg * Math.PI) / 180;

	// Crop the arm to the reach, then window a segment of that.
	let cut = craft.points.length;
	for (let i = 0; i < craft.points.length; i++) {
		if (Math.hypot(craft.points[i][0], craft.points[i][1]) > spec.reach) {
			cut = i + 1;
			break;
		}
	}
	const windowed = windowSlice(craft.points.slice(0, cut), spec.segment);
	const proj = windowed.map(([x, y]) => {
		const r = Math.hypot(x, y);
		const pr = scaleR(r, spec.reach, spec.scale);
		const a = Math.atan2(y, x) + rot;
		return [C + pr * Math.cos(a), C - pr * Math.sin(a)] as [number, number];
	});

	let fragment = '';
	if (spec.style !== 'dots') {
		fragment += `<path d="${smoothPath(proj, spec.smoothing)}" fill="none" stroke="currentColor" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`;
	}
	if (spec.style !== 'line') {
		const step = Math.max(1, Math.round(proj.length / 10));
		for (let i = 0; i < proj.length; i += step) {
			fragment += `<circle cx="${f(proj[i][0])}" cy="${f(proj[i][1])}" r="${f(1 + w * 0.35)}" fill="currentColor"/>`;
		}
	}
	if (proj.length) {
		const tip = proj[proj.length - 1];
		fragment += `<circle cx="${f(tip[0])}" cy="${f(tip[1])}" r="${f(1.6 + w * 0.45)}" fill="currentColor"/>`;
	}

	const fid = `a${Math.abs(Math.round(spec.rotationDeg * 1000) + spec.order * 7 + spec.reach).toString(36)}`;
	const ink = spec.palette === 'spectral' ? craft.color : INK[spec.palette];

	const copies: { deg: number; mirror: boolean }[] = [];
	for (let i = 0; i < spec.order; i++) copies.push({ deg: (360 / spec.order) * i, mirror: false });
	if (spec.mirror)
		for (let i = 0; i < spec.order; i++) copies.push({ deg: (360 / spec.order) * i, mirror: true });

	let uses = '';
	copies.forEach((cp, i) => {
		const color = spec.palette === 'duo' ? (i % 2 ? DUO_B : INK.brand) : ink;
		const t = cp.mirror
			? `rotate(${f(cp.deg)} ${C} ${C}) translate(${VB} 0) scale(-1 1)`
			: `rotate(${f(cp.deg)} ${C} ${C})`;
		uses += `<use href="#${fid}" transform="${t}" style="color:${color}"/>`;
	});

	const sun = spec.sun
		? `<circle cx="${C}" cy="${C}" r="${f(2.2 + w * 0.4)}" fill="${spec.palette === 'brand' || spec.palette === 'duo' ? '#e6dcff' : '#ffe6a8'}"/>`
		: '';
	const frameSvg = spec.frame === 'none' ? '' : framePath(spec.frame, ink, w);

	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}" fill="none">` +
		`${backgroundSvg(spec.bg)}` +
		`<defs><g id="${fid}">${fragment}</g></defs>` +
		`${frameSvg}${uses}${sun}</svg>`;

	return {
		svg,
		meta: {
			craft: craft.name,
			symmetry: spec.order,
			mirror: spec.mirror,
			scale: spec.scale,
			reach: spec.reach,
			segment: spec.segment,
			frame: spec.frame
		}
	};
}

export function buildTrajectoryLogo(seed: number, g: TLGlobals): BuiltTL {
	return renderSpec(deriveSpec(seed, g));
}

// Stable per-tile seed from a base seed and index (matches the constellation lab).
export function seedFor(base: number, index: number): number {
	const rnd = mulberry32((base + index * 2654435761) | 0);
	return (rnd() * 1e9) | 0;
}
