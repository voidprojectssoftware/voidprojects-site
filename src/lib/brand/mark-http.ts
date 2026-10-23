// The /api/mark.svg contract, shared by the Azure Function (api/) and the Vite
// dev middleware so local dev serves exactly what production does.
import { generateMarkSvg, randomSeed } from './mark.js';

export interface MarkResponse {
	status: number;
	headers: Record<string, string>;
	body: string;
}

const MAX_SEED = 0x7fffffff;

// No `seed`: a fresh mark every request, never cached, so each visit to a client
// site shows a new one. `?seed=<int>` pins one mark (cacheable) for previews and tests.
export function markResponse(params: URLSearchParams, ink: string): MarkResponse {
	const raw = params.get('seed');
	const seed = raw === null ? randomSeed() : Number(raw);
	if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
		return {
			status: 400,
			headers: { 'Content-Type': 'text/plain; charset=utf-8' },
			body: `seed must be an integer from 0 to ${MAX_SEED}`
		};
	}
	return {
		status: 200,
		headers: {
			'Content-Type': 'image/svg+xml; charset=utf-8',
			'Cache-Control': raw === null ? 'no-store' : 'public, max-age=86400',
			'X-Content-Type-Options': 'nosniff',
			'Access-Control-Allow-Origin': '*'
		},
		body: generateMarkSvg(seed, ink)
	};
}
