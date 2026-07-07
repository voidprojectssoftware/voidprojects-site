// Generative logo engine: deterministic, DOM-free, and self-contained. Given a
// seed and a set of options it returns a standalone SVG string (colors inlined,
// so the same string renders in a tile and exports to a .svg file untouched)
// plus a metadata record describing what was drawn. The visual language is thin
// strokes, a geometric frame, and a constellation — a graph of stars.
//
// Stars are placed on the golden angle (137.5°) by default, so the point field
// carries the phyllotaxis spacing the eye reads as "natural". Constellations are
// drawn three ways: fitted from a small library of real sky asterisms, as the
// minimum spanning tree over the brightest stars, or as a nearest-neighbour path.

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // 137.507°, the phyllotaxis angle

export type Palette = 'brand' | 'aurum' | 'argent' | 'nebula' | 'ember';

export type FrameKind =
	| 'diamond'
	| 'circle'
	| 'hex'
	| 'triangle'
	| 'diamondDouble'
	| 'vesica'
	| 'octagon'
	| 'arch'
	| 'rings'
	| 'compass'
	| 'brackets'
	| 'none';

// Every frame a "surprise me" tile is allowed to roll. `none` and the busier
// frames are included but the picker weights toward the cleaner shapes below.
export const FRAME_KINDS: FrameKind[] = [
	'diamond',
	'circle',
	'hex',
	'triangle',
	'diamondDouble',
	'vesica',
	'octagon',
	'arch',
	'rings',
	'compass',
	'brackets',
	'none'
];

export interface PaletteSpec {
	stroke: string; // frame + constellation lines
	bright: string; // filled bright-star dots
	faint: string; // scattered background stars
	planet: string; // the planet ring
}

export const PALETTES: Record<Palette, PaletteSpec> = {
	// The site's violet identity, so a mark can be previewed in brand color.
	brand: {
		stroke: '#b79cf5',
		bright: '#e6dcff',
		faint: 'rgba(183,156,245,0.42)',
		planet: 'rgba(183,156,245,0.9)'
	},
	aurum: {
		stroke: '#e8c58a',
		bright: '#fbe7be',
		faint: 'rgba(232,197,138,0.42)',
		planet: 'rgba(232,197,138,0.9)'
	},
	argent: {
		stroke: '#d8dee9',
		bright: '#f5f8fc',
		faint: 'rgba(216,222,233,0.42)',
		planet: 'rgba(216,222,233,0.9)'
	},
	nebula: {
		stroke: '#8fd8e8',
		bright: '#d6f4fb',
		faint: 'rgba(143,216,232,0.42)',
		planet: 'rgba(143,216,232,0.9)'
	},
	ember: {
		stroke: '#e79a72',
		bright: '#fbd3ba',
		faint: 'rgba(231,154,114,0.42)',
		planet: 'rgba(231,154,114,0.9)'
	}
};

export interface LogoOptions {
	density: number; // star-count multiplier (~0.5–1.6)
	stroke: number; // stroke-weight multiplier (~0.6–1.8)
	frame: FrameKind | 'random'; // fixed frame, or a per-seed roll
	palette: Palette;
	wordmark: boolean;
	wordmarkText: string;
}

export interface LogoMeta {
	seed: number;
	frame: FrameKind;
	constellation: string; // template name, or 'mst' / 'path'
	placement: string; // point-field strategy
	stars: number;
	bright: number;
	planet: boolean;
}

export interface BuiltLogo {
	svg: string;
	meta: LogoMeta;
}

