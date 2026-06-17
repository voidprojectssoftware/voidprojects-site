/** Tunable knobs for the cursor-nudge feel. All subtle by default. */
export type NudgeConfig = {
	/** Cursor influence radius (px). Glyphs farther than this feel nothing. */
	radius: number;
	/** Push strength: velocity (px/frame) added away from the cursor at point-blank. */
	push: number;
	/** Spring constant pulling each element back to its home (higher = snappier). */
	stiffness: number;
	/** Per-frame velocity retention (lower = more damping, settles sooner). */
	damping: number;
	/**
	 * Inertia. All forces (cursor push + spring) are divided by this, so a higher
	 * mass makes the glyph respond slowly and sluggishly — heavier — without
	 * changing where it eventually settles. 1 = weightless/snappy.
	 */
	mass: number;
	/** Clamp on how far an element can be displaced (px) — keeps it subtle. */
	maxOffset: number;
};

export const NUDGE_DEFAULTS: NudgeConfig = {
	radius: 100,
	push: 0.6,
	stiffness: 0.09,
	damping: 0.8,
	mass: 1,
	maxOffset: 12
};

type Nudgee = {
	el: HTMLElement;
	/** Home center in viewport coords, measured while at rest. */
	hx: number;
	hy: number;
	/** Current displacement from home and its velocity. */
	ox: number;
	oy: number;
	vx: number;
	vy: number;
};

const SETTLE_EPS = 0.05; // below this displacement+velocity (and no pointer) we park the loop
/** Fixed integration step (ms) so the spring feels identical at any display refresh rate. */
const NUDGE_STEP = 1000 / 60;
/** Cap on integration steps per frame, so a stall can't queue an unbounded catch-up. */
const MAX_NUDGE_SUBSTEPS = 5;

/**
 * Makes registered elements react subtly to the cursor: as the pointer passes
 * near one it gets shoved away a little, then a spring eases it back home. It's
 * a self-contained companion to (and deliberately mutually exclusive with) the
 * GlyphField drift — call {@link disable} when something else takes over the same
 * elements' transforms, {@link enable} when they're back at rest.
 *
 * Framework-agnostic: register elements, then enable/disable as state dictates.
 */
export class NudgeField {
	private readonly cfg: NudgeConfig;
	private readonly nudgees: Nudgee[] = [];
	private readonly reduceMotion: boolean;
	private readonly frame: (now: number) => void;

	private enabled = false;
	private rafId = 0;

	// Fixed-timestep accumulator, mirroring the physics stage: the spring integrates at a
	// constant 60Hz regardless of how often rAF fires. `lastTime === 0` means uninitialised.
	private lastTime = 0;
	private accumulator = 0;

	private readonly pointer = { x: 0, y: 0, active: false };

	constructor(config: Partial<NudgeConfig> = {}) {
		this.cfg = { ...NUDGE_DEFAULTS, ...config };
		this.reduceMotion =
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		this.frame = this.step.bind(this);
	}

	/** Tag an element. Returns a cleanup function (suitable as a Svelte action `destroy`). */
	register(el: HTMLElement): () => void {
		const n: Nudgee = { el, hx: 0, hy: 0, ox: 0, oy: 0, vx: 0, vy: 0 };
		this.nudgees.push(n);
		if (this.enabled) this.measure(n);
		return () => {
			const i = this.nudgees.indexOf(n);
			if (i >= 0) this.nudgees.splice(i, 1);
		};
	}

	/** Start reacting to the cursor. Re-measures home positions from the current layout. */
	enable() {
		if (this.enabled || this.reduceMotion) return;
		this.enabled = true;
		for (const n of this.nudgees) this.measure(n);
		window.addEventListener('pointermove', this.onPointerMove, { passive: true });
		window.addEventListener('pointerup', this.onPointerEnd, { passive: true });
		window.addEventListener('pointercancel', this.onPointerEnd, { passive: true });
		window.addEventListener('resize', this.onResize);
		document.addEventListener('mouseleave', this.onPointerLeave, { passive: true });
		this.ensureLoop();
	}

	/** Stop reacting and snap every element back to home, clearing its transform. */
	disable() {
		if (!this.enabled) return;
		this.enabled = false;
		if (this.rafId) cancelAnimationFrame(this.rafId);
		this.rafId = 0;
		this.lastTime = 0; // reset the fixed-step clock so a later enable() starts fresh
		this.accumulator = 0;
		window.removeEventListener('pointermove', this.onPointerMove);
		window.removeEventListener('pointerup', this.onPointerEnd);
		window.removeEventListener('pointercancel', this.onPointerEnd);
		window.removeEventListener('resize', this.onResize);
		document.removeEventListener('mouseleave', this.onPointerLeave);
		for (const n of this.nudgees) {
			n.ox = n.oy = n.vx = n.vy = 0;
			n.el.style.transform = '';
		}
	}

