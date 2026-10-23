// Bundles the Azure Functions app in api/ into build-api/, a self-contained folder
// the deploy hands to Static Web Apps as its managed API (`--api-location`). The
// bundle carries @azure/functions and the shared $lib code, so the folder needs
// no npm install. @azure/functions-core stays external: the Functions worker
// provides it at runtime.
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'rolldown';
import { brandPrimary } from './brand-primary.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'build-api');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await build({
	input: join(root, 'api/src/mark.ts'),
	platform: 'node',
	external: ['@azure/functions-core'],
	resolve: { alias: { $lib: join(root, 'src/lib') } },
	transform: { define: { __BRAND_PRIMARY__: JSON.stringify(brandPrimary()) } },
	output: { file: join(out, 'mark.js'), format: 'cjs', minify: true }
});

await writeFile(
	join(out, 'package.json'),
	JSON.stringify({ name: 'voidprojects-site-api', private: true, main: 'mark.js' }, null, '\t')
);
await writeFile(
	join(out, 'host.json'),
	JSON.stringify(
		{
			version: '2.0',
			extensionBundle: {
				id: 'Microsoft.Azure.Functions.ExtensionBundle',
				version: '[4.*, 5.0.0)'
			}
		},
		null,
		'\t'
	)
);

console.log(`API bundled to ${out}`);
