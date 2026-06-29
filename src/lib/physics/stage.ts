import Matter from 'matter-js';
import { COLLISION, type Actor, type StepCtx } from './actor.js';

const { Engine, Bodies, Body, Composite, Render, Query } = Matter;

/** Off-screen wall thickness that keeps bodies inside the viewport. */
const WALL_THICKNESS = 200;
/** Pointer travel (px) before a press-and-hold turns into a drag (vs. a click). */
const DRAG_THRESHOLD = 4;
/** Cap on throw speed (px/step) so a wild flick can't fling a body offscreen instantly. */
const MAX_THROW_SPEED = 45;
/** Fixed solver step (ms). The solver always advances by this, never a variable delta. */
const FIXED_DT = 1000 / 60;
/**
 * Cap on solver steps per rendered frame. Bounds catch-up after a stall (backgrounded
 * tab, slow load) so a long frame can't queue an ever-growing backlog of steps — the
 * "spiral of death" where each frame runs more steps, takes longer, and needs more still.
 */
const MAX_SUBSTEPS = 5;

/**
 * The shared physics world every collidable actor lives on. It owns the single
 * Matter engine (so glyphs and cards can actually bump each other), the four
 * viewport walls, the one RAF loop, the one solver step per frame, the pointer
 * grab-and-throw, and the optional debug overlay. It knows nothing about glyphs
 * or cards — they are {@link Actor}s it drives.
 *
 * Frame order: every actor's `step()` (forces only) → one `Engine.update` →
 * every actor's `sync()` (transforms). The loop parks itself once no actor
 * reports busy; an actor calls {@link wake} when it next needs frames.
 */
export class PhysicsStage {
	private readonly actors: Actor[] = [];
	private engine: Matter.Engine | null = null;
	private walls: Matter.Body[] = [];
	private rafId = 0;

	// Fixed-timestep accumulator: decouples the solver from the display refresh rate so
	// the world advances at the same wall-clock rate on a 60Hz, 144Hz, or throttled-to-30Hz
	// screen. `lastTime === 0` means "uninitialised" (first frame after a park/wake).
	private lastTime = 0;
	private accumulator = 0;

	readonly reduceMotion: boolean;
	private readonly frame: (now: number) => void;

	/** Every body added by an actor, with whether the cursor may grab it. */
	private readonly grabbable = new Set<Matter.Body>();

	// Timed cues: "run this callback after N ms", ticked by the same frame clock as the
	// physics (so they pause when the loop parks, advance at wall-clock rate, and never
	// fire under reduced motion). This is the one seam for sequenced "over time" effects
	// — a composition root schedules a few cues to play a scene out — instead of ad-hoc
	// setTimeouts scattered around. `fireAt` is in the rAF/performance.now timebase.
	private readonly cues: { fireAt: number; cb: () => void }[] = [];

	// Pointer interaction (cursor position + grab-to-throw), all in viewport coords.
	private readonly pointer = { x: 0, y: 0, active: false };
	private readonly pointerVel = { x: 0, y: 0 };

	// Finger drag during a touch scroll, in viewport coords. Tracked from touch
	// events because the pointer is cancelled the instant a touch turns into a
	// scroll, so `pointermove` stops firing. `vx`/`vy` accumulate the finger's
	// travel within a frame and are zeroed once a solver step consumes them, so the
	// plow force a glyph actor reads tracks real finger movement, not a stale delta.
	private readonly touch = { x: 0, y: 0, vx: 0, vy: 0, active: false };
	private pendingGrab: Matter.Body | null = null; // pressed a body, not yet dragging
	private dragBody: Matter.Body | null = null; // actively dragged body
	private readonly grabStart = { x: 0, y: 0 };
	private readonly dragOffset = { x: 0, y: 0 };

	// Optional Matter wireframe overlay, toggled from the console for debugging.
	private debugEnabled = false;
	private render: Matter.Render | null = null;
	private debugCanvas: HTMLCanvasElement | null = null;

	constructor() {
		this.reduceMotion =
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		this.frame = this.step.bind(this);

		if (typeof window !== 'undefined') {
			this.buildWorld();
			window.addEventListener('pointermove', this.onPointerMove, { passive: true });
			window.addEventListener('pointerdown', this.onPointerDown, { passive: true });
			window.addEventListener('pointerup', this.onPointerUp, { passive: true });
			window.addEventListener('pointercancel', this.onPointerUp, { passive: true });
			// Touch events keep firing through a scroll (the pointer does not), so they
			// are how we follow the finger to plow the glyphs as it drags past them.
			window.addEventListener('touchstart', this.onTouchStart, { passive: true });
			window.addEventListener('touchmove', this.onTouchMove, { passive: true });
			window.addEventListener('touchend', this.onTouchEnd, { passive: true });
			window.addEventListener('touchcancel', this.onTouchEnd, { passive: true });
			window.addEventListener('resize', this.onResize);
			document.addEventListener('mouseleave', this.onPointerLeave, { passive: true });
		}
	}

