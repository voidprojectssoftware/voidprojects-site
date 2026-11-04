// Builds each offers/<id>/ into build/o/<id>/ as its own small Svelte app, after
// `vite build` has written the main site. Offers are kept out of SvelteKit on
// purpose: every SvelteKit route path ships in _app/immutable/entry/app.*.js to
// every visitor, so an offer as a route would leak every offer id (#75). Here an
// offer's id, data and assets exist only under build/o/<id>/.
//
// Per offer: a server build renders the page to HTML (so it reads without
// JavaScript), a client build hydrates it, and this script writes index.html
// around both. It then lists expired offers, the clean-up reminder.
import { rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import QRCode from 'qrcode';
import { build } from 'vite';
import { listOfferIds, offerFile, root } from './offers.mjs';

const lib = join(root, 'src/lib');
const outRoot = join(root, 'build/o');
const ssrRoot = join(root, 'node_modules/.cache/offer-ssr');
const CHECKOUT_ENDPOINT = '/api/offer-checkout';
const ENTRY = 'virtual:offer-entry';

// The two entries, generated per offer so nothing imports an offer by a name
// that some shared file would have to list.
function entryPlugin(id, ssr) {
	const page = JSON.stringify(offerFile(id, 'page.svelte'));
	const code = ssr
		? [
				`import { render } from 'svelte/server';`,
				`import Page from ${page};`,
				`import input from ${JSON.stringify(offerFile(id, 'offer.ts'))};`,
				`import * as offers from ${JSON.stringify(join(lib, 'offers/offer.ts'))};`,
				`import { SITE_ORIGIN } from ${JSON.stringify(join(lib, 'seo/site.ts'))};`,
				`export { analyticsBeacon } from ${JSON.stringify(join(lib, 'analytics/beacon.ts'))};`,
				`export const offer = offers.resolveOffer(${JSON.stringify(id)}, input);`,
				`export { offers, SITE_ORIGIN };`,
				`export const renderPage = (props) => render(Page, { props });`
			].join('\n')
		: [
				`import { hydrate } from 'svelte';`,
				`import Page from ${page};`,
				`const props = JSON.parse(document.getElementById('offer-props').textContent);`,
				`hydrate(Page, { target: document.getElementById('offer'), props });`
			].join('\n');
	return {
		name: 'offer-entry',
		// The client build hands the input over with the root prepended.
		resolveId: (source) => (source.endsWith(ENTRY) ? '\0' + ENTRY : undefined),
		load: (resolved) => (resolved === '\0' + ENTRY ? code : undefined)
	};
}

function viteConfig(id, ssr) {
	return {
		configFile: false,
		root,
		base: `/o/${id}/`,
		publicDir: false,
		logLevel: 'warn',
		resolve: { alias: { $lib: lib } },
		plugins: [
			entryPlugin(id, ssr),
			svelte({ configFile: false, preprocess: vitePreprocess(), compilerOptions: { runes: true } }),
			tailwindcss()
		],
		ssr: { noExternal: true },
		build: ssr
			? {
					ssr: ENTRY,
					outDir: join(ssrRoot, id),
					emptyOutDir: true,
					rolldownOptions: { output: { entryFileNames: 'render.mjs' } }
				}
			: {
					outDir: join(outRoot, id),
					emptyOutDir: true,
					manifest: true,
					rolldownOptions: { input: { offer: ENTRY } }
				}
	};
}

// One SVG path of horizontal runs of dark modules, for the QrCode block.
function qrMatrix(text) {
	const { size, data } = QRCode.create(text, { errorCorrectionLevel: 'M' }).modules;
	let path = '';
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			if (!data[y * size + x]) continue;
			let run = 1;
			while (x + run < size && data[y * size + x + run]) run++;
			path += `M${x} ${y}h${run}v1h-${run}z`;
			x += run - 1;
		}
	}
	return { size, path };
}

function escapeHtml(value) {
	return value.replace(
		/[&<>"]/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
	);
}

// Entry script plus the CSS and chunks it pulls in, from the client manifest.
async function clientAssets(id) {
	const dir = join(outRoot, id);
	const manifest = JSON.parse(await readFile(join(dir, '.vite/manifest.json'), 'utf8'));
	await rm(join(dir, '.vite'), { recursive: true, force: true });
	const entry = Object.values(manifest).find((chunk) => chunk.isEntry);
	const css = new Set();
	const preload = new Set();
	const walk = (chunk) => {
		for (const file of chunk.css ?? []) css.add(file);
		for (const key of chunk.imports ?? []) {
			preload.add(manifest[key].file);
			walk(manifest[key]);
		}
	};
	walk(entry);
	const href = (file) => `/o/${id}/${file}`;
	return { script: href(entry.file), css: [...css].map(href), preload: [...preload].map(href) };
}

function page({ offer, html, assets, props, beacon }) {
	const json = JSON.stringify(props).replace(/</g, '\\u003c');
	const head = [
		beacon, // the site's Cloudflare Web Analytics tag; offer views count too (#83)
		...assets.css.map((href) => `<link rel="stylesheet" href="${href}" />`),
		...assets.preload.map((href) => `<link rel="modulepreload" href="${href}" />`),
		html.head
	]
		.filter(Boolean)
		.map((line) => `\t\t${line}`)
		.join('\n');
	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="robots" content="noindex, nofollow, noarchive" />
		<meta name="referrer" content="no-referrer" />
		<title>${escapeHtml(`Your new website, ${offer.prospect}`)}</title>
		<link rel="icon" href="data:," />
${head}
	</head>
	<body>
		<div id="offer">${html.body}</div>
		<script type="application/json" id="offer-props">${json}</script>
		<script type="module" src="${assets.script}"></script>
	</body>
</html>
`;
}

async function buildOffer(id, builtAt) {
	await build(viteConfig(id, true));
	const ssr = await import(
		`${pathToFileURL(join(ssrRoot, id, 'render.mjs')).href}?t=${Date.now()}`
	);
	const { offer, offers, SITE_ORIGIN, analyticsBeacon } = ssr;
	const url = new URL(offers.offerPath(id), SITE_ORIGIN).href;
	const props = {
		offer: offers.publicOffer(offer),
		context: { url, qr: qrMatrix(url), builtAt, checkoutEndpoint: CHECKOUT_ENDPOINT }
	};

	await build(viteConfig(id, false));
	const assets = await clientAssets(id);
	await writeFile(
		join(outRoot, id, 'index.html'),
		page({ offer, html: ssr.renderPage(props), assets, props, beacon: analyticsBeacon() })
	);
	return { offer, offers };
}

const ids = listOfferIds();
const now = new Date();
await rm(outRoot, { recursive: true, force: true });
await mkdir(outRoot, { recursive: true });

const built = [];
for (const id of ids) built.push(await buildOffer(id, now.toISOString()));
await rm(ssrRoot, { recursive: true, force: true });

console.log(`offers: built ${built.length} offer(s) into build/o/`);
const expired = built.filter(({ offer, offers }) => offers.isExpired(offer, now));
for (const { offer, offers } of expired) {
	const purge = offers.retentionEnds(offer);
	const overdue = purge <= now.toISOString().slice(0, 10) ? ' (OVERDUE)' : '';
	console.log(
		`offers: EXPIRED ${offer.id} ${offer.prospect}, ran through ${offer.expires}; remove the folder and its prospect data by ${purge}${overdue}`
	);
}
if (built.length && !expired.length) console.log('offers: none expired');
