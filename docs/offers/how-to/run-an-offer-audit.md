> **AI-generated, not yet reviewed.** This document was written by an AI assistant and has not been reviewed by a human.

# Run an offer audit

An offer page shows a measured SEO/AEO comparison between the prospect's current site and the preview we built for them. `npm run audit:offer` produces it.

## Run it

```sh
npm run audit:offer -- https://prospect.example/ https://preview.example/
```

The first URL is the prospect's site today, the second is our preview. The script writes one file, `offer-audits/<prospect-host>-<timestamp>.json`, and prints a pass/warn/fail table. Pass `--out <dir>` to write somewhere else.

It needs Chrome: installed Google Chrome if present, otherwise Playwright's bundled Chromium (`npx playwright install chromium`). A run takes about 30 seconds and makes one Lighthouse load, two page loads and a few plain GETs per site. It never clicks or submits anything.

## What it checks

Every check records its raw value, a `pass`, `warn` or `fail` status, and one plain-English line for the business owner. A check that cannot run (site down, file missing) is a `fail` row, never a crash.

| Group      | Check                                           | Pass when                                                                       |
| ---------- | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| lighthouse | Performance, accessibility, SEO, best practices | Lighthouse mobile score is 90 or more (50 to 89 is warn)                        |
| search     | Viewport                                        | `width=device-width` is set                                                     |
| search     | Title                                           | Present, 10 to 65 characters                                                    |
| search     | Meta description                                | Present, 50 to 160 characters                                                   |
| search     | Open Graph                                      | `og:title`, `og:description` and `og:image` all present                         |
| search     | Canonical                                       | Present and on the same origin (missing is warn)                                |
| search     | Structured data                                 | At least one JSON-LD block, all parseable, with an `@type`; types are listed    |
| search     | robots.txt                                      | Real file, not blocking all crawlers; blocking known AI crawlers is warn        |
| search     | Sitemap                                         | From robots.txt or `/sitemap.xml`, a valid `urlset` or `sitemapindex`           |
| ai         | Readable without JS                             | 100+ words in the HTML with JavaScript off, and at least half the rendered text |
| ai         | Headings                                        | Exactly one `h1`, no skipped levels                                             |
| ai         | llms.txt                                        | Real file at `/llms.txt` (missing is warn: the convention is new)               |

The HTML checks read the page with JavaScript off, because most AI crawlers and link previews do not run scripts.

## Use the result

The JSON shape is the `OfferAudit` type in `src/lib/offers/audit.ts`. Import the file into the offer and render `current.checks` beside `preview.checks`: both lists hold every check in the same order. A sample lives in `scripts/samples/`.