// --- deterministic RNG ------------------------------------------------------
// mulberry32: tiny seeded PRNG so a given seed always reproduces a given mark
// (the whole point of showing seeds in the UI). Not cryptographic.
function mulberry32(seed: number): () => number {
	let a = seed | 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const f = (x: number) => Math.round(x * 100) / 100;
const pick = <T>(rnd: () => number, arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];

// --- geometry constants -----------------------------------------------------
const CX = 120;
const CY = 124;
const R = 60; // content radius; frames pad out beyond this

interface Pt {
	x: number;
	y: number;
}

// --- real-sky constellation templates ---------------------------------------
// Iconic line figures in a rough local coordinate box (y down). Not to scale;
// chosen for recognizable silhouette. Normalized on use so each fits the frame.
interface Template {
	name: string;
	pts: [number, number][];
	edges: [number, number][];
}

const TEMPLATES: Template[] = [
	{
		name: 'ursa major',
		pts: [
			[0.0, 0.0], // Dubhe
			[0.05, 0.85], // Merak
			[0.95, 0.98], // Phecda
			[0.9, 0.32], // Megrez
			[1.65, 0.22], // Alioth
			[2.4, 0.16], // Mizar
			[3.1, -0.16] // Alkaid
		],
		edges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 0],
			[3, 4],
			[4, 5],
			[5, 6]
		]
	},
	{
		name: 'orion',
		pts: [
			[0.15, 0.15], // Betelgeuse
			[1.3, 0.0], // Bellatrix
			[0.55, 1.0], // Alnitak
			[0.9, 1.1], // Alnilam
			[1.25, 1.2], // Mintaka
			[0.5, 2.05], // Saiph
			[1.55, 2.15] // Rigel
		],
		edges: [
			[0, 1],
			[0, 2],
			[1, 4],
			[2, 3],
			[3, 4],
			[2, 5],
			[4, 6],
			[5, 6]
		]
	},
	{
		name: 'cassiopeia',
		pts: [
			[0.0, 0.05],
			[0.55, 0.6],
			[1.05, 0.12],
			[1.6, 0.68],
			[2.15, 0.05]
		],
		edges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4]
		]
	},
	{
		name: 'lyra',
		pts: [
			[0.35, 0.0], // Vega
			[0.0, 0.6],
			[0.6, 0.72],
			[0.72, 1.4],
			[0.12, 1.28]
		],
		edges: [
			[0, 1],
			[0, 2],
			[1, 4],
			[2, 3],
			[3, 4]
		]
	},
	{
		name: 'crux',
		pts: [
			[0.5, 0.0],
			[0.55, 1.4],
			[0.0, 0.72],
			[1.05, 0.78]
		],
		edges: [
			[0, 1],
			[2, 3]
		]
	},
	{
		name: 'triangulum',
		pts: [
			[0.0, 0.0],
			[1.25, 0.22],
			[0.5, 1.05]
		],
		edges: [
			[0, 1],
			[1, 2],
			[2, 0]
		]
	},
	{
		name: 'corvus',
		pts: [
			[0.0, 0.0],
			[0.85, 0.12],
			[1.02, 0.95],
			[0.16, 0.82]
		],
		edges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 0]
		]
	}
];

// Center a template on its centroid, scale so its farthest star sits at radius
// `radius`, then rotate/flip. Keeps the silhouette but lets it fill the frame at
// any orientation.
function fitTemplate(t: Template, radius: number, rot: number, flip: boolean): Pt[] {
	let cx = 0;
	let cy = 0;
	for (const [x, y] of t.pts) {
		cx += x;
		cy += y;
	}
	cx /= t.pts.length;
	cy /= t.pts.length;

	let maxR = 1e-6;
	for (const [x, y] of t.pts) maxR = Math.max(maxR, Math.hypot(x - cx, y - cy));
	const s = radius / maxR;
	const cos = Math.cos(rot);
	const sin = Math.sin(rot);

	return t.pts.map(([x, y]) => {
		const dx = (x - cx) * s * (flip ? -1 : 1);
		const dy = (y - cy) * s;
		const rx = dx * cos - dy * sin;
		const ry = dx * sin + dy * cos;
		return { x: CX + rx, y: CY + ry };
	});
}

// --- generated point fields (unit disk) -------------------------------------
type Placement = 'phyllotaxis' | 'relaxed' | 'spiral' | 'ring';

