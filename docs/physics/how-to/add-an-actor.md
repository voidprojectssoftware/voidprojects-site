# How to add a new physics actor

This guide shows how to add a new behavior that lives in the shared Matter world, so it collides
with the glyphs and the cards. Use an actor when your thing needs to collide; if it does not,
add a [peer effect](add-a-peer-effect.md) instead. This guide assumes you know the system; for
the why, see the [explanation](../explanation/architecture.md), and for exact signatures, read
the types in `src/lib/physics/actor.ts` and `src/lib/physics/stage.ts`.

## 1. Write the actor

Create `src/lib/physics/actors/my-thing.ts` implementing the `Actor` interface. Start from this
skeleton:

```ts
import Matter from 'matter-js';
import type { Actor, StepCtx } from '../actor.js';
import type { PhysicsStage } from '../stage.js';
// import shared forces if you need them:
// import { uprightTorque, cursorPull } from '../behaviors.js';

const { Bodies, Body } = Matter;

export class MyThing implements Actor {
	private stage: PhysicsStage | null = null;
	private el: HTMLElement | null = null;
	private body: Matter.Body | null = null;
	private hx = 0;
	private hy = 0;
	private readonly reduceMotion =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	mount(stage: PhysicsStage) {
		this.stage = stage;
	}

	// Svelte action target: use:register on the element this actor drives.
	register(el: HTMLElement): () => void {
		this.el = el;
		el.style.willChange = 'transform';
		return () => {
			this.el = null;
		};
	}

	onScroll(progress: number) {
		if (this.reduceMotion) return; // degrade gracefully
		// decide when to spawn / despawn based on progress, then stage.wake()
	}

	step() {
		// forces ONLY. never call Engine.update. runs once per fixed solver substep.
		if (!this.body) return;
		// e.g. uprightTorque(this.body, 0.02, 0.9)
		// skip the stage's dragged body if you apply a cursor force
	}

	sync() {
		// once per rendered frame: read the solved position, write the transform
		if (!this.body || !this.el) return;
		const dx = this.body.position.x - this.hx;
		const dy = this.body.position.y - this.hy;
		const deg = (this.body.angle * 180) / Math.PI;
		this.el.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${deg}deg)`;
	}

	isBusy(): boolean {
		return this.body !== null; // keep the loop alive while a body is live
	}

	dispose() {
		if (this.body) this.stage?.removeBody(this.body);
		this.body = null;
	}

	private spawn() {
		if (!this.stage || !this.el) return;
		const r = this.el.getBoundingClientRect(); // measure home, transform-free
		this.hx = r.left + r.width / 2;
		this.hy = r.top + r.height / 2;
		this.body = Bodies.rectangle(this.hx, this.hy, r.width, r.height, {
			density: 0.001,
			frictionAir: 0.01
			// add a collisionFilter (new COLLISION category) if it must ignore a wall
		});
		this.stage.addBody(this.body, { grabbable: true });
		this.stage.wake();
	}
}
```

## 2. Export it

Add it to `src/lib/physics/index.ts`.

## 3. Register it on the stage and bind its DOM

In `+page.svelte` (or a component), construct it, add it to the stage, and wire its `register`
into a Svelte action:

```ts
const thing = new MyThing();
stage.add(thing);
const myThing = (el: HTMLElement) => ({ destroy: thing.register(el) });
```

```svelte
<div use:myThing>...</div>
```

## If your body must ignore a wall

Add a new category to `COLLISION` in `actor.ts` (use the next power of two) and give the body a
`collisionFilter` whose `mask` excludes the wall's category. This is how cards pass through the
floor; see the floor wall and the card body's filter in `stage.ts` and `actors/project-card.ts`.

## Checklist

- [ ] `step` applies forces only; the engine is never stepped from the actor.
- [ ] `sync` does the once-per-frame work (reading position, writing the transform).
- [ ] World membership goes through `stage.addBody` / `stage.removeBody`.
- [ ] `isBusy()` is `true` exactly while you need frames, and you call `stage.wake()` to start.
- [ ] The home is measured with no active transform on the element.
- [ ] A new collision behavior has a new `COLLISION` category and the right mask.
- [ ] Reduced motion degrades to a static, accessible state.
- [ ] A separate at-rest effect on the same element is a [peer](add-a-peer-effect.md), not more
      code in this actor.
