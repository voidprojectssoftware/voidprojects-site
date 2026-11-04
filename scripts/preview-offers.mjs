// Serves build/ as Static Web Apps would for offer pages, plus POST
// /api/offer-checkout answered by the same module the Azure Function bundles.
// `npm run preview` cannot show offers: SvelteKit's preview serves only its own
// output. Run `npm run build` first. Usage: npm run preview:offers [-- port]
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
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
const { findOffer } = await vite.ssrLoadModule('virtual:offers');

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
		let body = '';
		for await (const chunk of req) if (body.length <= MAX_BODY_BYTES) body += chunk;
		const r = checkoutResponse(req.headers['content-type'] ?? null, body, findOffer);
		res.writeHead(r.status, r.headers).end(r.body);
		return;
	}
	const file = staticFile(pathname);
	if (!file) {
		res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
		return;
	}
	const headers = { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' };
	if (pathname.startsWith('/o/')) headers['X-Robots-Tag'] = 'noindex, nofollow, noarchive';
	res.writeHead(200, headers);
	createReadStream(file).pipe(res);
}).listen(port, () => console.log(`preview-offers: http://localhost:${port}/o/<id>/`));