function placePoints(kind: Placement, n: number, rnd: () => number): Pt[] {
	const pts: Pt[] = [];
	if (kind === 'phyllotaxis') {
		for (let i = 0; i < n; i++) {
			const r = Math.sqrt((i + 0.5) / n);
			const a = i * GOLDEN_ANGLE + rnd() * 0.5;
			pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
		}
	} else if (kind === 'spiral') {
		const turns = 2.4 + rnd() * 1.6;
		for (let i = 0; i < n; i++) {
			const t = i / n;
			const a = t * turns * 2 * Math.PI;
			const r = Math.pow(t, 0.62);
			pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
		}
	} else if (kind === 'ring') {
		const ringN = Math.max(5, Math.round(n * 0.7));
		for (let i = 0; i < ringN; i++) {
			const a = (i / ringN) * 2 * Math.PI + rnd() * 0.2;
			const r = 0.72 + (rnd() - 0.5) * 0.16;
			pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
		}
		for (let i = ringN; i < n; i++) {
			const a = rnd() * 2 * Math.PI;
			const r = rnd() * 0.4;
			pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
		}
	} else {
		// relaxed: random disk, then a few passes of mutual repulsion so no two
		// stars clump — a cheap Poisson-ish spread.
		for (let i = 0; i < n; i++) {
			const a = rnd() * 2 * Math.PI;
			const r = Math.sqrt(rnd());
			pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
		}
		for (let it = 0; it < 10; it++) {
			for (let i = 0; i < pts.length; i++) {
				let fx = 0;
				let fy = 0;
				for (let j = 0; j < pts.length; j++) {
					if (i === j) continue;
					const dx = pts[i].x - pts[j].x;
					const dy = pts[i].y - pts[j].y;
					const d2 = dx * dx + dy * dy + 1e-4;
					if (d2 < 0.16) {
						const inv = 0.006 / d2;
						fx += dx * inv;
						fy += dy * inv;
					}
				}
				pts[i].x += fx;
				pts[i].y += fy;
				const rr = Math.hypot(pts[i].x, pts[i].y);
				if (rr > 1) {
					pts[i].x /= rr;
					pts[i].y /= rr;
				}
			}
		}
	}
	return pts;
}

// Farthest-point sampling: a well-spread subset that reads as an intentional
// constellation rather than a random cluster.
function pickBright(pts: Pt[], m: number, rnd: () => number): number[] {
	const idx = [Math.floor(rnd() * pts.length)];
	while (idx.length < m && idx.length < pts.length) {
		let best = -1;
		let bestD = -1;
		for (let i = 0; i < pts.length; i++) {
			if (idx.includes(i)) continue;
			let dmin = Infinity;
			for (const k of idx) {
				const dx = pts[i].x - pts[k].x;
				const dy = pts[i].y - pts[k].y;
				dmin = Math.min(dmin, dx * dx + dy * dy);
			}
			if (dmin > bestD) {
				bestD = dmin;
				best = i;
			}
		}
		if (best < 0) break;
		idx.push(best);
	}
	return idx;
}

// Prim's MST over the bright stars → an organic connected tree, no crossings.
function mstEdges(nodes: Pt[]): [number, number][] {
	const edges: [number, number][] = [];
	const n = nodes.length;
	if (n < 2) return edges;
	const inTree = [0];
	const out = Array.from({ length: n - 1 }, (_, i) => i + 1);
	while (out.length) {
		let bi = -1;
		let bj = -1;
		let bd = Infinity;
		for (const i of inTree) {
			for (const j of out) {
				const dx = nodes[i].x - nodes[j].x;
				const dy = nodes[i].y - nodes[j].y;
				const d = dx * dx + dy * dy;
				if (d < bd) {
					bd = d;
					bi = i;
					bj = j;
				}
			}
		}
		edges.push([bi, bj]);
		inTree.push(bj);
		out.splice(out.indexOf(bj), 1);
	}
	return edges;
}

