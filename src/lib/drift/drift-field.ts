import Matter from 'matter-js';

const { Engine, Bodies, Body, Composite, Render, Query } = Matter;

/** Tunable knobs for how the drift "feels". All have sensible defaults. */
export type DriftConfig = {
	/** Duration of the eased return-to-home tween, in ms. */
	returnMs: number;
	/** Bounciness of each body. 1 = perpetual, lower = settles. */
	restitution: number;
	/**
	 * Mass per unit area (Matter's density). Every glyph shares this density, so
	 * mass = density × glyph area — a wide "W" outweighs a skinny "i" and shoves
	 * it harder on impact. Raise it to make collisions hit with more momentum;
	 * the absolute value barely matters, only the ratios between glyphs do.
	 */
	density: number;
	/** World gravity. 0 = floats in space; ~1 makes bodies fall and pile up. */
	gravity: number;
	/** Base outward speed (px/step) every glyph gets when drift starts. */
	baseSpeed: number;
	/** Max extra speed added at random on top of baseSpeed (range [0, this)). */
	speedJitter: number;
	/** Max tumble; each glyph gets a random angular velocity in ±this. */
	spinRate: number;
	/** Off-screen wall thickness that keeps bodies inside the viewport. */
	wallThickness: number;
	/**
	 * Faint pull toward the cursor: velocity (px/step) added toward the mouse each
	 * step, for every non-dragged glyph while the pointer is over the page. It's a
	 * steady acceleration, so it accumulates over time — keep it tiny (~0.002).
	 * Compare against baseSpeed (0.1): a value of 0.002 takes ~1s of pulling to
	 * build a drift comparable to the launch. 0 disables it.
	 */
	mousePull: number;
	/**
	 * Radius (px) of the cursor's influence. Glyphs farther than this feel nothing;
	 * inside it the pull falls off with the square of distance, so only glyphs close
	 * to the cursor are tugged meaningfully.
	 */
	mousePullRadius: number;
};

export const DRIFT_DEFAULTS: DriftConfig = {
	returnMs: 1400,
	restitution: 0.7, // bouncy enough that glyph-on-glyph hits visibly shove
	density: 0.001, // Matter's own default; mass then scales with glyph area
	gravity: 0,
	baseSpeed: 0.1, // gentle outward push — a slow drift, not a launch
	speedJitter: 0.03,
	spinRate: 0.004, // barely-there tumble
	wallThickness: 200,
	mousePull: 0.002, // faint lean toward the cursor (px/step added per step)
	mousePullRadius: 200 // only glyphs within this many px of the cursor are tugged
};

/** Max random wobble (deg) added to each glyph's outward drift direction. */
const SPREAD_JITTER_DEG = 40;

/** Pointer travel (px) before a press-and-hold turns into a drag (vs. a click). */
const DRAG_THRESHOLD = 4;

/** Cap on throw speed (px/step) so a wild flick can't fling a glyph offscreen instantly. */
const MAX_THROW_SPEED = 45;

type Drifter = {
	el: HTMLElement;
	body: Matter.Body | null;
	/** Home center in viewport coords, captured when the world is built. */
	hx: number;
	hy: number;
	/** Body size. */
	w: number;
	h: number;
	/** Offset/angle snapshot taken when the return tween begins. */
	sx: number;
	sy: number;
	sr: number;
	/** True once the glyph has been swallowed by the warp pinpoint. */
	absorbed: boolean;
};

type Mode = 'idle' | 'drifting' | 'returning' | 'warping';

