import type { PostMeta, PostSummary } from '$lib/content/types';
import type { PageLoad } from './$types';

// Eagerly pull every post's module so we can read its frontmatter (`metadata`)
// for the listing. Only the metadata is used here, not the rendered component,
// so this stays cheap. The root ++layout.ts already prerenders the whole site.
export const load: PageLoad = () => {
	const modules = import.meta.glob<{ metadata: PostMeta }>('/src/lib/content/blog/*.md', {
		eager: true
	});

	const posts: PostSummary[] = Object.entries(modules)
		.map(([path, mod]) => ({
			slug: path.split('/').pop()!.replace('.md', ''),
			meta: mod.metadata
		}))
		.filter((post) => post.meta.published)
		.sort((a, b) => +new Date(b.meta.date) - +new Date(a.meta.date));

	return { posts };
};