// Nearest-neighbour open path from an extreme star → a single flowing line, the
// way an eye traces a real asterism. One optional fork keeps it from being a
// plain zig-zag.
function pathEdges(nodes: Pt[], rnd: () => number): [number, number][] {
	const n = nodes.length;
	if (n < 2) return [];
	let start = 0;
	for (let i = 1; i < n; i++) if (nodes[i].x < nodes[start].x) start = i;

	const visited = new Set([start]);
	const order = [start];
	let cur = start;
	while (visited.size < n) {
		let best = -1;
		let bd = Infinity;
		for (let j = 0; j < n; j++) {
			if (visited.has(j)) continue;
			const dx = nodes[cur].x - nodes[j].x;
			const dy = nodes[cur].y - nodes[j].y;
			const d = dx * dx + dy * dy;
			if (d < bd) {
				bd = d;
				best = j;
			}
		}
		visited.add(best);
		order.push(best);
		cur = best;
	}

	const edges: [number, number][] = [];
	for (let i = 0; i < order.length - 1; i++) edges.push([order[i], order[i + 1]]);

	// Optional fork: connect a mid-path star to a non-adjacent one, making a branch.
	if (n >= 5 && rnd() < 0.6) {
		const a = 1 + Math.floor(rnd() * (n - 2));
		let b = -1;
		let bd = Infinity;
		for (let j = 0; j < n; j++) {
			if (Math.abs(j - a) <= 1) continue;
			const dx = nodes[order[a]].x - nodes[order[j]].x;
			const dy = nodes[order[a]].y - nodes[order[j]].y;
			const d = dx * dx + dy * dy;
			if (d < bd) {
				bd = d;
				b = j;
			}
		}
		if (b >= 0) edges.push([order[a], order[b]]);
	}
	return edges;
}

// --- frames -----------------------------------------------------------------
function polygon(n: number, radius: number, rot: number): string {
	const pts: string[] = [];
	for (let i = 0; i < n; i++) {
		const a = rot + (i / n) * 2 * Math.PI;
		pts.push(`${f(CX + radius * Math.cos(a))},${f(CY + radius * Math.sin(a))}`);
	}
	return pts.join(' ');
}

function framePath(frame: FrameKind, s: string, w: number): string {
	const line = `fill="none" stroke="${s}" stroke-width="${f(w)}"`;
	const thin = `fill="none" stroke="${s}" stroke-width="${f(w * 0.7)}"`;
	switch (frame) {
		case 'diamond':
		case 'diamondDouble': {
			const wx = R + 16;
			const hy = R + 30;
			const outer = `${CX},${f(CY - hy)} ${f(CX + wx)},${CY} ${CX},${f(CY + hy)} ${f(CX - wx)},${CY}`;
			let out = `<polygon points="${outer}" ${line}/>`;
			if (frame === 'diamondDouble') {
				const inner = `${CX},${f(CY - hy + 9)} ${f(CX + wx - 9)},${CY} ${CX},${f(CY + hy - 9)} ${f(CX - wx + 9)},${CY}`;
				out += `<polygon points="${inner}" ${thin} opacity="0.55"/>`;
			}
			return out;
		}
		case 'circle':
			return `<circle cx="${CX}" cy="${CY}" r="${R + 18}" ${line}/>`;
		case 'rings':
			return (
				`<circle cx="${CX}" cy="${CY}" r="${R + 20}" ${line}/>` +
				`<circle cx="${CX}" cy="${CY}" r="${R + 12}" ${thin} opacity="0.5"/>`
			);
		case 'compass': {
			const rr = R + 18;
			let out = `<circle cx="${CX}" cy="${CY}" r="${rr}" ${line}/>`;
			// N/E/S/W ticks straddling the ring.
			const ticks: [number, number][] = [
				[0, -1],
				[1, 0],
				[0, 1],
				[-1, 0]
			];
			for (const [dx, dy] of ticks) {
				out += `<line x1="${f(CX + dx * (rr - 5))}" y1="${f(CY + dy * (rr - 5))}" x2="${f(CX + dx * (rr + 5))}" y2="${f(CY + dy * (rr + 5))}" stroke="${s}" stroke-width="${f(w)}" stroke-linecap="round"/>`;
			}
			return out;
		}
		case 'hex':
			return `<polygon points="${polygon(6, R + 20, -Math.PI / 2)}" ${line}/>`;
		case 'octagon':
			return `<polygon points="${polygon(8, R + 18, -Math.PI / 2 + Math.PI / 8)}" ${line}/>`;
		case 'triangle':
			return `<polygon points="${polygon(3, R + 26, -Math.PI / 2)}" ${line}/>`;
		case 'vesica': {
			// A pointed vertical lens, drawn as two mirrored quadratic arcs.
			const wx = R + 8;
			const hy = R + 26;
			const d = `M ${CX} ${f(CY - hy)} Q ${f(CX + wx)} ${CY} ${CX} ${f(CY + hy)} Q ${f(CX - wx)} ${CY} ${CX} ${f(CY - hy)} Z`;
			return `<path d="${d}" ${line}/>`;
		}
		case 'arch': {
			// Observatory dome: a semicircle over straight jambs and a baseline.
			const halfW = R + 16;
			const bottom = CY + R + 24;
			const shoulder = CY - 4;
			const d =
				`M ${f(CX - halfW)} ${f(bottom)} L ${f(CX - halfW)} ${f(shoulder)} ` +
				`A ${halfW} ${halfW} 0 0 1 ${f(CX + halfW)} ${f(shoulder)} ` +
				`L ${f(CX + halfW)} ${f(bottom)} Z`;
			return `<path d="${d}" ${line}/>`;
		}
		case 'brackets': {
			// Four corner brackets around a square — the lightest possible frame.
			const h = R + 20;
			const len = 16;
			const corners: [number, number][] = [
				[-1, -1],
				[1, -1],
				[1, 1],
				[-1, 1]
			];
			let out = '';
			for (const [sx, sy] of corners) {
				const x = CX + sx * h;
				const y = CY + sy * h;
				out +=
					`<path d="M ${f(x - sx * len)} ${f(y)} L ${f(x)} ${f(y)} L ${f(x)} ${f(y - sy * len)}" ` +
					`fill="none" stroke="${s}" stroke-width="${f(w)}" stroke-linecap="round"/>`;
			}
			return out;
		}
		case 'none':
		default:
			return '';
	}
}

