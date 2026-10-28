import { publishedPosts } from '$lib/content/posts';
import { PAGES, absoluteUrl } from '$lib/seo/site.js';

// /brand and its labs are internal tools and stay out.
export const prerender = true;

export function GET() {
	const urls = [
		...Object.values(PAGES).map((p) => ({ loc: absoluteUrl(p.path) })),
		...publishedPosts().map((p) => ({
			loc: absoluteUrl(`/blog/${p.slug}`),
			lastmod: p.meta.date
		}))
	];

	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...urls.map(
			(u) =>
				`  <url><loc>${u.loc}</loc>${'lastmod' in u ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`
		),
		'</urlset>',
		''
	].join('\n');

	return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
