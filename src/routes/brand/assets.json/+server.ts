import { json } from '@sveltejs/kit';
import { ASSETS, exportFilename } from '$lib/brand/manifest.js';

// The export script (scripts/export-brand.mjs) fetches this so the Node side and
// the Svelte app share one manifest — no duplicated dimension/filename lists.
export const prerender = true;

export function GET() {
	return json(ASSETS.map((a) => ({ ...a, filename: exportFilename(a) })));
}
