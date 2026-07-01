---
name: drift-hero
description: >-
  Architecture and conventions for the voidprojects-site homepage hero animation: the
  Matter.js PhysicsStage in $lib/physics that hosts actors sharing one world — the
  GlyphField (title glyphs drift apart on scroll, follow the cursor, get thrown, and warp
  into the GitHub button) and ProjectCards (tossed in from below on scroll, stay upright,
  eject out the bottom). Plus the separate spring-based NudgeField in $lib/nudge, the site's
  SvelteKit 5 + Tailwind 4 + shadcn-svelte conventions, the driftDebug() console tool, and
  known build/lint gotchas. Also the SpaceBackground star-field canvas render (real-sky
  projection, the always-on RAF loop, its projection-cache/sprite-atlas/sine-LUT perf) and the
  ScrollTimeline right-edge scroll rail (waypoints, the arrival offset, click-to-seek). Use when
  working on the homepage, the drift/warp animation, the project cards, the physics stage or
  actors, the star field / background, the scroll timeline, the Section / SpaceBackground /
  ScrollTimeline / ReducedMotionNotice components, or hitting the prerender and lint quirks.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# voidprojects-site: homepage drift / warp animation

## Stack

SvelteKit 5 (runes: `$state`, `$props`, `$derived`), Tailwind v4, shadcn-svelte,
`@sveltejs/adapter-static` (every route prerendered), `matter-js` for physics. Scripts:
`npm run dev | check | lint | format | build`.

## $lib/physics — the shared world and its actors

The physics is split along two seams (see `$lib/physics/`). All framework-agnostic (no
Svelte inside). For the general Matter-as-DOM technique (force-directed graphs, repulsion,
the SVG edge overlay, frame-rate independence), see the matter-js physics skill available
via the protostar CLI (`protostar skills` lists what you have installed). For the
`SpaceBackground` star-field canvas render perf and the `ScrollTimeline` rail, see their
sections below.
For the full pattern, see the Diátaxis-organized docs under `docs/physics/`: the
`explanation/architecture.md` (diagrams, fixed-timestep frame loop, why the nudge is a peer)
and the `how-to/` guides (add an actor, add a peer effect). Keep them in sync with changes.
There is no reference page yet (a hand-written API table drifts); it is planned to be generated
from the TypeScript source, so read `src/lib/physics/` for exact signatures.

- **`PhysicsStage` (`stage.ts`)** owns the one Matter engine, the four viewport walls, the
  one RAF loop, the single `Engine.update` per frame, pointer grab/throw, and the debug
  overlay. It knows nothing about glyphs or cards. `+page.svelte` builds one stage, `add()`s
  actors, and calls `stage.setScrollProgress(p)` once per scroll; the stage fans that to
  every actor. The loop parks when no actor reports `isBusy()`. `stage.schedule(ms, cb)` runs a
  callback later on this same frame clock (returns a cancel fn) — the one seam for sequenced
  "over time" effects (e.g. a card's arrival scene), instead of stray `setTimeout`s; it pauses
  with the loop and is inert under reduced motion.
- **`Actor` (`actor.ts`)** is the contract: `mount/onScroll/step/sync/isBusy/dispose`. Frame
  order is every actor's `step()` (apply forces only — **never** call `Engine.update`, the
  stage owns it because the world is shared) → the stage's solver step → every actor's
  `sync()` (read bodies, write transforms). `COLLISION` categories live here: cards carry a
  mask that excludes the `FLOOR` wall so they spawn below and eject out the bottom while
  glyphs stay penned in.
