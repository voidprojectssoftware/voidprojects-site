import { error } from '@sveltejs/kit';
import type { PostMeta } from '$lib/content/types';
import type { EntryGenerator, PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	try {
		// Static prefix + suffix so Vite can statically find and bundle every post.
		const post = await import(`../../../lib/content/blog/${params.slug}.md`);
		return {
			content: post.default,
			meta: post.metadata as PostMeta
		};
	} catch {
		error(404, `Post "${params.slug}" not found`);
	}
};

// Enumerate slugs so adapter-static prerenders every post (belt-and-suspenders
// alongside the index page linking to each one).
export const entries: EntryGenerator = () => {
	const modules = import.meta.glob('/src/lib/content/blog/*.md');
	return Object.keys(modules).map((path) => ({
		slug: path.split('/').pop()!.replace('.md', '')
	}));
};
