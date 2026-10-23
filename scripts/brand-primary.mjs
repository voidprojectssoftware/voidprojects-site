// Reads --color-primary from src/routes/layout.css (the brand source of truth) for
// Node-side consumers that can't resolve CSS variables: the /api/mark.svg bundle
// and the Vite dev middleware that mirrors it.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LAYOUT_CSS = join(dirname(fileURLToPath(import.meta.url)), '../src/routes/layout.css');

export function brandPrimary() {
	const match = readFileSync(LAYOUT_CSS, 'utf8').match(/--color-primary:\s*([^;]+);/);
	if (!match) throw new Error(`--color-primary not found in ${LAYOUT_CSS}`);
	return match[1].trim();
}