- **`GlyphField` (`actors/glyph-field.ts`)** is the title/subtitle glyphs: drift/return/warp,
  cursor lean (desktop), touch plow (mobile), grab-to-throw. `register(el)` → `use:drift`. Mode
  machine `idle | drifting | returning | warping`. Fires `onActiveChange(active)` so the NudgeField
  can take/hand-back the same glyphs' transforms. While drifting it runs **one** pointer force per
  frame: a faint `cursorPull` lean toward the mouse, or — when a finger is down (`ctx.touch.active`)
  — a `cursorPush` plow that shoves the glyphs the finger drags through, so the first scroll swipe
  separates the letters by hand. `setBottomBias(el)` tags a glyph (the GitHub button): on every
  screen `readableUprightTorque` keeps it readable while drifting — it keeps its angular momentum
  but velocity-aware friction bleeds the spin (light while fast so a flick loops several times,
  firmer as it slows) plus a slight `sin(angle)` pull toward the nearest upright, so a flick coasts
  to a readable stop, never yanked backwards. `setBottomBiasActive(on)` additionally docks the same element to a
  bottom-centre hover spot on every viewport (it otherwise free-floats and snags in the glyphs and
  cards) — a damped spring eases it to the anchor (centre-x,
  `bottomAnchorYFrac` of the height, within the bottom 15%), and the body turns into a sensor so it
  slides under the cards. The page drives the engage flag from the cards' state (`onStateChange`
  count), so the button is pulled down only once a card slides in, not before. Tunables:
  `GlyphConfig` (`GLYPH_DEFAULTS`, incl. `touchPush`, `touchPushRadius`, `bottomPullStiffness`,
  `bottomPullDamp`, `bottomAnchorYFrac`, `bottomMaxSpeed`, `uprightStiffness`,
  `uprightSpinFriction`, `uprightSettleFriction`, `uprightSettleSpeed`) plus warp module constants (`WARP_PULL`, `WARP_TANGENT`,
  `WARP_DAMP`, `WARP_THROAT`, `WARP_ABSORB`, `WARP_*_MS`, `SPREAD_JITTER_DEG`).
- **`ProjectCard` (`actors/project-card.ts`)** is one heavy, stays-upright card per instance.
  Crosses its `threshold` → tossed up from below into the mess (`uprightTorque` keeps it
  readable); scroll back below → ejected out the bottom. `register(el)` is driven by the
  `ProjectCard.svelte` component's action. Exposes `get body()` and `setColliding(on)` (off makes
  it a sensor so glyphs pass through), and fires `onStateChange(state)` (`dormant | active |
ejecting`) so the page can hang a card-specific effect/scene off it. Tunables: `CardConfig`
  (`CARD_DEFAULTS`).
- **`RelationGraph` (`relation-graph.ts`)** is the Constellation card's effect: a generic,
  additive node-link graph over `{ body }` nodes. See the dedicated section below for topology,
  forces, the pulse, and the responsive hooks. Tunables: `GraphConfig` (`GRAPH_DEFAULTS`).
- **`behaviors.ts`** holds the reusable per-step forces (`uprightTorque`, `readableUprightTorque`,
  `cursorPull`, `cursorPush`) so they aren't duplicated across actors. `readableUprightTorque` keeps
  a glyph's spin but bleeds it with velocity-aware friction (light fast, firm slow) plus a slight
  `sin(angle)` pull to upright, so a flick coasts to a readable stop without being yanked backwards.
- **Grab/throw constants** (`DRAG_THRESHOLD`, `MAX_THROW_SPEED`, `WALL_THICKNESS`) live on
  the stage, since grab works across every actor's bodies. The stage also tracks the finger
  from `touch*` events into a separate `ctx.touch` (the pointer is cancelled the instant a touch
  becomes a scroll, so `pointermove` goes stale exactly when the plow needs it).

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

## The Constellation card effect (RelationGraph)

When the Constellation card tosses in, `RelationGraph` (`relation-graph.ts`) turns the
drifting glyphs into a node-link graph; it tears down when the card ejects (on `'ejecting'`,
while the hub body is still alive) and before a warp. It is a generic, additive actor: it
borrows the live glyph and card bodies, adds Matter constraints for the edges (via
`stage.addConstraint`), draws a labeled SVG edge overlay that tracks the bodies in `sync()`,
and never writes any node's transform (the owning actors still do, so no handoff is needed).
`+page.svelte` wires it via `ProjectCard.onStateChange` and builds the spec with
`glyphs.bodyFor(el)`. The arrival is a timed scene (via `stage.schedule`): the card crashes in
**solid** and shoves the glyphs around, then ~1.1s later the graph forms and the card goes
non-colliding (`setColliding(false)`) so the letters pull into formation through it, then ~1.6s
after that the card goes solid again. The scene is cancelled as a unit if the card leaves mid-way
(`onStateChange('ejecting')`).

