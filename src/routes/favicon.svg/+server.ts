import { generateMarkSvg } from '$lib/brand/mark.js';

// The static favicon in the page head, for crawlers and the moment before the
// layout swaps in this visit's mark. One fixed seed, picked for how it reads at
// 16px. static/favicon.ico is this same mark rasterized at 16, 32 and 48px.
export const prerender = true;

const FAVICON_SEED = 42;

export function GET() {
	return new Response(generateMarkSvg(FAVICON_SEED, __BRAND_PRIMARY__), {
		headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' }
	});
}
