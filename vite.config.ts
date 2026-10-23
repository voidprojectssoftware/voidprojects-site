import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { brandPrimary } from './scripts/brand-primary.mjs';

// Serves /api/mark.svg during `vite dev` from the same module the Azure Function
// bundles (api/src/mark.ts), so the footer badge works locally without the
// Functions runtime. Production routes /api/* to the managed function instead.
function markApiDev(): Plugin {
	return {
		name: 'mark-api-dev',
		apply: 'serve',
		configureServer(server) {
			server.middlewares.use('/api/mark.svg', async (req, res) => {
				const { markResponse } = await server.ssrLoadModule('/src/lib/brand/mark-http.ts');
				const url = new URL(req.url ?? '/', 'http://localhost');
				const r = markResponse(url.searchParams, brandPrimary());
				res.writeHead(r.status, r.headers).end(r.body);
			});
		}
	};
}

export default defineConfig({
	plugins: [markApiDev(), tailwindcss(), sveltekit()],
	ssr: {
		noExternal: ['bits-ui', '@melt-ui/svelte']
	}
});