- **Topology (built in `+page.svelte`):** each word is a cluster of per-glyph nodes chained in
  order with a short `precedes` label (character sequence). One opt-in hub link runs from the
  card to the V of Void (a cluster's `hubLabel`, drawn clipped to the card's border). The spine
  links consecutive words with dependency-grammar labels (`LINK_LABELS`). The GitHub button is
  left out of the spec, so it free-floats.
- **Forces (in `RelationGraph.step()`):** edge springs (constraints), surface-based
  mass-split repulsion so the cloud fans out, a directional flow that blows the glyphs off the
  card, a damped spring pinning the card to its anchor, and a `readableUprightTorque` on each
  chained letter (the GitHub button's behaviour with a ±`uprightReadableDeg` (~45°) band, so the
  words read but the letters sit at natural tilts rather than snapping dead vertical). The old
  center-pull is off by default. A periodic pulse travels the graph (card to V, down the spine,
  into a cycling word) and shoves the nodes it passes so they wiggle and settle, with a glowing
  dot riding along.
- **Responsive policy lives in `+page.svelte`** as hook functions on the graph, evaluated for
  the live viewport at a 768px breakpoint: `hubAnchor` (card left on desktop, bottom on
  mobile), `flowDirection` (right vs up), and `linkLengthFor` / `linkStiffnessFor` /
  `hubLengthFor` (shorter and stiffer links on mobile so the spine does not stretch tall).
- **Knobs** are in `GRAPH_DEFAULTS` (spring stiffness/damping, `intraSpread`, `repulsion`/
  `repulsionRadius`, `flowStrength`/`flowRange`, `hubAnchorStiffness`/`hubAnchorDamping`, the
  `upright*` set incl. `uprightReadableDeg` for the letter readability band, the `pulse*` set,
  colours, label sizes). The how-to is `docs/physics/how-to/add-a-card-effect.md`.

## driftDebug() / driftState() console tools

