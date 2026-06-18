/** Frontmatter shape for a blog post (`src/lib/content/blog/*.md`). mdsvex
 *  exposes a post's frontmatter as its `metadata` export, untyped — load
 *  functions cast it to this. */
export interface PostMeta {
	title: string;
	author: string;
	description: string;
	date: string;
	published: boolean;
	tags?: string[];
}

/** An index-listing entry: the post's slug (its filename) plus its frontmatter. */
export interface PostSummary {
	slug: string;
	meta: PostMeta;
}
