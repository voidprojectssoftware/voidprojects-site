import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.md'],
			// Every .md post is wrapped in this layout, which supplies the prose
			// styling and the article header from the post's frontmatter.
			layout: { _: join(here, 'src/lib/components/post-layout/post-layout.svelte') }
		})
	],
	compilerOptions: {
		// Force runes mode for the project, except for libraries and mdsvex-generated
		// post components (their wrapper uses legacy `$$props`). Can be removed in svelte 6.
		runes: ({ filename }) =>
			filename.split(/[/\\]/).includes('node_modules') || filename.endsWith('.md')
				? undefined
				: true
	},
	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(),
		prerender: {
			handleUnseenRoutes: 'ignore'
		}
	},
	extensions: ['.svelte', '.md']
};

export default config;
