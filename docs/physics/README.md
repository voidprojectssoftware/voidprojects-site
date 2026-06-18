# Physics system

The homepage drives DOM elements (the title glyphs, the project cards) as Matter.js rigid bodies
that share one world, plus a separate at-rest cursor spring and an additive relationship-graph
effect that links bodies together when a card appears. The docs are organized by Diátaxis mode:
read for understanding, or follow to make a change.

## Explanation (understand it)

- [Understanding the physics system](explanation/architecture.md) - the two-axis design, the
  fixed-timestep frame loop, the coordinate model, actor lifecycles, why the nudge is a peer,
  and the quality goals.

## How-to guides (do a task)

- [How to add a new physics actor](how-to/add-an-actor.md)
- [How to add a new at-rest peer effect](how-to/add-a-peer-effect.md)
- [How to give a card a graph effect](how-to/add-a-card-effect.md)

## Reference (look it up)

Not written yet. A hand-maintained API table drifts out of sync with the code, so the reference
is planned to be generated from the TypeScript source later. For now, read the source in
`src/lib/physics/` (the `Actor` interface and `COLLISION` live in `actor.ts`; the `PhysicsStage`
API and tunable constants in `stage.ts`; per-actor config defaults in `actors/`; the
relationship-graph effect and its `GraphConfig` in `relation-graph.ts`).
