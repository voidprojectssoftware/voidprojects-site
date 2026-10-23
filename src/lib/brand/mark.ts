// The randomly rolled Void Projects orbit mark: a bold, monochromatic emblem from
// the trajectory logo generator (line style, transparent, no frame). DOM-free so
// the same recipe backs the browser favicon ({@link generateFaviconSvg}) and the
// /api/mark.svg endpoint that client-site footers embed.
import { deriveSpec, renderSpec } from './labs/trajectory-logo.js';
import { CRAFT_IDS } from '$lib/trajectory';

// Bolder than the lab's UI max (2) on purpose: the mark renders at favicon and
// footer-badge sizes, where the fine trajectory lines need weight to survive.
const MARK_STROKE = 10;

// `ink` is any CSS color; callers bake in the real --color-primary because an SVG
// rendered as an image is isolated and can't resolve var(). Omitted, the
// palette default is used.
export function generateMarkSvg(seed: number = randomSeed(), ink?: string): string {
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
	return renderSpec(spec).svg;
}

export function randomSeed(): number {
	return Math.floor(Math.random() * 0x7fffffff);
}
