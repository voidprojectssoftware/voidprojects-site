import type { PostMeta, PostSummary } from './types';

// The one rule for whether a post is public. Anything but an explicit `true` is a draft.
export function isPublished(meta: PostMeta): boolean {
	return meta.published === true;
}

// Every published post, newest first. Only frontmatter (`metadata`) is read, so the
// eager glob stays cheap. Shared by the /blog listing, the /blog/[slug] prerender
// entries, the sitemap and /llms.txt.
export function publishedPosts(): PostSummary[] {
	const modules = import.meta.glob<{ metadata: PostMeta }>('/src/lib/content/blog/*.md', {
		eager: true
	});

	return Object.entries(modules)
		.map(([path, mod]) => ({
			slug: path.split('/').pop()!.replace('.md', ''),
			meta: mod.metadata
		}))
		.filter((post) => isPublished(post.meta))
		.sort((a, b) => +new Date(b.meta.date) - +new Date(a.meta.date));
}
