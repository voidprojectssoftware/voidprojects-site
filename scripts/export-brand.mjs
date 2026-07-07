// Pixel-perfect brand asset exporter.
//
// Boots the SvelteKit dev server, then drives a headless Chromium over each
// asset's raw-mode URL (/brand?asset=<id>&raw=1) at its exact pixel dimensions
// and screenshots the artwork element to brand-exports/. A real browser renders
// the live starfield canvas, oklch colors, and Inter natively, so the output
// matches the /brand preview exactly. The asset list comes from the running app
// (/brand/assets.json), so this script and the Svelte UI share one manifest.
//
// Usage: npm run export:brand

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const OUT = join(root, 'brand-exports');
const PORT = 5179;
const BASE = `http://localhost:${PORT}`;

function startDevServer() {
	// `--strictPort` makes Vite fail (rather than hop ports) if 5179 is taken, so we
	// never screenshot the wrong server.
	const child = spawn(
		'npm',
		['run', 'dev', '--', '--port', String(PORT), '--strictPort', '--host', 'localhost'],
		{ cwd: root, shell: true, stdio: ['ignore', 'pipe', 'pipe'] }
	);
	child.stdout.on('data', () => {});
	child.stderr.on('data', (d) => process.stderr.write(d));
	return child;
}

function killTree(child) {
	if (!child.pid) return;
	if (process.platform === 'win32') {
		spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { shell: true });
	} else {
		child.kill('SIGTERM');
	}
}

async function waitForServer(url, timeoutMs = 90000) {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		try {
			const r = await fetch(url);
			if (r.ok) return;
		} catch {
			// not up yet
		}
		await new Promise((r) => setTimeout(r, 400));
	}
	throw new Error(`dev server did not answer ${url} within ${timeoutMs}ms`);
}

async function main() {
	await mkdir(OUT, { recursive: true });

	console.log('Starting dev server…');
	const dev = startDevServer();

	try {
		await waitForServer(`${BASE}/brand/assets.json`);
		const assets = await (await fetch(`${BASE}/brand/assets.json`)).json();
		console.log(`Exporting ${assets.length} assets → ${OUT}\n`);

		const browser = await chromium.launch();
		try {
			for (const a of assets) {
				// deviceScaleFactor defaults to 1 (1 CSS px == 1 output px → exactly
				// a.width × a.height). Assets with scale > 1 render more device pixels so
				// platforms that upscale on hi-DPI (LinkedIn cover) stay crisp.
				const dsf = a.scale ?? 1;
				const page = await browser.newPage({
					viewport: { width: a.width, height: a.height },
					deviceScaleFactor: dsf
				});
				await page.goto(`${BASE}/brand?asset=${a.id}&raw=1`, { waitUntil: 'networkidle' });

				const el = page.locator('[data-brand-asset]');
				await el.waitFor({ state: 'visible' });
				await page.evaluate(() => document.fonts.ready);
				await page.waitForTimeout(350); // let the starfield paint its single frame

				const type = a.format === 'jpg' ? 'jpeg' : 'png';
				await el.screenshot({
					path: join(OUT, a.filename),
					type,
					...(type === 'jpeg' ? { quality: 92 } : {})
				});
				console.log(
					`  ✓ ${a.filename}  (${a.width * dsf}×${a.height * dsf}${dsf > 1 ? ` @${dsf}×` : ''})`
				);
				await page.close();
			}
		} finally {
			await browser.close();
		}
	} finally {
		killTree(dev);
	}

	console.log(`\nDone. Files in ${OUT}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
