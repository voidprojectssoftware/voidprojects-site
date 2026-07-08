---
name: brand-studio
description: The /brand studio in this repo — brand assets (YouTube/LinkedIn logos + banners), the brand guide, the orbit-mark logo, and the per-load generative favicon. Use when editing brand colors, the logo or favicon, channel-asset dimensions, or the brand guide page, or when running the asset export. Covers the single source of truth for colors (layout.css via brandColor), the npm run export:brand pipeline, and how src/lib/brand and src/lib/trajectory are organized.
---

# Brand studio (`/brand`)

The `/brand` route is a living brand guide + a pixel-perfect channel-asset exporter.

## Where things live

- `src/routes/layout.css` — **the source of truth for colors + type.** Dark-only site
  (`html.dark`). `--color-primary: oklch(0.6534 0.1876 301.62)` (brand violet),
  `--background: oklch(0.17 0.018 285)` (deep space), `--font-sans: Inter Variable`.
- `src/lib/brand/colors.ts` — `brandColor(cssVar)`: the **one** JS accessor for brand
  colors, resolving the CSS custom properties at runtime. **Never hardcode a brand
  color.** In JS read it via `brandColor()`; in CSS use `var(--color-primary)`, and for
  an alpha tint use `color-mix(in oklch, var(--color-primary) X%, transparent)`.
- `src/lib/brand/tokens.ts` — lists _which_ CSS vars the guide surfaces and their labels;
  holds **no** color values (the guide reads them live via `brandColor`).
- `src/lib/brand/manifest.ts` — channel-asset specs (dimensions, format, `scale`). One
  source of truth for the UI and the exporter.
- `src/lib/brand/assets/` — `BrandArt` (dispatcher), `BannerArt`, `LogoArt` (the
  exportable artwork; each root carries `data-brand-asset={id}`).
- `src/lib/brand/starfield/` — `BrandStarfield` + `sky.ts`. `sky.ts` re-implements the
  star projection because the real one is inlined inside
  `src/lib/components/space-background/space-background.svelte` and not exported; both
  share `$lib/sky/astro.ts` + the catalog.
- `src/lib/brand/labs/trajectory-logo.ts` — the generative orbit-mark engine
  (`deriveSpec`/`renderSpec`). It has an optional `ink` override so the mark can be
  colored from `--color-primary` instead of its hardcoded fallback.
- `src/lib/brand/orbitmark.svg` — the frozen static orbit mark used as the platform
  avatar (LogoArt renders it via `<img>`).
- `src/lib/brand/favicon.ts` + `src/routes/+layout.svelte` — the favicon is a fresh
  orbit mark rolled **client-side each page load** (bold stroke, brand-violet baked in,
  transparent), lazy-imported in `requestIdleCallback`, with no `<link rel=icon>` until
  ready so no fallback flashes.
- `src/lib/trajectory/` — the reusable spacecraft-trajectory system (data + SVG render),
  extracted out of `brand/` so it can be used elsewhere. Refresh the data with
  `npm run gen:trajectories` (writes `src/lib/trajectory/trajectories.json`).

## Exporting

`npm run export:brand` boots the dev server and screenshots each asset at exact pixels
into `brand-exports/` (gitignored — regenerable). The LinkedIn banner exports at 2×
(`scale: 2` in the manifest) to stay sharp on hi-DPI. `/brand` (no params) is the gallery
with safe-zone overlays + per-asset in-page download; `/brand?asset=<id>&raw=1` renders
one asset raw for the screenshotter; `/brand/assets.json` bridges the manifest to the
Node script. Always Read an exported PNG back to judge it visually.

## Conventions

- Brand color comes from `--color-primary` only — via `brandColor()`, `var(...)`, or
  `color-mix(...)`. No stray oklch/hex violet literals.
- Keep the mark flat and monochromatic; the artwork background is the deep-space
  `--background`.

The general techniques here — building generative SVG mark generators, and exporting
web-rendered assets with a headless browser — are documented in the shared agent skills
(distributed via the `protostar` CLI).