/** ease-in: barely moves at first, then rushes home. */
const easeInExpo = (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * (t - 1)));
/** ease-out cubic: decelerates — used for the glyphs popping back out. */
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/** Warp (suck-into-button) physics + timing. */
const WARP_PULL = 0.4; // acceleration toward the pinpoint (px/step²) — the "suck"
const WARP_TANGENT = 3.5; // initial sideways speed (px/step) so glyphs arc in, not beeline
const WARP_DAMP = 0.93; // velocity bleed so orbits spiral inward instead of looping forever
const WARP_THROAT = 90; // px; inside this a glyph stops colliding and is squeezed into the point
const WARP_ABSORB = 26; // px; within this a glyph is swallowed and removed, freeing the point
const WARP_MAX_MS = 2600; // safety cap before forcing the restore
const WARP_FLASH_MS = 340; // button flash + squeeze-out once the glyphs are in
const WARP_OUT_MS = 550; // ease the glyphs (and button) back out to home

function setTransform(el: HTMLElement, dx: number, dy: number, deg: number) {
	el.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${deg}deg)`;
}

function setWarp(
	el: HTMLElement,
	dx: number,
	dy: number,
	deg: number,
	scale: number,
	opacity: number
) {
	el.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${deg}deg) scale(${scale})`;
	el.style.opacity = `${opacity}`;
}

