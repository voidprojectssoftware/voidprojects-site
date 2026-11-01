import tailwindcss from '@tailwindcss/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv, type Plugin } from 'vite';
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

// Serves POST /api/contact during `vite dev` from the same module the Azure
// Function bundles (api/src/contact.ts); submissions are logged to this terminal.
// Turnstile tokens go to Cloudflare's siteverify with the always-pass test secret,
// or with TURNSTILE_SECRET_KEY from the shell (for example the always-fail one).
function contactApiDev(): Plugin {
	return {
		name: 'contact-api-dev',
		apply: 'serve',
		configureServer(server) {
			let deps: unknown;
			server.middlewares.use('/api/contact', async (req, res) => {
				if (req.method !== 'POST') {
					res.writeHead(405, { Allow: 'POST' }).end();
					return;
				}
				const { contactResponse, contactLimiters, logDelivery, MAX_BODY_BYTES } =
					await server.ssrLoadModule('/src/lib/contact/contact-http.ts');
				const { siteverify, TURNSTILE_TEST_KEYS } = await server.ssrLoadModule(
					'/src/lib/contact/turnstile.ts'
				);
				deps ??= {
					deliver: logDelivery((line: string) =>
						server.config.logger.info(line, { timestamp: true })
					),
					verify: siteverify(process.env.TURNSTILE_SECRET_KEY || TURNSTILE_TEST_KEYS.secretPass),
					limiters: contactLimiters()
				};
				let body = '';
				for await (const chunk of req) if (body.length <= MAX_BODY_BYTES) body += chunk;
				const r = await contactResponse(
					{
						contentType: req.headers['content-type'] ?? null,
						body,
						clientIp: req.socket.remoteAddress ?? 'unknown'
					},
					deps
				);
				res.writeHead(r.status, r.headers).end(r.body);
			});
		}
	};
}

// Cloudflare's always-pass test site key stands in when PUBLIC_TURNSTILE_SITE_KEY is
// unset. A production secret rejects the tokens it issues, so a deploy built without
// the real key fails closed (the form shows its error and mailto fallback).
const TEST_SITE_KEY = '1x00000000000000000000AA';

export default defineConfig(({ command, mode }) => {
	const siteKey = loadEnv(mode, process.cwd(), 'PUBLIC_').PUBLIC_TURNSTILE_SITE_KEY?.trim();
	if (command === 'build' && !siteKey) {
		console.warn("PUBLIC_TURNSTILE_SITE_KEY is not set; building with Cloudflare's test site key.");
	}
	return {
		plugins: [markApiDev(), contactApiDev(), tailwindcss(), enhancedImages(), sveltekit()],
		define: { __TURNSTILE_SITE_KEY__: JSON.stringify(siteKey || TEST_SITE_KEY) },
		ssr: {
			noExternal: ['bits-ui', '@melt-ui/svelte']
		}
	};
});