function escapeXml(s: string): string {
	return s.replace(
		/[<>&'"]/g,
		(c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!
	);
}

// --- the build --------------------------------------------------------------
export function buildLogo(seed: number, opts: LogoOptions): BuiltLogo {
	const rnd = mulberry32(seed);
	const pal = PALETTES[opts.palette];
	const w = 1.15 * opts.stroke;

	const frame: FrameKind =
		opts.frame === 'random'
			? // Weight toward the clean, iconic frames; keep the busier ones rarer.
				pick(rnd, [
					'diamond',
					'diamond',
					'circle',
					'circle',
					'hex',
					'triangle',
					'vesica',
					'octagon',
					'diamondDouble',
					'arch',
					'rings',
					'compass',
					'brackets',
					'none'
				] as FrameKind[])
			: opts.frame;

	// Pick a constellation style: a real asterism, a spanning tree, or a path.
	const style = pick(rnd, ['template', 'template', 'mst', 'path'] as const);
	const placement = pick(rnd, ['phyllotaxis', 'relaxed', 'spiral', 'ring'] as Placement[]);

	let bright: Pt[];
	let edges: [number, number][];
	let constellation: string;
	let faint: Pt[];

	if (style === 'template') {
		const t = pick(rnd, TEMPLATES);
		bright = fitTemplate(t, R * 0.78, rnd() * Math.PI * 2, rnd() < 0.5);
		edges = t.edges;
		constellation = t.name;
		// Scatter a few background stars around the asterism.
		const bg = Math.max(6, Math.round(14 * opts.density));
		faint = placePoints('relaxed', bg, rnd).map((p) => ({
			x: CX + p.x * R * 0.92,
			y: CY + p.y * R * 0.92
		}));
	} else {
		let n = Math.round((16 + rnd() * 22) * opts.density);
		n = Math.max(11, Math.min(46, n));
		const unit = placePoints(placement, n, rnd);
		const pts = unit.map((p) => ({ x: CX + p.x * R * 0.9, y: CY + p.y * R * 0.9 }));
		const m = Math.min(pts.length, 5 + Math.floor(rnd() * 4));
		const brightIdx = pickBright(pts, m, rnd);
		const brightSet = new Set(brightIdx);
		bright = brightIdx.map((i) => pts[i]);
		edges = style === 'mst' ? mstEdges(bright) : pathEdges(bright, rnd);
		constellation = style;
		faint = pts.filter((_, i) => !brightSet.has(i));
	}

	// --- draw, back to front ---
	let body = '';

	// Planet ring, centered between the constellation's centroid and one of its
	// stars (a touch of asymmetry, like the reference).
	const hasPlanet = rnd() < 0.6;
	if (hasPlanet && bright.length) {
		let px = 0;
		let py = 0;
		for (const b of bright) {
			px += b.x;
			py += b.y;
		}
		px /= bright.length;
		py /= bright.length;
		const anchor = bright[Math.floor(rnd() * bright.length)];
		px = (px * 2 + anchor.x) / 3;
		py = (py * 2 + anchor.y) / 3;
		const pr = R * (0.42 + rnd() * 0.24);
		body += `<circle cx="${f(px)}" cy="${f(py)}" r="${f(pr)}" fill="none" stroke="${pal.planet}" stroke-width="${f(w * 0.9)}"/>`;
		if (rnd() < 0.4) {
			body += `<circle cx="${f(px)}" cy="${f(py)}" r="${f(pr * 1.32)}" fill="none" stroke="${pal.faint}" stroke-width="${f(w * 0.6)}" stroke-dasharray="1 5"/>`;
		}
	}

	// Faint background stars.
	for (const p of faint) {
		const rr = 0.6 + rnd() * 0.9;
		body += `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(rr)}" fill="${pal.faint}"/>`;
	}

	// Constellation lines.
	for (const [a, b] of edges) {
		if (!bright[a] || !bright[b]) continue;
		body += `<line x1="${f(bright[a].x)}" y1="${f(bright[a].y)}" x2="${f(bright[b].x)}" y2="${f(bright[b].y)}" stroke="${pal.stroke}" stroke-width="${f(w)}" stroke-linecap="round"/>`;
	}

	// Bright nodes, one with a small sparkle cross.
	const sparkle = Math.floor(rnd() * bright.length);
	bright.forEach((b, i) => {
		const rr = 1.9 + rnd() * 1.7;
		body += `<circle cx="${f(b.x)}" cy="${f(b.y)}" r="${f(rr)}" fill="${pal.bright}"/>`;
		if (i === sparkle) {
			const l = rr + 4.5;
			body +=
				`<g stroke="${pal.bright}" stroke-width="${f(w * 0.6)}" stroke-linecap="round">` +
				`<line x1="${f(b.x - l)}" y1="${f(b.y)}" x2="${f(b.x + l)}" y2="${f(b.y)}"/>` +
				`<line x1="${f(b.x)}" y1="${f(b.y - l)}" x2="${f(b.x)}" y2="${f(b.y + l)}"/></g>`;
		}
	});

	const frameSvg = framePath(frame, pal.stroke, w);

	const showWord = opts.wordmark && opts.wordmarkText.trim().length > 0;
	const height = showWord ? 300 : 268;
	const wordmark = showWord
		? `<text x="${CX}" y="266" text-anchor="middle" fill="${pal.stroke}" ` +
			`font-family="Helvetica Neue, Arial, sans-serif" font-size="17" letter-spacing="5.2" ` +
			`font-weight="300">${escapeXml(opts.wordmarkText.trim().toUpperCase())}</text>`
		: '';

	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 ${height}" ` +
		`fill="none">${frameSvg}${body}${wordmark}</svg>`;

	return {
		svg,
		meta: {
			seed,
			frame,
			constellation,
			placement: style === 'template' ? 'template' : placement,
			stars: bright.length + faint.length,
			bright: bright.length,
			planet: hasPlanet
		}
	};
}

// Stable per-tile seed from a base seed and index, so a wall of tiles is fully
// reproducible from one base value.
export function seedFor(base: number, index: number): number {
	const rnd = mulberry32((base + index * 2654435761) | 0);
	return (rnd() * 1e9) | 0;
}
