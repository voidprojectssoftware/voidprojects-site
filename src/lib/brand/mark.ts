// The randomly rolled Void Projects orbit mark: a bold, monochromatic emblem from
// the trajectory logo generator (line style, transparent, no frame). DOM-free so
// the same recipe backs the browser favicon ({@link generateFaviconSvg}) and the
// /api/mark.svg endpoint that client-site footers embed.
import { armDetail, deriveSpec, renderSpec, seedFor, type TLSpec } from './labs/trajectory-logo.js';
import { CRAFT_IDS } from '$lib/trajectory';

// Bolder than the lab's UI max (2) on purpose: the mark renders at favicon and
// footer-badge sizes, where the fine trajectory lines need weight to survive.
const MARK_STROKE = 10;

// Weak rolls read as a dot or a filled disc at small sizes: the arm stays near the
// center, or coils so densely within its reach that the thick stroke fills it in.
// Tuned on a 4,000-seed contact sheet; about 70% of rolls pass.
const MIN_EXTENT = 0.65; // fraction of the content radius the arm must reach
const MIN_LENGTH = 0.35; // arm path length, same units; below this it's a fleck
const MAX_DENSITY = 16; // length / extent², i.e. ink per unit of covered area
const MAX_ROLLS = 24;

function quality({ extent, length }: { extent: number; length: number }): number {
	const density = length / (extent * extent);
	return Math.min(extent / MIN_EXTENT, length / MIN_LENGTH, MAX_DENSITY / density);
}

export function markSpec(seed: number, ink?: string): TLSpec {
	const spec = deriveSpec(seed, {
		stroke: MARK_STROKE,
		palette: 'brand',
		ink,
		frameMode: 'none',
		symmetry: 'emblem',
		pool: CRAFT_IDS
	});
	spec.style = 'line';
	spec.sun = false;
	return spec;
}

// `ink` is any CSS color; callers bake in the real --color-primary because an SVG
// rendered as an image is isolated and can't resolve var(). Omitted, the
// palette default is used. Weak rolls are re-rolled from seeds derived from
// `seed`, so a given seed still always yields the same mark.
export function pickMarkSpec(seed: number = randomSeed(), ink?: string): TLSpec {
	let best: TLSpec | undefined;
	let bestScore = -1;
	for (let i = 0; i < MAX_ROLLS; i++) {
		const spec = markSpec(i ? seedFor(seed, i) : seed, ink);
		const score = quality(armDetail(spec)); // >= 1 passes every threshold
		if (score >= 1) return spec;
		if (score > bestScore) [best, bestScore] = [spec, score];
	}
	return best!;
}

export function generateMarkSvg(seed: number = randomSeed(), ink?: string): string {
	return renderSpec(pickMarkSpec(seed, ink)).svg;
}

export function randomSeed(): number {
	return Math.floor(Math.random() * 0x7fffffff);
}