`+page.svelte` hangs two read hooks on `window` on mount. `driftDebug()` shows the Matter
wireframe overlay (`driftDebug(false)` hides it); bodies only exist while drifting/warping, so
scroll a little to populate it, and it does not show the transform-driven warp collapse (that
phase is not physics). `driftState()` returns a read-only snapshot of the **actual** animation
state — each card's `state`, whether the relationship `graph.formed`, and the GitHub `dock`
(active + the button's rendered centre).

**Assert on `driftState()`, not on rendered output.** When verifying timing/state changes
(e.g. the graph forms ~900ms after the Constellation card goes active, the button docks once a
card is up), poll `driftState()` for the source-of-truth flags rather than scraping the DOM
(counting `svg text`, matching elements by class/text, parsing computed transforms). Those
proxies break when rendering changes and pass on coincidental matches. Add a field to
`driftState()` (and a small read accessor on the actor, like `RelationGraph.formed`) when you
need to observe something new. Rendered position is the exception: `getBoundingClientRect()` on a
known ref (e.g. `githubRef`) is itself source-of-truth, but never capture a sub-second transient
with a screenshot taken in a _separate_ CLI call — the inter-command gap races the state; poll
instead.

To verify animation changes visually without a human, the `browser-verify` skill drives
`playwright-cli` to start the dev server, `eval "driftDebug(true)"`, scroll, screenshot the
hero, and read the console for Matter.js errors. It is not bundled in this repo; get it via
the protostar CLI (`protostar skills` lists what you have installed).

## SpaceBackground — the star field (always-on canvas loop)

`src/lib/components/space-background/space-background.svelte` renders the **real naked-eye sky**
(~9k HYG-catalog stars) on a full-viewport `<canvas>` behind every route (mounted in
`+layout.svelte`), dark-mode only. Each star's catalogue RA/Dec is projected through a virtual
camera; the sky drifts in real time as Earth turns, plus a faint mouse parallax. Console:
`skyView.list() / setVantage(i) / useMyLocation()`.

It is the **one RAF loop that runs even at rest** (the physics stage and NudgeField park when
idle), so it dominates idle CPU on a low-end device — the first place to look for a homepage perf
win. Its per-frame cost is kept low by three things (the general technique is the canvas-2d
render-perf skill, via the protostar CLI):

- **Projection cache.** The heavy per-star trig lives in `project()`, called only every
  `PROJECT_MS` (~100ms) — the sky drifts far slower than the frame rate. `draw()` runs every
  frame but only adds the uniform parallax offset to the cached base positions and iterates the
  `visible` (on-screen) subset. `projectDirty` forces a reproject on resize / vantage change /
  catalog load.
- **Sprite atlas.** Stars are `drawImage`'d from pre-rendered radial-gradient sprites bucketed by
  colour (`PALETTE_N` buckets), not drawn with `beginPath`/`arc`/`fill`. This also avoids the
  per-star `ctx.fillStyle = "rgb(...)"` colour-string reparse. Per-star brightness/twinkle rides
  on `globalAlpha`; the bloom is baked into a halo sprite, gated to bright stars (`bloom`).
- **Sine LUT.** Twinkle reads `SIN_LUT[(phase * TW_SCALE) & TW_MASK]` instead of `Math.sin` per
  star per frame (power-of-two table, bitwise-mask index).

Two intentional visual changes from that rework: star colour is quantized to buckets, and the
glow is a soft baked gradient rather than a hard disc — imperceptible on the tiny background
stars, tunable via the bucket count and the sprite gradient stops. Reduced motion / hidden tab
draws one static frame and parks.

## ScrollTimeline — the right-edge scroll rail

`src/lib/components/scroll-timeline/` is a slim vertical progress rail pinned to the right edge
that marks where each moment happens as you scroll, so the hero reads as "there's more below".
`+page.svelte` owns the scroll math and passes `progress` (0-1, mirrored into `scrollProgress`
state from `onScroll`), the `points`, `visible={scrolled}`, and an `onSeek` (the `seekTo` handler
`window.scrollTo`s to a waypoint, smooth unless reduced motion). Fades in once `scrolled`;
**desktop/tablet only** (`hidden sm:block`) — the right edge is tight on mobile and the cards dock
bottom-centre there.

- **Waypoints (`timelinePoints` in `+page.svelte`), in scroll order:** first **"The Void"** at
  `GLYPH_DEFAULTS.driftThreshold` (where the title glyphs start drifting apart) — imported, not
  re-typed, so it's one source of truth — then one per project at its toss `threshold` (the same
  field drives the actor and the marker). A marker lights violet (flat, **no glow** — the glow read
  worse) and scales up when `progress` reaches it.
- **`arrivalOffset` is per-point.** A project's card tosses at its `threshold` but finishes flying
  up into view a beat later, so its marker is nudged **down** a touch (`CARD_ARRIVAL_OFFSET` ~0.02)
  so reaching the dot lines up with the card actually _appearing_, not its toss. "The Void" omits
  the offset — its trigger (drift) is instant. The offset is per-point on the component, not one
  global prop, exactly so the instant trigger can opt out.
- **Sync gotcha (scroll-position vs time-based animation):** the marker is positioned by **scroll
  fraction** but the card animates in over **time** (a physics launch), so a fixed offset is exact
  only at one scroll speed — a fast flick outruns the card. Keep the offset small: the card is
  visible only slightly past its threshold on a normal scroll. For exact sync, drive the lit state
  off the card's actual on-screen presence rather than a scroll threshold (more wiring, and needs a
  reduced-motion fallback since cards don't animate then).

## Conventions

- **Components:** `src/lib/components/<name>/<name>.svelte` plus an `index.ts` barrel that
  does `export { default as Name } from './<name>.svelte';`.
- **Section** has a `glass` prop (default `true`) for the translucent blurred panel; the
  hero passes `glass={false}` so the space background shows through.
