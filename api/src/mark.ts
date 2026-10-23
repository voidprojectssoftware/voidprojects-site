// GET /api/mark.svg: a freshly rolled Void Projects mark, for the "Made by Void
// Projects" footer badge on client sites. Bundled by scripts/build-api.mjs.
import { app } from '@azure/functions';
import { markResponse } from '$lib/brand/mark-http.js';

declare const __BRAND_PRIMARY__: string; // --color-primary, inlined from layout.css at build time

app.http('mark', {
	route: 'mark.svg',
	methods: ['GET'],
	authLevel: 'anonymous',
	handler: async (request) => {
		const res = markResponse(new URL(request.url).searchParams, __BRAND_PRIMARY__);
		return { status: res.status, headers: res.headers, body: res.body };
	}
});
