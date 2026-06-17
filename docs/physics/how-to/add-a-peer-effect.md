# How to add a new at-rest peer effect

This guide shows how to add an effect that is **not** part of the shared Matter world: an
independent effect like the cursor nudge, which runs in a different phase (at rest) and on its
own cheap loop. If your effect needs to collide with the glyphs or cards, add an
[actor](add-an-actor.md) instead. For why peers are kept separate, see the
[explanation](../explanation/architecture.md#why-the-nudge-is-a-peer-not-an-actor).

## 1. Build the effect as its own class

Model it on `NudgeField` (`src/lib/nudge/nudge-field.ts`): a self-contained class with its own
`requestAnimationFrame` loop, its own `enable()` / `disable()`, and a `register(el)` that returns
a cleanup function. It must:

- check `prefers-reduced-motion` and no-op if set;
- park its loop when it has settled, and wake on the next pointer move;
- integrate on a fixed timestep if it is a spring (so it feels identical at any refresh rate),
  the way `NudgeField` does.

Do **not** add it to the `PhysicsStage` and do **not** touch the Matter engine. It is a peer.

## 2. Arrange the transform handoff

If your peer writes the same element's `transform` as an actor, they must take turns; never let
both write at once. Hang the handoff off whichever system is authoritative. The existing pattern,
where the glyph drift owns the glyphs while moving and the peer owns them at rest:

```ts
// the moving system announces when it takes / releases the element
glyphs.onActiveChange = (active) => (active ? myPeer.disable() : myPeer.enable());
```

If your peer targets elements that no other system ever touches, you do not need a handoff; just
`enable()` it and let it run.

## Checklist

- [ ] The peer has its own loop and parks itself when settled.
- [ ] It never writes a transform that an actor is writing at the same time (a handoff exists).
- [ ] It checks `prefers-reduced-motion` and no-ops if set.
- [ ] It integrates on a fixed timestep if it is a spring.
- [ ] It is not added to the stage and does not touch the Matter engine.
