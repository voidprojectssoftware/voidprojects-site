// Generates a fresh favicon each page load from the shared orbit mark recipe.
// Resolves once the trajectory points have loaded (one shared fetch).
import { generateMarkSvg } from './mark.js';
import { brandColor } from './colors.js';
import { loadTrajectories } from '$lib/trajectory/data.js';

export async function generateFaviconSvg(seed?: number): Promise<string> {
	const data = await loadTrajectories();
	// Bake the real brand violet (--color-primary from layout.css) into the mark; a
	// data-URI favicon renders isolated, so a var() wouldn't resolve.
	return generateMarkSvg(data, seed, brandColor('--color-primary') || undefined);
}

// Inline SVG data URI ready for <link rel="icon" href>.
export async function generateFaviconDataUri(seed?: number): Promise<string> {
	return `data:image/svg+xml,${encodeURIComponent(await generateFaviconSvg(seed))}`;
}
