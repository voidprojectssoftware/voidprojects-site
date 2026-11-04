> **AI-generated, not yet reviewed.** This document was written by an AI assistant and has not been reviewed by a human.

# Configure Cloudflare Web Analytics

The site counts visits with Cloudflare Web Analytics: cookieless, aggregate page views and performance, no cookie banner. Every page of the main site and every offer page under `/o/` carries the beacon, so offer views count too.

## How the token reaches the page

The build reads one environment variable, `PUBLIC_CF_ANALYTICS_TOKEN`, the site token Cloudflare shows for the Web Analytics site.

- Set: every built HTML page gets, in its `<head>`:
  `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"<token>"}'></script>`
- Unset or blank: no tag at all. Local `npm run dev`, `npm run preview` and the PR checks build without it, so they report nothing.

The tag is built in `src/lib/analytics/beacon.ts`. The main site adds it in `src/hooks.server.ts` while prerendering; `scripts/build-offers.mjs` adds it to each offer's `index.html`. The site's DNS is DNS-only (not proxied), so Cloudflare cannot inject the beacon itself; it has to be in the HTML.

The token is not a secret: it is in every page's source. A GitHub repository variable is enough.

## Set it up

1. In the Cloudflare dashboard, open **Analytics & Logs > Web Analytics**, choose **Add a site**, and enter `voidprojects.ai`. Cloudflare shows a JavaScript snippet; copy the `token` value from its `data-cf-beacon` attribute.
2. In `voidprojects-site-infra`, add a repository variable `CF_ANALYTICS_TOKEN` with that value.
3. In that repo's `.github/workflows/deploy.yml`, give the build step the variable:

   ```yaml
   - run: npm run build
     env:
       PUBLIC_CF_ANALYTICS_TOKEN: ${{ vars.CF_ANALYTICS_TOKEN }}
   ```

4. Run the deploy workflow.

## Check it works

1. View the source of `https://voidprojects.ai/` and of an offer page: both have the `cloudflareinsights` script tag.
2. In the browser's network panel, `beacon.min.js` loads and a request goes to `cloudflareinsights.com/cdn-cgi/rum`.
3. Visits appear under **Web Analytics** in the dashboard within a few minutes.

To check a build locally: `PUBLIC_CF_ANALYTICS_TOKEN=test npm run build`, then `grep -rl cloudflareinsights build`.

## Content-Security-Policy

The site sends no Content-Security-Policy today. If one is added, it must allow `https://static.cloudflareinsights.com` in `script-src` and `https://cloudflareinsights.com` in `connect-src`, or the beacon stops reporting.