// Like setWarp but with separate along/across scale — used to squeeze a glyph
// toward the pinpoint (deg points at the point; sx is along it, sy across it).
function setStretch(
	el: HTMLElement,
	dx: number,
	dy: number,
	deg: number,
	sx: number,
	sy: number,
	opacity: number
) {
	el.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${deg}deg) scale(${sx}, ${sy})`;
	el.style.opacity = `${opacity}`;
}

/**
 * Drives a set of DOM elements as rigid bodies that drift apart "in space"
 * and ease back home, using a Matter.js world. Framework-agnostic: register
 * elements, then call {@link start} / {@link return_} as scroll dictates.
 *
 * Lifecycle is a three-mode state machine: `idle` parks the RAF loop,
 * `drifting` steps the physics, `returning` tweens each body back to home.
 */
export class DriftField {
	private readonly cfg: DriftConfig;
	private readonly drifters: Drifter[] = [];
	private engine: Matter.Engine | null = null;
	private worldBuilt = false;

	private mode: Mode = 'idle';
	private returnStart = 0;
	private rafId = 0;

	private readonly reduceMotion: boolean;
	private readonly frame: (now: number) => void;

	// Optional Matter wireframe overlay, toggled from the console for debugging.
	private debugEnabled = false;
	private render: Matter.Render | null = null;
	private debugCanvas: HTMLCanvasElement | null = null;

	// Pointer interaction (cursor pull + grab-to-throw), all in viewport coords.
	private readonly pointer = { x: 0, y: 0, active: false };
	private readonly pointerVel = { x: 0, y: 0 };
	private pendingGrab: Matter.Body | null = null; // pressed a glyph, not yet dragging
	private dragBody: Matter.Body | null = null; // actively dragged glyph
	private readonly grabStart = { x: 0, y: 0 };
	private readonly dragOffset = { x: 0, y: 0 };

	// Warp (suck-into-button) animation state.
	private readonly warpCenter = { x: 0, y: 0 };
	private warpStart = 0;
	private warpArrived = false;
	private warpTargetDrifter: Drifter | null = null;
	private onWarpArrive: (() => void) | null = null;
	private warpPhase: 'pulling' | 'collapsing' | 'restoring' = 'pulling';
	private warpCollapseStart = 0;
	private warpRestoreStart = 0;

	constructor(config: Partial<DriftConfig> = {}) {
		this.cfg = { ...DRIFT_DEFAULTS, ...config };
		this.reduceMotion =
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		this.frame = this.step.bind(this);

		if (typeof window !== 'undefined' && !this.reduceMotion) {
			window.addEventListener('pointermove', this.onPointerMove, { passive: true });
			window.addEventListener('pointerdown', this.onPointerDown, { passive: true });
			window.addEventListener('pointerup', this.onPointerUp, { passive: true });
			window.addEventListener('pointercancel', this.onPointerUp, { passive: true });
			document.addEventListener('mouseleave', this.onPointerLeave, { passive: true });
		}
	}

	/**
	 * Tag an element as a drifting rigid body. Returns a cleanup function that
	 * unregisters it (suitable as a Svelte action `destroy`).
	 */
	register(el: HTMLElement): () => void {
		const d: Drifter = {
			el,
			body: null,
			hx: 0,
			hy: 0,
			w: 0,
			h: 0,
			sx: 0,
			sy: 0,
			sr: 0,
			absorbed: false
		};
		el.style.willChange = 'transform';
		this.drifters.push(d);
		return () => {
			const i = this.drifters.indexOf(d);
			if (i >= 0) this.drifters.splice(i, 1);
		};
	}

	/** Kick the bodies apart. Builds the world on first call, re-impulses thereafter. */
	start() {
		if (this.reduceMotion || this.mode === 'drifting' || this.mode === 'warping') return;
		if (!this.worldBuilt)
			this.buildWorld(); // fresh start from rest
		else this.seedVelocities(); // resuming mid-return: re-impulse in place
		this.mode = 'drifting';
		this.ensureLoop();
	}

	/** Begin easing every body back to its home position. */
	// Named `return_` because `return` is a reserved word.
	return_() {
		if (this.reduceMotion || this.mode !== 'drifting') return;
		this.clearGrab(); // drop any held glyph; the tween owns the bodies now
		for (const d of this.drifters) {
			if (d.body) {
				d.sx = d.body.position.x - d.hx;
				d.sy = d.body.position.y - d.hy;
				d.sr = (d.body.angle * 180) / Math.PI;
			} else {
				d.sx = d.sy = d.sr = 0;
			}
		}
		this.returnStart = performance.now();
		this.mode = 'returning';
		this.ensureLoop();
	}

	/**
	 * Suck every glyph into `targetEl`, fire `onArrive` once they land, then pop
	 * them back out to home. Plays a flourish before navigating. If reduced motion
	 * is set, `onArrive` fires immediately with no animation.
	 */
	warp(targetEl: HTMLElement, onArrive: () => void) {
		if (this.mode === 'warping') return;
		if (this.reduceMotion) {
			onArrive();
			return;
		}
		this.clearGrab();

		// A live physics world is required so the glyphs collide on their way in.
		if (!this.worldBuilt) this.buildWorld();

		const target = this.drifters.find((d) => d.el === targetEl) ?? null;

		// Pinpoint sits at the top-centre of the button. Freeze the button and make it
		// a sensor so glyphs pass straight through it to the point instead of piling
		// up against its underside.
		if (target?.body) {
			this.warpCenter.x = target.body.position.x;
			this.warpCenter.y = target.body.bounds.min.y;
			Body.setStatic(target.body, true);
			target.body.isSensor = true;
		} else {
			const r = targetEl.getBoundingClientRect();
			this.warpCenter.x = r.left + r.width / 2;
			this.warpCenter.y = r.top;
		}

		// Kick every other glyph sideways (same rotational sense) so the central pull
		// curves them into an arc rather than letting them beeline to the point.
		for (const d of this.drifters) {
			if (d === target || !d.body) continue;
			d.absorbed = false;
			const ox = d.body.position.x - this.warpCenter.x;
			const oy = d.body.position.y - this.warpCenter.y;
			const dist = Math.hypot(ox, oy) || 1;
			Body.setVelocity(d.body, {
				x: (-oy / dist) * WARP_TANGENT, // tangent = perpendicular to the radius
				y: (ox / dist) * WARP_TANGENT
			});
		}

		this.warpTargetDrifter = target;
		this.onWarpArrive = onArrive;
		this.warpArrived = false;
		this.warpPhase = 'pulling';
		this.warpStart = performance.now();
		this.mode = 'warping';
		this.ensureLoop();
	}

	/** Tear down the world and cancel the loop. Call on unmount. */
	destroy() {
		if (this.rafId) cancelAnimationFrame(this.rafId);
		this.rafId = 0;
		this.disableDebug();
		this.destroyWorld();
		if (typeof window !== 'undefined') {
			window.removeEventListener('pointermove', this.onPointerMove);
			window.removeEventListener('pointerdown', this.onPointerDown);
			window.removeEventListener('pointerup', this.onPointerUp);
			window.removeEventListener('pointercancel', this.onPointerUp);
			document.removeEventListener('mouseleave', this.onPointerLeave);
		}
	}

	/**
	 * Show a Matter wireframe overlay of the live bodies, walls, velocities, and
	 * collisions. Bodies only exist while drifting, so the overlay appears once
	 * you scroll the title into drift and clears when it settles home. Meant to
	 * be driven from the console.
	 */
	enableDebug() {
		this.debugEnabled = true;
		if (this.engine) this.startDebugRender();
	}

	/** Hide and tear down the wireframe overlay. */
	disableDebug() {
		this.debugEnabled = false;
		this.stopDebugRender();
	}

	private buildWorld() {
		const engine = Engine.create();
		engine.gravity.x = 0;
		engine.gravity.y = this.cfg.gravity;

		const W = window.innerWidth;
		const H = window.innerHeight;
		const t = this.cfg.wallThickness;
		Composite.add(engine.world, [
			Bodies.rectangle(W / 2, -t / 2, W + 2 * t, t, { isStatic: true }), // top
			Bodies.rectangle(W / 2, H + t / 2, W + 2 * t, t, { isStatic: true }), // bottom
			Bodies.rectangle(-t / 2, H / 2, t, H + 2 * t, { isStatic: true }), // left
			Bodies.rectangle(W + t / 2, H / 2, t, H + 2 * t, { isStatic: true }) // right
		]);

		for (const d of this.drifters) {
			const rect = d.el.getBoundingClientRect(); // read once, at home (no active transform)
			d.hx = rect.left + rect.width / 2;
			d.hy = rect.top + rect.height / 2;
			d.w = Math.max(2, rect.width - 1); // tiny shrink avoids spawn overlap jitter
			d.h = Math.max(2, rect.height - 1);
			const body = Bodies.rectangle(d.hx, d.hy, d.w, d.h, {
				restitution: this.cfg.restitution,
				density: this.cfg.density, // mass = density × area → bigger glyphs carry more momentum
				friction: 0,
				frictionAir: 0,
				frictionStatic: 0
			});
			d.body = body;
			Composite.add(engine.world, body);
		}

		this.engine = engine;
		this.seedVelocities();
		this.worldBuilt = true;
		if (this.debugEnabled) this.startDebugRender();
	}

	private seedVelocities() {
		const live = this.drifters.filter((d) => d.body);
		if (live.length === 0) return;

		// Cluster centroid, so each glyph drifts away from the group rather than
		// in a fixed pattern.
		let cx = 0;
		let cy = 0;
		for (const d of live) {
			cx += d.body!.position.x;
			cy += d.body!.position.y;
		}
		cx /= live.length;
		cy /= live.length;

		const maxWobble = (SPREAD_JITTER_DEG * Math.PI) / 180;
		for (const d of live) {
			const body = d.body!;
			// Outward from the centroid; glyphs sitting on the centroid get a random heading.
			let dirX = body.position.x - cx;
			let dirY = body.position.y - cy;
			if (dirX === 0 && dirY === 0) {
				const a = Math.random() * Math.PI * 2;
				dirX = Math.cos(a);
				dirY = Math.sin(a);
			}
			const angle = Math.atan2(dirY, dirX) + (Math.random() * 2 - 1) * maxWobble;
			const speed = this.cfg.baseSpeed + Math.random() * this.cfg.speedJitter;
			Body.setVelocity(body, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
			Body.setAngularVelocity(body, (Math.random() * 2 - 1) * this.cfg.spinRate);
		}
	}

	private destroyWorld() {
		this.clearGrab();
		this.stopDebugRender(); // detaches from the engine we're about to clear
		if (this.engine) {
			Composite.clear(this.engine.world, false);
			Engine.clear(this.engine);
		}
		this.engine = null;
		this.worldBuilt = false;
		for (const d of this.drifters) d.body = null;
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

	private ensureLoop() {
		if (this.rafId || this.reduceMotion) return;
		this.rafId = requestAnimationFrame(this.frame);
	}

	private step(now: number) {
		if (this.mode === 'drifting') {
			this.applyPointerForces(); // cursor pull + held-glyph follow, before the solver
			if (this.engine) Engine.update(this.engine, 1000 / 60); // fixed step = stable solver
			for (const d of this.drifters) {
				if (!d.body) continue;
				const dx = d.body.position.x - d.hx;
				const dy = d.body.position.y - d.hy;
				const deg = (d.body.angle * 180) / Math.PI;
				setTransform(d.el, dx, dy, deg);
			}
		} else if (this.mode === 'returning') {
			const t = Math.min(1, (now - this.returnStart) / this.cfg.returnMs);
			const k = 1 - easeInExpo(t); // 1 -> 0, slow then fast
			for (const d of this.drifters) {
				const dx = d.sx * k;
				const dy = d.sy * k;
				const deg = d.sr * k;
				setTransform(d.el, dx, dy, deg);
				if (d.body) {
					// keep the body glued to the tween so physics can resume cleanly
					Body.setPosition(d.body, { x: d.hx + dx, y: d.hy + dy });
					Body.setAngle(d.body, (deg * Math.PI) / 180);
					Body.setVelocity(d.body, { x: 0, y: 0 });
					Body.setAngularVelocity(d.body, 0);
				}
			}
			if (t >= 1) {
				for (const d of this.drifters) setTransform(d.el, 0, 0, 0);
				this.destroyWorld();
				this.mode = 'idle';
			}
		} else if (this.mode === 'warping') {
			this.stepWarp(now);
		}

		if (this.mode === 'idle') {
			this.rafId = 0;
			return;
		} // park loop until next scroll
		this.rafId = requestAnimationFrame(this.frame);
	}

	private stepWarp(now: number) {
		const cx = this.warpCenter.x;
		const cy = this.warpCenter.y;
		const tgt = this.warpTargetDrifter;
		const tox = tgt ? cx - tgt.hx : 0; // button's own offset (0 at rest)
		const toy = tgt ? cy - tgt.hy : 0;
		const tdeg = tgt?.body ? (tgt.body.angle * 180) / Math.PI : 0;

		if (this.warpPhase === 'pulling') {
			// Accelerate every loose glyph toward the pinpoint, with a velocity bleed so
			// the arcs spiral inward, then let the solver resolve the pile-up as they
			// collide rushing the entrance.
			for (const d of this.drifters) {
				if (d === tgt || d.absorbed || !d.body) continue;
				const dx = cx - d.body.position.x;
				const dy = cy - d.body.position.y;
				const dist = Math.hypot(dx, dy) || 1;
				Body.setVelocity(d.body, {
					x: (d.body.velocity.x + (dx / dist) * WARP_PULL) * WARP_DAMP,
					y: (d.body.velocity.y + (dy / dist) * WARP_PULL) * WARP_DAMP
				});
			}
			if (this.engine) Engine.update(this.engine, 1000 / 60);

			let allIn = true;
			for (const d of this.drifters) {
				if (d === tgt) {
					const p = clamp01((now - this.warpStart) / 400);
					setWarp(d.el, tox, toy, tdeg, 1 + 0.12 * Math.sin(p * Math.PI), 1);
					continue;
				}
				if (d.absorbed) {
					setWarp(d.el, cx - d.hx, cy - d.hy, 0, 0, 0);
					continue;
				}
				if (!d.body) continue;
				const dist = Math.hypot(cx - d.body.position.x, cy - d.body.position.y);
				if (dist < WARP_ABSORB) {
					// Swallowed: remove it so the point clears for the glyphs behind it.
					d.absorbed = true;
					if (this.engine) Composite.remove(this.engine.world, d.body);
					setWarp(d.el, cx - d.hx, cy - d.hy, 0, 0, 0);
					continue;
				}
				allIn = false;
				const px = d.body.position.x;
				const py = d.body.position.y;
				if (dist < WARP_THROAT) {
					// Close in: stop colliding so it slides through the eye without jamming the
					// others, then squeeze toward the pinpoint — stretch along the pull, pinch
					// across it, and fade, so it looks drawn through a point before vanishing.
					d.body.isSensor = true;
					const t = clamp01(dist / WARP_THROAT);
					const ang = (Math.atan2(cy - py, cx - px) * 180) / Math.PI;
					setStretch(d.el, px - d.hx, py - d.hy, ang, Math.sqrt(t), t, t);
				} else {
					const deg = (d.body.angle * 180) / Math.PI;
					setWarp(d.el, px - d.hx, py - d.hy, deg, 1, 1);
				}
			}

			if (allIn || now - this.warpStart > WARP_MAX_MS) {
				// Snapshot where each glyph ended so it can ease back home from there.
				for (const d of this.drifters) {
					if (d === tgt) continue;
					if (d.absorbed || !d.body) {
						d.sx = cx - d.hx;
						d.sy = cy - d.hy;
						d.sr = 0;
					} else {
						d.sx = d.body.position.x - d.hx;
						d.sy = d.body.position.y - d.hy;
						d.sr = (d.body.angle * 180) / Math.PI;
					}
				}
				this.warpPhase = 'collapsing';
				this.warpCollapseStart = now;
			}
			return;
		}

		if (this.warpPhase === 'collapsing') {
			// The glyphs are in; now the button itself warps out — a bright flash, then it
			// squeezes to a line and pinches to nothing as the new tab opens.
			const f = clamp01((now - this.warpCollapseStart) / WARP_FLASH_MS);

			// Open the link right as the flash fires.
			if (!this.warpArrived) {
				this.warpArrived = true;
				const cb = this.onWarpArrive;
				this.onWarpArrive = null;
				cb?.();
			}

			// Keep the (already-absorbed) glyphs hidden during the flash.
			for (const d of this.drifters) {
				if (d !== tgt) setWarp(d.el, cx - d.hx, cy - d.hy, 0, 0, 0);
			}

			if (tgt) {
				let sx: number, sy: number, bright: number, op: number;
				if (f < 0.45) {
					const k = f / 0.45; // flash up and collapse to a bright slit
					sx = 1;
					sy = 1 - 0.95 * k;
					bright = 1 + 6 * k;
					op = 1;
				} else {
					const k = (f - 0.45) / 0.55; // slit pinches to a point and fades
					sx = 1 - k;
					sy = 0.05;
					bright = 7 - 5 * k;
					op = 1 - k * k;
				}
				const glow = 26 * (1 - Math.abs(f - 0.4) / 0.4);
				tgt.el.style.transform = `translate3d(${tox}px, ${toy}px, 0) rotate(${tdeg}deg) scale(${sx}, ${sy})`;
				tgt.el.style.opacity = `${op}`;
				tgt.el.style.filter = `brightness(${bright}) drop-shadow(0 0 ${Math.max(0, glow)}px rgba(255,255,255,0.9))`;
			}

			if (f >= 1) {
				if (tgt) tgt.el.style.filter = '';
				this.warpPhase = 'restoring';
				this.warpRestoreStart = now;
			}
			return;
		}

		// Restoring — ease each glyph back home, and warp the button back into existence.
		const e = easeOutCubic(clamp01((now - this.warpRestoreStart) / WARP_OUT_MS));
		for (const d of this.drifters) {
			if (d === tgt) {
				setWarp(d.el, tox, toy, tdeg, e, e); // grow back from the point it vanished to
				continue;
			}
			setWarp(d.el, d.sx * (1 - e), d.sy * (1 - e), d.sr * (1 - e), e, e);
		}
		if (e >= 1) this.finishWarp();
	}

	private finishWarp() {
		for (const d of this.drifters) {
			setTransform(d.el, 0, 0, 0);
			d.el.style.opacity = '';
			d.el.style.filter = '';
		}
		this.warpTargetDrifter = null;
		this.warpArrived = false;
		this.onWarpArrive = null;
		this.destroyWorld();
		this.mode = 'idle';
	}

	private applyPointerForces() {
		// Faint lean toward the cursor for every glyph that isn't being held. Nudge
		// velocity directly (px/step) rather than via applyForce — Matter scales
		// forces by deltaTime², which makes "force" units wildly unintuitive here.
		if (this.pointer.active && this.cfg.mousePull > 0) {
			const radius = this.cfg.mousePullRadius;
			for (const d of this.drifters) {
				const body = d.body;
				if (!body || body === this.dragBody) continue;
				const dx = this.pointer.x - body.position.x;
				const dy = this.pointer.y - body.position.y;
				const dist = Math.hypot(dx, dy);
				if (dist === 0 || dist > radius) continue; // outside the cursor's reach
				// Quadratic falloff: full strength at the cursor, nothing at the edge.
				const falloff = (1 - dist / radius) ** 2;
				const pull = this.cfg.mousePull * falloff;
				Body.setVelocity(body, {
					x: body.velocity.x + (dx / dist) * pull,
					y: body.velocity.y + (dy / dist) * pull
				});
			}
		}

		// Held glyph chases the cursor; its motion shoves neighbours and becomes the throw.
		if (this.dragBody) {
			const tx = this.pointer.x + this.dragOffset.x;
			const ty = this.pointer.y + this.dragOffset.y;
			Body.setVelocity(this.dragBody, {
				x: tx - this.dragBody.position.x,
				y: ty - this.dragBody.position.y
			});
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
			}
		}
	};

	private readonly onPointerDown = (e: PointerEvent) => {
		if (this.mode !== 'drifting') return; // bodies only exist while drifting
		const point = { x: e.clientX, y: e.clientY };
		this.pointer.x = point.x;
		this.pointer.y = point.y;
		this.pointer.active = true;
		const bodies = this.drifters.map((d) => d.body).filter((b): b is Matter.Body => b !== null);
		const hit = Query.point(bodies, point)[0];
		if (!hit) return;
		// Defer the real grab until the pointer moves, so a plain click still reaches
		// whatever is underneath (e.g. the GitHub button) instead of being swallowed.
		this.pendingGrab = hit;
		this.grabStart.x = point.x;
		this.grabStart.y = point.y;
	};

	private readonly onPointerUp = () => {
		this.releaseDrag();
	};

	private readonly onPointerLeave = () => {
		this.pointer.active = false;
	};

	/** Release a held glyph, flinging it with the recent pointer velocity (capped). */
	private releaseDrag() {
		if (this.dragBody) {
			const speed = Math.hypot(this.pointerVel.x, this.pointerVel.y);
			const scale = speed > MAX_THROW_SPEED ? MAX_THROW_SPEED / speed : 1;
			Body.setVelocity(this.dragBody, {
				x: this.pointerVel.x * scale,
				y: this.pointerVel.y * scale
			});
		}
		this.clearGrab();
	}

	/** Drop grab/drag state without applying a throw. */
	private clearGrab() {
		this.pendingGrab = null;
		this.dragBody = null;
		if (typeof document !== 'undefined') document.body.style.userSelect = '';
	}
}
