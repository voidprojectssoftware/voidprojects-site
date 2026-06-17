---
name: drift-hero
description: >-
  Architecture and conventions for the voidprojects-site homepage hero animation: the
  Matter.js DriftField in $lib/drift that makes the title glyphs drift apart on scroll,
  follow the cursor, get thrown, and warp (suck) into the GitHub button. Also the site's
  SvelteKit 5 + Tailwind 4 + shadcn-svelte conventions, the driftDebug() console tool, and
  known build/lint gotchas. Use when working on the homepage, the drift or warp animation,
  the Section / SpaceBackground / ReducedMotionNotice components, or hitting the prerender
  and lint quirks.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# voidprojects-site: homepage drift / warp animation

## Stack

SvelteKit 5 (runes: `$state`, `$props`, `$derived`), Tailwind v4, shadcn-svelte,
`@sveltejs/adapter-static` (every route prerendered), `matter-js` for physics. Scripts:
`npm run dev | check | lint | format | build`.

## DriftField — the physics controller

`src/lib/drift/drift-field.ts` is a framework-agnostic class (no Svelte inside). See the
global skill **matter-js-dom-physics** for the general technique; this is how it is wired
here.

- `register(el)` returns a cleanup fn and is used as a Svelte action: `use:drift`.
- Scroll drives it: `+page.svelte` computes a 0-1 `progress` from total page scroll and
  calls `field.start()` past a threshold, `field.return_()` below it.
- `warp(targetEl, onArrive)` runs the suck-into-the-button animation, then calls `onArrive`.
- `enableDebug()` / `disableDebug()` toggle a Matter wireframe overlay.
- Tunables live in the `DriftConfig` object (`DRIFT_DEFAULTS`) plus module constants
  (`WARP_PULL`, `WARP_TANGENT`, `WARP_DAMP`, `WARP_THROAT`, `WARP_ABSORB`, `WARP_*_MS`,
  `SPREAD_JITTER_DEG`, `MAX_THROW_SPEED`, `DRAG_THRESHOLD`). Tune the feel there.
- Mode state machine: `idle | drifting | returning | warping`. The RAF loop parks itself
  when `idle`.

## The warp (suck into the GitHub button)

A physics gravity-well: bodies accelerate toward a pinpoint at the button's top edge,
collide/jostle on the way, arc in (tangential kick + damping spiral), get squeezed and
removed at the point. Then the button itself flashes bright and squeezes out of existence
as the link opens, and everything restores. The button body is made a sensor so glyphs
pass through it. See `stepWarp` and the `warp()` setup.

## driftDebug() console tool

`+page.svelte` hangs `window.driftDebug` on mount. In the browser console run
`driftDebug()` to show the Matter wireframe overlay, `driftDebug(false)` to hide. Bodies
only exist while drifting/warping, so scroll a little to populate it. It does not show the
transform-driven warp collapse (that phase is not physics).

To verify animation changes visually without a human, the `browser-verify` skill drives
`playwright-cli` to start the dev server, `eval "driftDebug(true)"`, scroll, screenshot the
hero, and read the console for Matter.js errors. It is not bundled in this repo; get it via
the protostar CLI (`protostar skills` lists what you have installed).

## Conventions

- **Components:** `src/lib/components/<name>/<name>.svelte` plus an `index.ts` barrel that
  does `export { default as Name } from './<name>.svelte';`.
- **Section** has a `glass` prop (default `true`) for the translucent blurred panel; the
  hero passes `glass={false}` so the space background shows through.
- **Dark by default:** `app.html` sets `class="dark"`; `SpaceBackground` renders behind all
  routes via `+layout.svelte`. There is no in-page theme toggle.
- **Reduced motion:** the whole animation no-ops under `prefers-reduced-motion`, and
  `ReducedMotionNotice` tells the user why. Test with OS animations ON.
- **Hero geometry:** header is `sticky top-0 h-16`; hero is `sticky top-16`, so the hero is
  pinned at viewport y=64 regardless of scroll. Glyph home positions are therefore
  scroll-independent, which is why `warp()` can `window.scrollTo(0, 0)` without shifting the
  restoring glyphs.

## Known gotchas

- **Prerender 404s on `/blog` and `/team`.** The header links to routes that do not exist,
  so `npm run build` fails the prerender crawl. `npm run check` (svelte-check) still passes.
  Stub the routes or add `handleHttpError` to fix the build.
- **Lint rule disabled:** `svelte/no-navigation-without-resolve` is off in `eslint.config.js`
  because the placeholder routes cannot be typed by `resolve()` yet. Re-enable once routing
  is finalized.
- **`core.autocrlf=true`:** prettier rewrites can show files as "modified" with an empty
  `git diff` (line-ending only). They normalize away on `git add`; check
  `git diff --cached --stat` for the real changes before committing.
- Branch work happens on `VPW-*` feature branches (e.g. `VPW-8`), not `main`.
