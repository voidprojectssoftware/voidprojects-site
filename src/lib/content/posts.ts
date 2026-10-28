import type { PostMeta, PostSummary } from './types';

// Every published post, newest first. Only frontmatter (`metadata`) is read, so the
// eager glob stays cheap. Shared by the /blog listing, the sitemap and /llms.txt.
export function publishedPosts(): PostSummary[] {
	const modules = import.meta.glob<{ metadata: PostMeta }>('/src/lib/content/blog/*.md', {
		eager: true
	});

	return Object.entries(modules)
		.map(([path, mod]) => ({
			slug: path.split('/').pop()!.replace('.md', ''),
			meta: mod.metadata
		}))
		.filter((post) => post.meta.published)
		.sort((a, b) => +new Date(b.meta.date) - +new Date(a.meta.date));
}
