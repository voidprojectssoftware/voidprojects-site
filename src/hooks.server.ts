import { dev } from '$app/environment';
import type { Handle } from '@sveltejs/kit';

// Under `vite dev`, inject the Agentation toolbar (src/lib/dev/agentation.ts) as a
// script tag the dev server resolves. No client code imports it, so production
// builds never emit React or the toolbar, not even as an unreferenced chunk.
const DEV_TOOLS = '<script type="module" src="/src/lib/dev/agentation.ts"></script>';

export const handle: Handle = ({ event, resolve }) =>
	dev
		? resolve(event, {
				transformPageChunk: ({ html }) => html.replace('</body>', `${DEV_TOOLS}</body>`)
			})
		: resolve(event);
