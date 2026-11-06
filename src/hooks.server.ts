import { dev } from '$app/environment';
import { analyticsBeacon } from '$lib/analytics/beacon.js';
import type { Handle } from '@sveltejs/kit';

// Under `vite dev`, inject the Agentation toolbar (src/lib/dev/agentation.ts) as a
// script tag the dev server resolves. No client code imports it, so production
// builds never emit React or the toolbar, not even as an unreferenced chunk.
const DEV_TOOLS = '<script type="module" src="/src/lib/dev/agentation.ts"></script>';

// Every page is prerendered, so this reads the token once per build; '' without one.
const BEACON = analyticsBeacon();

export const handle: Handle = ({ event, resolve }) =>
	resolve(event, {
		transformPageChunk: ({ html }) => {
			if (BEACON) html = html.replace('</head>', `\t${BEACON}\n\t</head>`);
			return dev ? html.replace('</body>', `${DEV_TOOLS}</body>`) : html;
		}
	});
