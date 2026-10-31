import type { Component } from 'svelte';
import type { PostMeta, PostSummary } from '$lib/content/types';

// Post modules are read only here, on the server and at prerender time, so no `.md`
// (published or draft) ever enters the client bundle. Pages receive serialized data.
const metadata = import.meta.glob<PostMeta>('/src/lib/content/blog/*.md', {
	eager: true,
	import: 'metadata'
});
const components = import.meta.glob<Component>('/src/lib/content/blog/*.md', {
	import: 'default'
});

const pathFor = (slug: string) => `/src/lib/content/blog/${slug}.md`;
const slugFor = (path: string) => path.split('/').pop()!.replace('.md', '');

// The one rule for whether a post is public. Anything but an explicit `true` is a draft.
export function isPublished(meta: PostMeta): boolean {
	return meta.published === true;
}

// Every published post, newest first. Shared by the /blog listing, the /blog/[slug]
// prerender entries, the sitemap and /llms.txt.
export function publishedPosts(): PostSummary[] {
	return Object.entries(metadata)
		.map(([path, meta]) => ({ slug: slugFor(path), meta }))
		.filter((post) => isPublished(post.meta))
		.sort((a, b) => +new Date(b.meta.date) - +new Date(a.meta.date));
}

// A post's frontmatter and its mdsvex component (already wrapped in post-layout.svelte),
// or undefined when no such file exists. Drafts are returned too; callers decide.
export async function findPost(
	slug: string
): Promise<{ meta: PostMeta; component: Component } | undefined> {
	const path = pathFor(slug);
	const load = components[path];
	if (!load) return undefined;
	return { meta: metadata[path], component: await load() };
}
