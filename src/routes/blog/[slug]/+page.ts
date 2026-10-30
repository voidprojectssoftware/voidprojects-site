import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { isPublished, publishedPosts } from '$lib/content/posts';
import type { PostMeta } from '$lib/content/types';
import type { EntryGenerator, PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	let post;
	try {
		// Static prefix + suffix so Vite can statically find and bundle every post.
		post = await import(`../../../lib/content/blog/${params.slug}.md`);
	} catch {
		error(404, `Post "${params.slug}" not found`);
	}

	const meta = post.metadata as PostMeta;
	// Drafts stay previewable by direct URL in `npm run dev`; in a build they do not exist.
	if (!dev && !isPublished(meta)) error(404, `Post "${params.slug}" not found`);

	return { content: post.default, meta };
};

// Enumerate published slugs so adapter-static prerenders every public post (belt and
// braces alongside the index page linking to each one). Drafts are left out.
export const entries: EntryGenerator = () => publishedPosts().map(({ slug }) => ({ slug }));
