// Generates a fresh favicon each page load from the shared orbit mark recipe.
// Returns an inline SVG data URI ready for <link rel="icon" href>.
import { generateMarkSvg } from './mark.js';
import { brandColor } from './colors.js';

export function generateFaviconSvg(seed?: number): string {
	// Bake the real brand violet (--color-primary from layout.css) into the mark; a
	// data-URI favicon renders isolated, so a var() wouldn't resolve.
	return generateMarkSvg(seed, brandColor('--color-primary') || undefined);
}

export function generateFaviconDataUri(seed?: number): string {
	return `data:image/svg+xml,${encodeURIComponent(generateFaviconSvg(seed))}`;
}
