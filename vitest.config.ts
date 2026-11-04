// Unit tests (npm test). Kept apart from vite.config.ts so tests load no SvelteKit
// plugin: they cover plain server-side modules in src/lib and api/src.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: { alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) } },
	test: { include: ['src/**/*.test.ts', 'api/**/*.test.ts'], environment: 'node' }
});
