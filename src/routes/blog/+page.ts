import { publishedPosts } from '$lib/content/posts';
import type { PageLoad } from './$types';

export const load: PageLoad = () => ({ posts: publishedPosts() });
