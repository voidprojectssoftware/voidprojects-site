// Serves build/ as Static Web Apps would for offer pages, plus POST
// /api/offer-checkout and /api/offer-question answered by the same modules the
// Azure Functions bundle. `npm run preview` cannot show offers: SvelteKit's preview
// serves only its own output. Run `npm run build` first.
// Usage: [STRIPE_SECRET_KEY=sk_test_...] npm run preview:offers [-- port]
// With a test key, sign-up opens a real test-mode Checkout that returns here;
// without one both endpoints answer 503. Questions are logged, never emailed.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import Stripe from 'stripe';
import { createServer as createViteServer } from 'vite';
import { offersPlugin, root } from './offers.mjs';

const port = Number(process.argv[2] ?? process.env.PORT ?? 5281);
const buildDir = join(root, 'build');
const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.avif': 'image/avif',
	'.woff2': 'font/woff2',
	'.txt': 'text/plain; charset=utf-8',
	'.xml': 'application/xml; charset=utf-8'
};

const vite = await createViteServer({
	configFile: false,
	root,
	logLevel: 'warn',
	server: { middlewareMode: true, hmr: false },
	appType: 'custom',
	resolve: { alias: { $lib: join(root, 'src/lib') } },
	plugins: [offersPlugin()]
});
const { checkoutResponse, MAX_BODY_BYTES } = await vite.ssrLoadModule(
	'/src/lib/offers/checkout-http.ts'
);
const { questionResponse } = await vite.ssrLoadModule('/src/lib/offers/question-http.ts');
const { logDelivery } = await vite.ssrLoadModule('/src/lib/contact/contact-http.ts');
const { findOffer } = await vite.ssrLoadModule('virtual:offers');

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (key && !key.startsWith('sk_test_')) {
	console.error('preview-offers: STRIPE_SECRET_KEY must be a test key (sk_test_...)');
	process.exit(1);
}
const stripe = key ? new Stripe(key) : undefined;
if (!stripe) console.warn('preview-offers: STRIPE_SECRET_KEY not set; sign-up answers 503');
const origin = `http://localhost:${port}`;

async function readBody(req) {
	let body = '';
	for await (const chunk of req) if (body.length <= MAX_BODY_BYTES) body += chunk;
	return body;
}

function staticFile(pathname) {
	const path = normalize(join(buildDir, decodeURIComponent(pathname)));
	if (!path.startsWith(buildDir)) return undefined;
	for (const candidate of [path, join(path, 'index.html'), `${path}.html`]) {
		if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
	}
	return undefined;
}

createServer(async (req, res) => {
	const { pathname } = new URL(req.url ?? '/', 'http://localhost');
	if (pathname === '/api/offer-checkout' && req.method === 'POST') {
		const r = await checkoutResponse(req.headers['content-type'] ?? null, await readBody(req), {
			findOffer,
			stripe,
			origin,
			log: console.warn
		});
		res.writeHead(r.status, r.headers).end(r.body);
		return;
	}
	if (pathname === '/api/offer-question' && req.method === 'POST') {
		const r = await questionResponse(req.headers['content-type'] ?? null, await readBody(req), {
			stripe,
			deliver: logDelivery(console.log),
			log: console.warn
		});
		res.writeHead(r.status, r.headers).end(r.body);
		return;
	}
	const file = staticFile(pathname);
	if (!file) {
		res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
		return;
	}
	const headers = { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' };
	if (pathname.startsWith('/o/') || pathname === '/thanks') {
		headers['X-Robots-Tag'] = 'noindex, nofollow, noarchive';
	}
	res.writeHead(200, headers);
	createReadStream(file).pipe(res);
}).listen(port, () => console.log(`preview-offers: http://localhost:${port}/o/<id>/`));