	/** Register an actor and let it mount. Stage must already have a world (browser only). */
	add(actor: Actor) {
		this.actors.push(actor);
		actor.mount(this);
	}

	/** The live Matter engine, or null before the browser world is built. */
	get matterEngine(): Matter.Engine | null {
		return this.engine;
	}

	/** Add a body to the shared world. `grabbable` lets the cursor pick it up and throw it. */
	addBody(body: Matter.Body, opts: { grabbable?: boolean } = {}) {
		if (!this.engine) return;
		Composite.add(this.engine.world, body);
		if (opts.grabbable) this.grabbable.add(body);
	}

	/** Remove a body from the shared world. */
	removeBody(body: Matter.Body) {
		if (this.pendingGrab === body) this.pendingGrab = null;
		if (this.dragBody === body) this.clearGrab();
		this.grabbable.delete(body);
		if (this.engine) Composite.remove(this.engine.world, body);
	}

	/**
	 * Add a constraint (a spring / stiff link between two bodies) to the shared
	 * world. Like bodies, constraints are resolved by the stage's single
	 * {@link Engine.update}, so an actor only adds/removes them — the solver does
	 * the pulling. Used by graph effects to link nodes together.
	 */
	addConstraint(constraint: Matter.Constraint) {
		if (this.engine) Composite.add(this.engine.world, constraint);
	}

	/** Remove a constraint from the shared world. */
	removeConstraint(constraint: Matter.Constraint) {
		if (this.engine) Composite.remove(this.engine.world, constraint);
	}

	/** Fan a new total-scroll progress (0-1) out to every actor, then run if needed. */
	setScrollProgress(progress: number) {
		for (const a of this.actors) a.onScroll(progress);
		this.wake();
	}

	/** Start (or keep) the RAF loop. Cheap to call repeatedly. */
	wake() {
		if (this.rafId || this.reduceMotion || !this.engine) return;
		this.rafId = requestAnimationFrame(this.frame);
	}

	/**
	 * Run `cb` after `delayMs`, timed by the stage's frame clock (not `setTimeout`), so
	 * sequenced "over time" effects stay on the same clock as the physics: they pause
	 * when the loop parks, advance at wall-clock rate across refresh rates, and are
	 * inert under reduced motion. Returns a cancel function. The stage stays awake while
	 * any cue is pending. Schedule a few of these to play out a scene.
	 */
	schedule(delayMs: number, cb: () => void): () => void {
		if (this.reduceMotion) return () => {};
		const cue = { fireAt: performance.now() + delayMs, cb };
		this.cues.push(cue);
		this.wake();
		return () => {
			const i = this.cues.indexOf(cue);
			if (i >= 0) this.cues.splice(i, 1);
		};
	}

	/** Drop any in-progress grab/drag without throwing. */
	clearGrab() {
		this.pendingGrab = null;
		this.dragBody = null;
		if (typeof document !== 'undefined') document.body.style.userSelect = '';
	}

	/** Tear down the world, loop, and listeners. Call on unmount. */
	destroy() {
		if (this.rafId) cancelAnimationFrame(this.rafId);
		this.rafId = 0;
		this.disableDebug();
		this.cues.length = 0;
		for (const a of this.actors) a.dispose();
		this.actors.length = 0;
		this.grabbable.clear();
		if (this.engine) {
			Composite.clear(this.engine.world, false);
			Engine.clear(this.engine);
		}
		this.engine = null;
		this.walls = [];
		if (typeof window !== 'undefined') {
			window.removeEventListener('pointermove', this.onPointerMove);
			window.removeEventListener('pointerdown', this.onPointerDown);
			window.removeEventListener('pointerup', this.onPointerUp);
			window.removeEventListener('pointercancel', this.onPointerUp);
			window.removeEventListener('touchstart', this.onTouchStart);
			window.removeEventListener('touchmove', this.onTouchMove);
			window.removeEventListener('touchend', this.onTouchEnd);
			window.removeEventListener('touchcancel', this.onTouchEnd);
			window.removeEventListener('resize', this.onResize);
			document.removeEventListener('mouseleave', this.onPointerLeave);
		}
	}

