---
name: drift-hero
description: >-
  Architecture and conventions for the voidprojects-site homepage hero animation: the
  Matter.js PhysicsStage in $lib/physics that hosts actors sharing one world — the
  GlyphField (title glyphs drift apart on scroll, follow the cursor, get thrown, and warp
  into the GitHub button) and ProjectCards (tossed in from below on scroll, stay upright,
  eject out the bottom). Plus the separate spring-based NudgeField in $lib/nudge, the site's
  SvelteKit 5 + Tailwind 4 + shadcn-svelte conventions, the driftDebug() console tool, and
  known build/lint gotchas. Use when working on the homepage, the drift/warp animation, the
  project cards, the physics stage or actors, the Section / SpaceBackground /
  ReducedMotionNotice components, or hitting the prerender and lint quirks.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# voidprojects-site: homepage drift / warp animation

## Stack

SvelteKit 5 (runes: `$state`, `$props`, `$derived`), Tailwind v4, shadcn-svelte,
`@sveltejs/adapter-static` (every route prerendered), `matter-js` for physics. Scripts:
`npm run dev | check | lint | format | build`.

## $lib/physics — the shared world and its actors

The physics is split along two seams (see `$lib/physics/`). All framework-agnostic (no
Svelte inside). See the global skill **matter-js-dom-physics** for the general technique.
For the full pattern, see the Diátaxis-organized docs under `docs/physics/`: the
`explanation/architecture.md` (diagrams, fixed-timestep frame loop, why the nudge is a peer)
and the `how-to/` guides (add an actor, add a peer effect). Keep them in sync with changes.
There is no reference page yet (a hand-written API table drifts); it is planned to be generated
from the TypeScript source, so read `src/lib/physics/` for exact signatures.

- **`PhysicsStage` (`stage.ts`)** owns the one Matter engine, the four viewport walls, the
  one RAF loop, the single `Engine.update` per frame, pointer grab/throw, and the debug
  overlay. It knows nothing about glyphs or cards. `+page.svelte` builds one stage, `add()`s
  actors, and calls `stage.setScrollProgress(p)` once per scroll; the stage fans that to
  every actor. The loop parks when no actor reports `isBusy()`.
- **`Actor` (`actor.ts`)** is the contract: `mount/onScroll/step/sync/isBusy/dispose`. Frame
  order is every actor's `step()` (apply forces only — **never** call `Engine.update`, the
  stage owns it because the world is shared) → the stage's solver step → every actor's
  `sync()` (read bodies, write transforms). `COLLISION` categories live here: cards carry a
  mask that excludes the `FLOOR` wall so they spawn below and eject out the bottom while
  glyphs stay penned in.
- **`GlyphField` (`actors/glyph-field.ts`)** is the title/subtitle glyphs: drift/return/warp,
  cursor lean, grab-to-throw. `register(el)` → `use:drift`. Mode machine
  `idle | drifting | returning | warping`. Fires `onActiveChange(active)` so the NudgeField
  can take/hand-back the same glyphs' transforms. Tunables: `GlyphConfig` (`GLYPH_DEFAULTS`)
  plus warp module constants (`WARP_PULL`, `WARP_TANGENT`, `WARP_DAMP`, `WARP_THROAT`,
  `WARP_ABSORB`, `WARP_*_MS`, `SPREAD_JITTER_DEG`).
- **`ProjectCard` (`actors/project-card.ts`)** is one heavy, stays-upright card per instance.
  Crosses its `threshold` → tossed up from below into the mess (`uprightTorque` keeps it
  readable); scroll back below → ejected out the bottom. `register(el)` is driven by the
  `ProjectCard.svelte` component's action. Tunables: `CardConfig` (`CARD_DEFAULTS`).
- **`behaviors.ts`** holds the reusable per-step forces (`uprightTorque`, `cursorPull`) so
  they aren't duplicated across actors.
- **Grab/throw constants** (`DRAG_THRESHOLD`, `MAX_THROW_SPEED`, `WALL_THICKNESS`) live on
  the stage, since grab works across every actor's bodies.

## NudgeField — the at-rest cursor spring (separate system)

`src/lib/nudge/nudge-field.ts` is a **separate, non-Matter** spring/damper, deliberately
mutually exclusive with the drift: it owns the glyph transforms **at rest** (cursor-repel +
spring-home), drift owns them while moving. They hand off via `glyphs.onActiveChange` →
`nudge.enable/disable`. Do not fold it into the Matter stage — it is active in the opposite
phase and is intentionally cheap. Cards never use it (they are off-screen when at rest).

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

- **Frame-rate independence is a fixed-timestep accumulator (don't regress it).** Both
  `stage.ts` and `NudgeField.step()` (`nudge-field.ts`) accumulate real elapsed time from the
  rAF timestamp and run N fixed `1000/60` steps per frame (capped at `MAX_SUBSTEPS = 5` to
  avoid the spiral of death), so the sim advances at the same wall-clock rate on a 60Hz,
  144Hz, or throttled-to-30Hz display. `lastTime` is reset to `0` on park so the next wake
  doesn't bank the idle gap as elapsed time. Forces (`step()`) run once per fixed substep;
  transforms and the wall-clock-timed return/warp tweens (`sync()`) run once per rendered
  frame. **Keep all the px/step tunables as-is** — they are calibrated for a 16.67ms step;
  changing the step size silently rescales every force. See the global
  **matter-js-dom-physics** skill's frame-rate-independence section for the rationale.
- **Reduced motion is a hard no-op, and `matchMedia` is read once.** Both `PhysicsStage` and
  `NudgeField` capture `prefers-reduced-motion` in their constructor and never listen for
  `change`, so toggling the OS setting needs a reload. The full no-op is defensible, but the
  premium path is a reduced variant (opacity fade-in of the hero text) rather than a static
  jump; see the global skill's no-op-vs-reduced note before changing it.
- **No FPS-based auto-downgrade.** Nothing watches for jank on low-power devices and backs
  off; Low Power Mode is undetectable from JS, so delta-correct timing (above) is the only
  defense, not feature detection.
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
