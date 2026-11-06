// Cloudflare Web Analytics (#83). The site's DNS is not proxied through
// Cloudflare, so nothing injects the beacon at the edge: the main site
// (src/hooks.server.ts) and every offer page (scripts/build-offers.mjs) add this
// tag at build time. Cookieless aggregate counts; no other tracker belongs here.
//
// The token comes from the PUBLIC_CF_ANALYTICS_TOKEN environment variable when
// the build runs. Unset or blank means no tag at all, so dev, preview and PR
// builds report nothing. A future Content-Security-Policy must allow
// static.cloudflareinsights.com (script-src) and cloudflareinsights.com (connect-src).

export const BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';

export function analyticsToken(
	env: Record<string, string | undefined> = process.env
): string | undefined {
	return env.PUBLIC_CF_ANALYTICS_TOKEN?.trim() || undefined;
}

// The <script> tag for the given token, or '' without one.
export function analyticsBeacon(token = analyticsToken()): string {
	if (!token) return '';
	const config = JSON.stringify({ token }).replace(
		/[&'<]/g,
		(c) => ({ '&': '&amp;', "'": '&#39;', '<': '&lt;' })[c] ?? c
	);
	return `<script defer src="${BEACON_SRC}" data-cf-beacon='${config}'></script>`;
}