	/**
	 * Show a Matter wireframe overlay of the live bodies, walls, velocities, and
	 * collisions. Meant to be driven from the console; bodies only exist while
	 * actors are active, so scroll a little to populate it.
	 */
	enableDebug() {
		this.debugEnabled = true;
		this.startDebugRender();
	}

	/** Hide and tear down the wireframe overlay. */
	disableDebug() {
		this.debugEnabled = false;
		this.stopDebugRender();
	}

	private buildWorld() {
		const engine = Engine.create();
		engine.gravity.x = 0;
		engine.gravity.y = 0; // zero-g space; actors apply their own forces
		this.engine = engine;
		this.buildWalls();
		if (this.debugEnabled) this.startDebugRender();
	}

	private buildWalls() {
		if (!this.engine) return;
		if (this.walls.length) Composite.remove(this.engine.world, this.walls);
		const W = window.innerWidth;
		const H = window.innerHeight;
		const t = WALL_THICKNESS;
		// Top/left/right are solid to everyone. The floor uses its own collision
		// category so cards can pass through it while glyphs stay penned in.
		this.walls = [
			Bodies.rectangle(W / 2, -t / 2, W + 2 * t, t, { isStatic: true }), // top
			Bodies.rectangle(-t / 2, H / 2, t, H + 2 * t, { isStatic: true }), // left
			Bodies.rectangle(W + t / 2, H / 2, t, H + 2 * t, { isStatic: true }), // right
			Bodies.rectangle(W / 2, H + t / 2, W + 2 * t, t, {
				isStatic: true,
				collisionFilter: { category: COLLISION.FLOOR }
			}) // floor
		];
		Composite.add(this.engine.world, this.walls);
	}

	private step(now: number) {
		// Fire any scheduled cues whose time has come, on this same frame clock, before
		// the solver runs so a cue that adds bodies/constraints takes effect this frame.
		this.fireCues(now);

		const ctx: StepCtx = {
			now,
			dtMs: FIXED_DT,
			width: window.innerWidth,
			height: window.innerHeight,
			pointer: this.pointer,
			touch: this.touch,
			draggedBody: this.dragBody
		};

		// Advance the solver by real elapsed time, in fixed steps. rAF fires more often on a
		// high-refresh display and less often when throttled, so stepping once per frame with
		// a fixed delta would run the sim too fast or too slow; instead run however many fixed
		// steps the elapsed time bought (clamped so a stall can't spiral).
		if (this.lastTime === 0) this.lastTime = now;
		let elapsed = now - this.lastTime;
		this.lastTime = now;
		if (elapsed > MAX_SUBSTEPS * FIXED_DT) elapsed = MAX_SUBSTEPS * FIXED_DT;
		this.accumulator += elapsed;

		let steps = 0;
		while (this.accumulator >= FIXED_DT && steps < MAX_SUBSTEPS) {
			for (const a of this.actors) a.step(ctx); // forces only
			this.applyDrag(); // held body chases the cursor, shoving its neighbours
			if (this.engine) Engine.update(this.engine, FIXED_DT); // one fixed solver step
			this.accumulator -= FIXED_DT;
			steps++;
		}

		// Consume the finger's travel once it has driven a solver step, so a paused
		// finger (no fresh touchmove) stops plowing. Only clear when a step actually
		// ran, or a high-refresh frame with no substep would discard the movement.
		if (steps > 0) {
			this.touch.vx = 0;
			this.touch.vy = 0;
		}

		// Transforms (and the wall-clock-timed return/warp tweens) update once per rendered
		// frame, so they stay smooth at the display's full refresh rate even on frames that
		// ran zero solver steps.
		for (const a of this.actors) a.sync(ctx);

		// Keep the loop alive while any actor is busy or a cue is still pending, so the
		// frame clock that times the cues keeps advancing until they all fire.
		let busy = this.cues.length > 0;
		for (const a of this.actors) if (a.isBusy()) busy = true;
		if (!busy) {
			this.rafId = 0; // park until something wakes us
			this.lastTime = 0; // forget the clock so the next wake doesn't bank the idle gap
			this.accumulator = 0;
			return;
		}
		this.rafId = requestAnimationFrame(this.frame);
	}

	/**
	 * Fire (and remove) every cue whose time has come. Due cues are snapshotted and
	 * removed before any runs, so a callback may safely schedule or cancel cues.
	 */
	private fireCues(now: number) {
		if (this.cues.length === 0) return;
		const due = this.cues.filter((c) => now >= c.fireAt);
		for (const c of due) {
			const i = this.cues.indexOf(c);
			if (i >= 0) this.cues.splice(i, 1);
		}
		for (const c of due) c.cb();
	}

