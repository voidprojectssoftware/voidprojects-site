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
/** Penetration (px) past a bounded scene's edge that {@link PhysicsStage} lets the solver settle on its own. */
const CONTAIN_SLOP = 1;
/**
 * How long (ms) after its last move the cursor still pulls in a bounded scene. A cursor
 * resting over the scene would otherwise keep bodies circling it and the loop never parks.
 */
const POINTER_LINGER_MS = 600;

export type StageOptions = {
	/**
	 * Confine the world to this element instead of the viewport. Walls sit on its edges,
	 * and every position the stage hands out (bodies, pointer, touch, {@link StepCtx}
	 * size) is relative to its top-left corner, so the scene keeps working as the page
	 * scrolls it around. The cursor only counts as present while it is over the element.
	 */
	bounds?: HTMLElement;
};

/**
 * The shared physics world every collidable actor lives on. It owns the single
 * Matter engine (so glyphs and cards can actually bump each other), the four
 * walls (the viewport's, or a {@link StageOptions.bounds} element's), the one RAF loop, the one solver step per frame, the pointer
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
	private readonly bounds: HTMLElement | null;
	private boundsObserver: ResizeObserver | null = null;
	private paused = false;

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
	private pointerInside = false;
	private lastPointerMove = 0;

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

	constructor(opts: StageOptions = {}) {
		this.bounds = opts.bounds ?? null;
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
			if (this.bounds) {
				this.boundsObserver = new ResizeObserver(this.onResize);
				this.boundsObserver.observe(this.bounds);
			}
		}
	}

	/** Viewport position of the world's (0, 0): the bounds element's corner, or the viewport's. */
	origin(): { x: number; y: number } {
		if (!this.bounds) return { x: 0, y: 0 };
		const r = this.bounds.getBoundingClientRect();
		return { x: r.left, y: r.top };
	}

	/** True while the cursor is holding a body. */
	get holding(): boolean {
		return this.dragBody !== null;
	}

	/**
	 * Stop the loop (and refuse to {@link wake}) while paused, e.g. when the scene is
	 * scrolled offscreen or the tab is hidden. Resuming wakes it; actors that are idle
	 * park it again on the next frame.
	 */
	setPaused(paused: boolean) {
		if (paused === this.paused) return;
		this.paused = paused;
		if (paused) {
			if (this.rafId) cancelAnimationFrame(this.rafId);
			this.rafId = 0;
			this.lastTime = 0;
			this.accumulator = 0;
			this.clearGrab();
		} else {
			this.wake();
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
		if (this.rafId || this.paused || this.reduceMotion || !this.engine) return;
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
		this.boundsObserver?.disconnect();
		this.boundsObserver = null;
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
		const { width: W, height: H } = this.size();
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

	private size(): { width: number; height: number } {
		if (!this.bounds) return { width: window.innerWidth, height: window.innerHeight };
		const r = this.bounds.getBoundingClientRect();
		return { width: r.width, height: r.height };
	}

	/** A viewport point in world coordinates, and whether it lies inside the world. */
	private toWorld(clientX: number, clientY: number) {
		if (!this.bounds) return { x: clientX, y: clientY, inside: true };
		const r = this.bounds.getBoundingClientRect();
		const x = clientX - r.left;
		const y = clientY - r.top;
		return { x, y, inside: x >= 0 && y >= 0 && x <= r.width && y <= r.height };
	}

	private step(now: number) {
		// Fire any scheduled cues whose time has come, on this same frame clock, before
		// the solver runs so a cue that adds bodies/constraints takes effect this frame.
		this.fireCues(now);

		const { width, height } = this.size();
		if (this.bounds) {
			this.pointer.active =
				this.pointerInside &&
				(this.dragBody !== null || now - this.lastPointerMove < POINTER_LINGER_MS);
		}
		const ctx: StepCtx = {
			now,
			dtMs: FIXED_DT,
			width,
			height,
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
			if (this.bounds) this.contain(width, height);
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
		// A bounded scene also stays up while the cursor is live over it, so its pull acts.
		let busy = this.cues.length > 0 || (this.bounds !== null && this.pointer.active);
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
	 * Push any grabbable body that sank into a wall back inside the bounds and turn it
	 * around. Matter resolves a fast hit over several steps, so a hard throw would
	 * otherwise poke past the edge of a bounded scene for a frame or two.
	 */
	private contain(width: number, height: number) {
		for (const body of this.grabbable) {
			const { min, max } = body.bounds;
			const s = CONTAIN_SLOP; // leave Matter's own resting contact alone
			const dx = min.x < -s ? -min.x : max.x > width + s ? width - max.x : 0;
			const dy = min.y < -s ? -min.y : max.y > height + s ? height - max.y : 0;
			if (dx === 0 && dy === 0) continue;
			Body.translate(body, { x: dx, y: dy });
			const v = body.velocity;
			Body.setVelocity(body, {
				x: dx !== 0 && Math.sign(v.x) !== Math.sign(dx) ? -v.x * body.restitution : v.x,
				y: dy !== 0 && Math.sign(v.y) !== Math.sign(dy) ? -v.y * body.restitution : v.y
			});
		}
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
		const p = this.toWorld(e.clientX, e.clientY);
		this.pointerVel.x = p.x - this.pointer.x;
		this.pointerVel.y = p.y - this.pointer.y;
		this.pointer.x = p.x;
		this.pointer.y = p.y;
		this.pointer.active = p.inside;
		this.pointerInside = p.inside;
		this.lastPointerMove = e.timeStamp;
		// A bounded scene parks when still, so the cursor has to wake it to be felt.
		if (this.bounds && (p.inside || this.dragBody)) this.wake();

		// Promote a press into a drag once it travels past the click threshold.
		if (this.pendingGrab && !this.dragBody) {
			const moved = Math.hypot(p.x - this.grabStart.x, p.y - this.grabStart.y);
			if (moved > DRAG_THRESHOLD) {
				this.dragBody = this.pendingGrab;
				this.pendingGrab = null;
				this.dragOffset.x = this.dragBody.position.x - p.x;
				this.dragOffset.y = this.dragBody.position.y - p.y;
				document.body.style.userSelect = 'none';
				this.wake();
			}
		}
	};

	private readonly onPointerDown = (e: PointerEvent) => {
		if (!this.engine || this.grabbable.size === 0) return;
		const p = this.toWorld(e.clientX, e.clientY);
		const point = { x: p.x, y: p.y };
		this.pointer.x = point.x;
		this.pointer.y = point.y;
		this.pointer.active = p.inside;
		this.pointerInside = p.inside;
		this.lastPointerMove = e.timeStamp;
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
		this.pointerInside = false;
	};

	// --- Touch tracking for the glyph "plow" -------------------------------------
	// A finger dragging during a scroll never promotes to a grab (that needs
	// pointermove, which the scroll cancels), so these only feed the plow force.

	private readonly onTouchStart = (e: TouchEvent) => {
		const t = e.touches[0];
		if (!t) return;
		const p = this.toWorld(t.clientX, t.clientY);
		this.touch.x = p.x;
		this.touch.y = p.y;
		this.touch.vx = 0;
		this.touch.vy = 0;
		this.touch.active = true;
	};

	private readonly onTouchMove = (e: TouchEvent) => {
		const t = e.touches[0];
		if (!t) return;
		// Accumulate travel since the last position; the frame zeroes it once used.
		const p = this.toWorld(t.clientX, t.clientY);
		this.touch.vx += p.x - this.touch.x;
		this.touch.vy += p.y - this.touch.y;
		this.touch.x = p.x;
		this.touch.y = p.y;
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
