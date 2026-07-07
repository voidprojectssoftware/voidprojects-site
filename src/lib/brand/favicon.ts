// Generates a fresh favicon each page load: a bold, monochromatic orbit mark from
// the trajectory logo generator — brand violet, line style, transparent (no frame,
// no backing), rolled from a random seed. Bold strokes so it still reads at 16px.
// Returns an inline SVG data URI ready for <link rel="icon" href>.
import { deriveSpec, renderSpec } from './labs/trajectory-logo.js';
import { CRAFT_IDS } from '$lib/trajectory';

// Bolder than the lab's UI max (2) on purpose — favicons render tiny, so the fine
// trajectory lines need weight to survive at 16px.
const FAVICON_STROKE = 10;

export function generateFaviconSvg(seed: number = randomSeed()): string {
	const spec = deriveSpec(seed, {
		stroke: FAVICON_STROKE,
		palette: 'brand',
		frameMode: 'none',
		symmetry: 'emblem',
		pool: CRAFT_IDS
	});
	spec.style = 'line'; // pure strokes (max stroke weight reads at favicon size)
	spec.sun = false; // no central dot; keep it to the mark itself
	return renderSpec(spec).svg;
}

export function generateFaviconDataUri(seed?: number): string {
	return `data:image/svg+xml,${encodeURIComponent(generateFaviconSvg(seed))}`;
}

function randomSeed(): number {
	return Math.floor(Math.random() * 0x7fffffff);
}
