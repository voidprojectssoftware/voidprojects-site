import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { render } from 'svelte/server';
import { findPost, isPublished, publishedPosts } from '$lib/server/posts';
import type { EntryGenerator, PageServerLoad } from './$types';

// Exactly the comments Svelte 5's server renderer emits, so author comments survive:
// `<!---->`, `<!--[-->`, `<!--[!-->`, `<!--[0-->` / `<!--[-1-->` (if branch index),
// `<!--[?...-->` (failed boundary), `<!--]-->` and `<!--$s1-->` ($props.id()).
const HYDRATION_MARKER = /<!--(?:\[(?:!|-?\d+|\?[^>]*)?|\]|\$s\d+)?-->/g;

export const load: PageServerLoad = async ({ params }) => {
	const post = await findPost(params.slug);
	// Drafts stay previewable by direct URL in `npm run dev`; in a build they do not exist.
	if (!post || (!dev && !isPublished(post.meta))) {
		error(404, `Post "${params.slug}" not found`);
	}

	// The post is rendered to static HTML here so its component never ships to the
	// client. Svelte's hydration markers are stripped since nothing hydrates this markup.
	const { body } = render(post.component);
	return { meta: post.meta, html: body.replace(HYDRATION_MARKER, '') };
};

// Enumerate published slugs so adapter-static prerenders every public post (belt and
// braces alongside the index page linking to each one). Drafts are left out.
export const entries: EntryGenerator = () => publishedPosts().map(({ slug }) => ({ slug }));