- **ProjectCard.svelte** renders a frosted-glass panel that _lenses_ the starfield behind it:
  `backdrop-filter` with light `blur` plus `brightness`/`contrast` to amplify the star points
  (black sky stays black, so only the stars bloom). It deliberately omits `saturate` — that
  washed the panel in the stars' blue and clashed with the neutral dark; brightness/contrast lift
  luminance without the color cast. Carries a GitHub repo link, or a low-key "Coming soon" note
  when `repo` is null. The actor owns the element's transform; the component owns the look.
- **Dark by default:** `app.html` sets `class="dark"`; `SpaceBackground` renders behind all
  routes via `+layout.svelte`. There is no in-page theme toggle.
- **Reduced motion:** the whole animation no-ops under `prefers-reduced-motion`, and
  `ReducedMotionNotice` tells the user why. Test with OS animations ON.
- **Hero geometry:** header is `sticky top-0 h-16`; hero is `sticky top-16`, so the hero is
  pinned at viewport y=64 regardless of scroll. Glyph home positions are therefore
  scroll-independent, which is why `warp()` can `window.scrollTo(0, 0)` without shifting the
  restoring glyphs.
- **Scroll → progress → behavior:** `onScroll` in `+page.svelte` maps `window.scrollY` to a
  0-1 `progress` (`scrollY / (scrollHeight - innerHeight)`) and fans it to the stage via
  `setScrollProgress`; the runway is a tall trailing spacer after the sticky hero (an
  `h-1250` div at the time of writing). Key fractions: glyphs drift apart past
  `GLYPH_DEFAULTS.driftThreshold` (~0.02), each card tosses in at its own
  `ProjectCard.threshold` (0.3 / 0.5 / 0.7). The band between drift-start and the first card
  is the **"limbo"** — title scattered, no card on screen yet. The page treats the two scroll
  directions asymmetrically: scrolling **down** keeps the limbo (a beat of give before the
  projects arrive), but scrolling **up** out of the projects (crossing below the lowest
  `threshold`, `Math.min(...cards.map(c => c.actor.threshold))`) smooth-scrolls home to the
  origin so the title reforms rather than stranding the user in limbo. A self-cancelling
  `autoReturning` flag guards against re-trigger and stands down at the top (`y <= 1`) or if
  the user reverses (`y > last.y`); the whole auto-return is skipped under reduced motion.
  Note `window.scrollTo({behavior:'smooth'})` is interrupted by genuine user input, which is
  what lets the reverse-cancel work.

## Known gotchas

- **Frame-rate independence is a fixed-timestep accumulator (don't regress it).** Both
  `stage.ts` and `NudgeField.step()` (`nudge-field.ts`) accumulate real elapsed time from the
  rAF timestamp and run N fixed `1000/60` steps per frame (capped at `MAX_SUBSTEPS = 5` to
  avoid the spiral of death), so the sim advances at the same wall-clock rate on a 60Hz,
  144Hz, or throttled-to-30Hz display. `lastTime` is reset to `0` on park so the next wake
  doesn't bank the idle gap as elapsed time. Forces (`step()`) run once per fixed substep;
  transforms and the wall-clock-timed return/warp tweens (`sync()`) run once per rendered
  frame. **Keep all the px/step tunables as-is** — they are calibrated for a 16.67ms step;
  changing the step size silently rescales every force. See the matter-js physics skill
  (via the protostar CLI) for the frame-rate-independence rationale.
- **Reduced motion is a hard no-op, and `matchMedia` is read once.** Both `PhysicsStage` and
  `NudgeField` capture `prefers-reduced-motion` in their constructor and never listen for
  `change`, so toggling the OS setting needs a reload. The full no-op is defensible, but the
  premium path is a reduced variant (opacity fade-in of the hero text) rather than a static
  jump; see the matter-js physics skill (via the protostar CLI) for the no-op-vs-reduced note
  before changing it.
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
- **Tab-indented source bites multi-line edits.** Every `.ts`/`.svelte` file here indents
  with tabs (prettier `useTabs`). A find-and-replace `old_string` that reconstructs the
  indentation with spaces silently fails to match across multiple lines. Copy the exact tabs
  from a fresh read of the file, or anchor on a unique single-line substring that carries no
  leading whitespace.
- Branch work happens on `VPW-*` feature branches (e.g. `VPW-8`), not `main`.