	/** The held body tracks the cursor; its motion becomes the throw on release. */
	private applyDrag() {
		if (!this.dragBody) return;
		const tx = this.pointer.x + this.dragOffset.x;
		const ty = this.pointer.y + this.dragOffset.y;
		Body.setVelocity(this.dragBody, {
			x: tx - this.dragBody.position.x,
			y: ty - this.dragBody.position.y
		});
	}

	private startDebugRender() {
		if (this.render || !this.engine) return;
		const canvas = document.createElement('canvas');
		canvas.style.cssText =
			'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;opacity:0.75';
		document.body.appendChild(canvas);
		this.debugCanvas = canvas;
		this.render = Render.create({
			canvas,
			engine: this.engine,
			options: {
				width: window.innerWidth,
				height: window.innerHeight,
				wireframes: true,
				showVelocity: true,
				showCollisions: true,
				showAngleIndicator: true,
				showIds: true
			}
		});
		Render.run(this.render);
	}

	private stopDebugRender() {
		if (this.render) {
			Render.stop(this.render);
			this.render = null;
		}
		if (this.debugCanvas) {
			this.debugCanvas.remove();
			this.debugCanvas = null;
		}
	}

	private readonly onPointerMove = (e: PointerEvent) => {
		this.pointerVel.x = e.clientX - this.pointer.x;
		this.pointerVel.y = e.clientY - this.pointer.y;
		this.pointer.x = e.clientX;
		this.pointer.y = e.clientY;
		this.pointer.active = true;

		// Promote a press into a drag once it travels past the click threshold.
		if (this.pendingGrab && !this.dragBody) {
			const moved = Math.hypot(e.clientX - this.grabStart.x, e.clientY - this.grabStart.y);
			if (moved > DRAG_THRESHOLD) {
				this.dragBody = this.pendingGrab;
				this.pendingGrab = null;
				this.dragOffset.x = this.dragBody.position.x - e.clientX;
				this.dragOffset.y = this.dragBody.position.y - e.clientY;
				document.body.style.userSelect = 'none';
				this.wake();
			}
		}
	};

	private readonly onPointerDown = (e: PointerEvent) => {
		if (!this.engine || this.grabbable.size === 0) return;
		const point = { x: e.clientX, y: e.clientY };
		this.pointer.x = point.x;
		this.pointer.y = point.y;
		this.pointer.active = true;
		const hit = Query.point([...this.grabbable], point)[0];
		if (!hit) return;
		// Defer the real grab until the pointer moves, so a plain click still reaches
		// whatever is underneath (e.g. the GitHub button) instead of being swallowed.
		this.pendingGrab = hit;
		this.grabStart.x = point.x;
		this.grabStart.y = point.y;
	};

	private readonly onPointerUp = () => {
		// Release a held body, flinging it with the recent pointer velocity (capped).
		if (this.dragBody) {
			const speed = Math.hypot(this.pointerVel.x, this.pointerVel.y);
			const scale = speed > MAX_THROW_SPEED ? MAX_THROW_SPEED / speed : 1;
			Body.setVelocity(this.dragBody, {
				x: this.pointerVel.x * scale,
				y: this.pointerVel.y * scale
			});
		}
		this.clearGrab();
	};

	private readonly onPointerLeave = () => {
		this.pointer.active = false;
	};

	// --- Touch tracking for the glyph "plow" -------------------------------------
	// A finger dragging during a scroll never promotes to a grab (that needs
	// pointermove, which the scroll cancels), so these only feed the plow force.

	private readonly onTouchStart = (e: TouchEvent) => {
		const t = e.touches[0];
		if (!t) return;
		this.touch.x = t.clientX;
		this.touch.y = t.clientY;
		this.touch.vx = 0;
		this.touch.vy = 0;
		this.touch.active = true;
	};

	private readonly onTouchMove = (e: TouchEvent) => {
		const t = e.touches[0];
		if (!t) return;
		// Accumulate travel since the last position; the frame zeroes it once used.
		this.touch.vx += t.clientX - this.touch.x;
		this.touch.vy += t.clientY - this.touch.y;
		this.touch.x = t.clientX;
		this.touch.y = t.clientY;
		this.touch.active = true;
		this.wake();
	};

	private readonly onTouchEnd = (e: TouchEvent) => {
		if (e.touches.length > 0) return; // other fingers still down
		this.touch.active = false;
		this.touch.vx = 0;
		this.touch.vy = 0;
	};

	private readonly onResize = () => {
		this.buildWalls();
	};
}