	/** Tear down completely. Call on unmount. */
	destroy() {
		this.disable();
		this.nudgees.length = 0;
	}

	/** Measure an element's home centre with its own offset removed. */
	private measure(n: Nudgee) {
		const r = n.el.getBoundingClientRect();
		n.hx = r.left + r.width / 2 - n.ox;
		n.hy = r.top + r.height / 2 - n.oy;
	}

	private ensureLoop() {
		if (this.rafId || !this.enabled) return;
		this.rafId = requestAnimationFrame(this.frame);
	}

	private step(now: number) {
		// Integrate the spring at a fixed 60Hz, running however many steps the real elapsed
		// time bought (clamped), so the feel is identical on a 60Hz, 144Hz, or throttled
		// display instead of settling faster the higher the refresh rate.
		if (this.lastTime === 0) this.lastTime = now;
		let elapsed = now - this.lastTime;
		this.lastTime = now;
		if (elapsed > MAX_NUDGE_SUBSTEPS * NUDGE_STEP) elapsed = MAX_NUDGE_SUBSTEPS * NUDGE_STEP;
		this.accumulator += elapsed;

		let steps = 0;
		while (this.accumulator >= NUDGE_STEP && steps < MAX_NUDGE_SUBSTEPS) {
			this.integrate();
			this.accumulator -= NUDGE_STEP;
			steps++;
		}

		// Write transforms and decide whether to keep running, once per rendered frame.
		let busy = this.pointer.active;
		for (const n of this.nudgees) {
			n.el.style.transform = `translate3d(${n.ox}px, ${n.oy}px, 0)`;
			if (Math.abs(n.ox) + Math.abs(n.oy) + Math.abs(n.vx) + Math.abs(n.vy) > SETTLE_EPS) {
				busy = true;
			}
		}

		// Park once everything has settled and the pointer has left; pointermove wakes us.
		if (!busy) {
			this.rafId = 0;
			this.lastTime = 0; // forget the clock so the next wake doesn't bank the idle gap
			this.accumulator = 0;
			return;
		}
		this.rafId = requestAnimationFrame(this.frame);
	}

	/** One fixed 60Hz spring step: cursor shove + spring-home, integrated and clamped. */
	private integrate() {
		const { radius, push, stiffness, damping, mass, maxOffset } = this.cfg;
		for (const n of this.nudgees) {
			// Sum the forces: a spring pulling home, plus a cursor shove that falls off
			// to nothing at `radius`.
			let fx = -stiffness * n.ox;
			let fy = -stiffness * n.oy;
			if (this.pointer.active) {
				const dx = n.hx + n.ox - this.pointer.x;
				const dy = n.hy + n.oy - this.pointer.y;
				const dist = Math.hypot(dx, dy);
				if (dist > 0 && dist < radius) {
					const f = push * (1 - dist / radius);
					fx += (dx / dist) * f;
					fy += (dy / dist) * f;
				}
			}

			// Integrate: acceleration = force / mass (so heavier = more sluggish),
			// then bleed velocity via damping so it settles instead of jittering.
			n.vx = (n.vx + fx / mass) * damping;
			n.vy = (n.vy + fy / mass) * damping;
			n.ox += n.vx;
			n.oy += n.vy;

			// Clamp so the effect stays subtle even right under the cursor.
			const off = Math.hypot(n.ox, n.oy);
			if (off > maxOffset) {
				const s = maxOffset / off;
				n.ox *= s;
				n.oy *= s;
			}
		}
	}

	private readonly onPointerMove = (e: PointerEvent) => {
		this.pointer.x = e.clientX;
		this.pointer.y = e.clientY;
		this.pointer.active = true;
		this.ensureLoop();
	};

	private readonly onPointerLeave = () => {
		this.pointer.active = false;
	};

	// Touch (and pen) have no lingering hover: once the finger lifts there's no
	// "move away" to relax the shove, so the glyph would stay stuck under the last
	// touch point. Release on touch/pen end so the spring carries it home. Mouse
	// keeps hovering, so its hover state is left to pointermove/mouseleave.
	private readonly onPointerEnd = (e: PointerEvent) => {
		if (e.pointerType !== 'mouse') {
			this.pointer.active = false;
			this.ensureLoop();
		}
	};

	private readonly onResize = () => {
		for (const n of this.nudgees) this.measure(n);
	};
}
