import Matter from 'matter-js';
import type { Actor, StepCtx } from '../actor.js';
import type { PhysicsStage } from '../stage.js';
import { cursorPull } from '../behaviors.js';
import { brandViolet } from '../colors.js';

const { Bodies, Body } = Matter;

/** Tunable knobs for how the glyph drift "feels". All have sensible defaults. */
export type GlyphConfig = {
	/** Fraction of total page scroll before the title drifts apart. */
	driftThreshold: number;
	/** Duration of the eased return-to-home tween, in ms. */
	returnMs: number;
	/** Bounciness of each body. 1 = perpetual, lower = settles. */
	restitution: number;
	/**
	 * Mass per unit area (Matter's density). Every glyph shares this density, so
	 * mass = density × glyph area — a wide "W" outweighs a skinny "i" and shoves
	 * it harder on impact.
	 */
	density: number;
	/**
	 * Per-step velocity damping (Matter's frictionAir). 0 = frictionless space, so
	 * any nudge drifts forever; raise it to bleed momentum each step.
	 */
	frictionAir: number;
	/** Base outward speed (px/step) every glyph gets when drift starts. */
	baseSpeed: number;
	/** Max extra speed added at random on top of baseSpeed (range [0, this)). */
	speedJitter: number;
	/** Max tumble; each glyph gets a random angular velocity in ±this. */
	spinRate: number;
	/** Faint pull toward the cursor: velocity (px/step) added toward the mouse each step. */
	mousePull: number;
	/** Radius (px) of the cursor's influence; falls off with the square of distance. */
	mousePullRadius: number;
};

export const GLYPH_DEFAULTS: GlyphConfig = {
	driftThreshold: 0.02,
	returnMs: 1400,
	restitution: 0.3, // a soft, weighty knock rather than a lively bounce
	density: 0.001, // Matter's own default; mass then scales with glyph area
	frictionAir: 0, // frictionless space — once freed, glyphs drift forever
	baseSpeed: 0.14, // outward push at release — a real shove, then a perpetual drift
	speedJitter: 0.04,
	spinRate: 0.0025, // barely-there tumble
	mousePull: 0.0012, // faint lean toward the cursor (px/step added per step)
	mousePullRadius: 200 // only glyphs within this many px of the cursor are tugged
};

/** Max random wobble (deg) added to each glyph's outward drift direction. */
const SPREAD_JITTER_DEG = 40;

type Drifter = {
	el: HTMLElement;
	body: Matter.Body | null;
	/** Home center in viewport coords, captured when the bodies are built. */
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
/** ease-out-back: shoots past the target then settles — the "jump back in" pop. */
const easeOutBack = (t: number) => {
	const c1 = 1.70158;
	const c3 = c1 + 1;
	return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/** Warp (suck-into-button) physics + timing. */
const WARP_PULL = 0.4; // acceleration toward the pinpoint (px/step²) — the "suck"
const WARP_TANGENT = 3.5; // initial sideways speed (px/step) so glyphs arc in, not beeline
const WARP_DAMP = 0.93; // velocity bleed so orbits spiral inward instead of looping forever
const WARP_THROAT = 90; // px; inside this a glyph stops colliding and is squeezed into the point
const WARP_ABSORB = 26; // px; within this a glyph is swallowed and removed, freeing the point
const WARP_MAX_MS = 2600; // safety cap before forcing the restore
const WARP_FLASH_MS = 520; // space warps open, quasar flares, then collapses to a point
const WARP_EXPAND_FRAC = 0.42; // first slice of the flash expands; the rest collapses
const WARP_HOLD_MS = 600; // empty-title pause after the warp before the glyphs return
const WARP_OUT_MS = 800; // flash, then burst the glyphs back out from the point to home
const WARP_IN_FLASH_FRAC = 0.4; // first slice of the return is the flash; the rest bursts out

// Bipolar "quasar" jets that lance out to either side as space warps open — the
// sci-fi space-jump tell. Core is a hot violet tied to the brand --primary; the
// halo is a cyan outer flare for the pop.
const QUASAR_CORE = brandViolet(0.95);
const QUASAR_HALO = 'rgba(120, 214, 255, 0.7)';
const QUASAR_REACH = 78; // px the jets extend from each side at full flare
const QUASAR_BLUR = 16; // px base blur of a jet, grown with the flare

/** The bipolar quasar-jet drop-shadow stack, parameterized by flare strength. */
function quasarFilter(bright: number, reach: number, blur: number, core: number) {
	return (
		`brightness(${bright}) ` +
		`drop-shadow(${reach}px 0 ${blur}px ${QUASAR_CORE}) ` +
		`drop-shadow(${-reach}px 0 ${blur}px ${QUASAR_CORE}) ` +
		`drop-shadow(${reach * 1.85}px 0 ${blur * 1.5}px ${QUASAR_HALO}) ` +
		`drop-shadow(${-reach * 1.85}px 0 ${blur * 1.5}px ${QUASAR_HALO}) ` +
		`drop-shadow(0 0 ${Math.max(0, core)}px rgba(255, 255, 255, 0.95))`
	);
}

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
 * The title/subtitle glyphs as drifting rigid bodies that spread apart "in space"
 * on scroll, follow and get thrown by the cursor, ease back home, and warp (suck)
 * into the GitHub button. An {@link Actor} on a {@link PhysicsStage}: it owns its
 * glyph bodies and their DOM, while the stage owns the engine, walls, loop, and
 * grab/throw.
 */
export class GlyphField implements Actor {
	private readonly cfg: GlyphConfig;
	private readonly drifters: Drifter[] = [];
	private stage: PhysicsStage | null = null;
	private worldBuilt = false;

	private mode: Mode = 'idle';
	private returnStart = 0;

	private readonly reduceMotion: boolean;

	/**
	 * Notified whenever the field starts owning the glyphs (`true`, on drift/warp)
	 * or hands them back at rest (`false`). Lets a companion effect (e.g. a cursor
	 * nudge) cleanly take turns on the same elements' transforms. Fires
	 * synchronously before the bodies are measured, so the listener can clear its
	 * own transforms first.
	 */
	onActiveChange?: (active: boolean) => void;
	private active = false;

	// Warp (suck-into-button) animation state.
	private readonly warpCenter = { x: 0, y: 0 };
	private warpStart = 0;
	private warpArrived = false;
	private warpTargetDrifter: Drifter | null = null;
	private onWarpArrive: (() => void) | null = null;
	private warpPhase: 'pulling' | 'collapsing' | 'holding' | 'restoring' = 'pulling';
	private warpCollapseStart = 0;
	private warpHoldStart = 0;
	private warpRestoreStart = 0;

	constructor(config: Partial<GlyphConfig> = {}) {
		this.cfg = { ...GLYPH_DEFAULTS, ...config };
		this.reduceMotion =
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (typeof document !== 'undefined' && !this.reduceMotion) {
			document.addEventListener('visibilitychange', this.onVisibilityChange);
		}
	}

	mount(stage: PhysicsStage) {
		this.stage = stage;
	}

	/**
	 * Tag an element as a drifting glyph. Returns a cleanup function that
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

	onScroll(progress: number) {
		if (progress > this.cfg.driftThreshold) this.start();
		else this.return_();
	}

	/**
	 * The live Matter body backing a registered element, or null if it has none
	 * yet (the bodies only exist while the field is drifting/warping). Lets a
	 * separate effect (e.g. a {@link RelationGraph}) borrow a glyph or the GitHub
	 * button as a graph node without the field having to know about the graph.
	 */
	bodyFor(el: HTMLElement): Matter.Body | null {
		return this.drifters.find((d) => d.el === el)?.body ?? null;
	}

	/** Kick the bodies apart. Builds them on first call, re-impulses thereafter. */
	start() {
		if (this.reduceMotion || this.mode === 'drifting' || this.mode === 'warping') return;
		this.setActive(true); // hand off transforms before we read home positions
		if (!this.worldBuilt) this.buildBodies();
		else this.seedVelocities();
		this.mode = 'drifting';
		this.stage?.wake();
	}

	/** Begin easing every body back to its home position. */
	// Named `return_` because `return` is a reserved word.
	return_() {
		if (this.reduceMotion || this.mode !== 'drifting') return;
		this.stage?.clearGrab(); // drop any held glyph; the tween owns the bodies now
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
		this.stage?.wake();
	}

	/**
	 * Suck every glyph into `targetEl`, fire `onArrive` once they land, hold the
	 * empty title for a beat, then burst them back in to home. If reduced motion is
	 * set, `onArrive` fires immediately with no animation.
	 */
	warp(targetEl: HTMLElement, onArrive: () => void) {
		if (this.mode === 'warping') return;
		if (this.reduceMotion) {
			onArrive();
			return;
		}
		this.stage?.clearGrab();
		this.setActive(true); // hand off transforms before we read home positions

		// A live set of bodies is required so the glyphs collide on their way in.
		if (!this.worldBuilt) this.buildBodies();

		const target = this.drifters.find((d) => d.el === targetEl) ?? null;

		// Pinpoint sits at the top-centre of the button. Freeze the button and make it
		// a sensor so glyphs pass straight through it to the point.
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
		this.stage?.wake();
	}

	isBusy(): boolean {
		return this.mode !== 'idle';
	}

	step(ctx: StepCtx) {
		if (this.mode === 'drifting') {
			// Faint lean toward the cursor for every glyph that isn't being dragged.
			if (ctx.pointer.active && this.cfg.mousePull > 0) {
				for (const d of this.drifters) {
					if (!d.body || d.body === ctx.draggedBody) continue;
					cursorPull(d.body, ctx.pointer, this.cfg.mousePull, this.cfg.mousePullRadius);
				}
			}
		} else if (this.mode === 'warping' && this.warpPhase === 'pulling') {
			// Accelerate every loose glyph toward the pinpoint, with a velocity bleed so
			// the arcs spiral inward; the solver then resolves the pile-up at the entrance.
			const cx = this.warpCenter.x;
			const cy = this.warpCenter.y;
			for (const d of this.drifters) {
				if (d === this.warpTargetDrifter || d.absorbed || !d.body) continue;
				const dx = cx - d.body.position.x;
				const dy = cy - d.body.position.y;
				const dist = Math.hypot(dx, dy) || 1;
				Body.setVelocity(d.body, {
					x: (d.body.velocity.x + (dx / dist) * WARP_PULL) * WARP_DAMP,
					y: (d.body.velocity.y + (dy / dist) * WARP_PULL) * WARP_DAMP
				});
			}
		}
	}

	sync(ctx: StepCtx) {
		if (this.mode === 'drifting') {
			for (const d of this.drifters) {
				if (!d.body) continue;
				const dx = d.body.position.x - d.hx;
				const dy = d.body.position.y - d.hy;
				const deg = (d.body.angle * 180) / Math.PI;
				setTransform(d.el, dx, dy, deg);
			}
		} else if (this.mode === 'returning') {
			const t = Math.min(1, (ctx.now - this.returnStart) / this.cfg.returnMs);
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
				this.destroyBodies();
				this.mode = 'idle';
				this.setActive(false); // back at rest — let the nudge field take over
			}
		} else if (this.mode === 'warping') {
			this.stepWarp(ctx.now);
		}
	}

	dispose() {
		if (typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', this.onVisibilityChange);
		}
		this.destroyBodies();
	}

	/** Emit the active-state change (idempotent). Fired before the bodies are measured. */
	private setActive(active: boolean) {
		if (active === this.active) return;
		this.active = active;
		this.onActiveChange?.(active);
	}

	private buildBodies() {
		if (!this.stage) return;
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
				frictionAir: this.cfg.frictionAir,
				frictionStatic: 0
			});
			d.body = body;
			this.stage.addBody(body, { grabbable: true });
		}
		this.seedVelocities();
		this.worldBuilt = true;
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

	private destroyBodies() {
		for (const d of this.drifters) {
			if (d.body) this.stage?.removeBody(d.body);
			d.body = null;
		}
		this.worldBuilt = false;
	}

	private stepWarp(now: number) {
		const cx = this.warpCenter.x;
		const cy = this.warpCenter.y;
		const tgt = this.warpTargetDrifter;
		const tox = tgt ? cx - tgt.hx : 0; // button's own offset (0 at rest)
		const toy = tgt ? cy - tgt.hy : 0;
		const tdeg = tgt?.body ? (tgt.body.angle * 180) / Math.PI : 0;

		if (this.warpPhase === 'pulling') {
			// Forces were applied in step(); the stage stepped the solver. Now read where
			// each glyph landed and resolve absorption / the squeeze through the throat.
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
					this.stage?.removeBody(d.body);
					d.body = null;
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
			// The glyphs are in; now the button itself warps out like a space jump — space
			// stretches open and two quasar jets lance out to either side, then the whole
			// thing snaps back through the point as the new tab opens.
			const f = clamp01((now - this.warpCollapseStart) / WARP_FLASH_MS);

			// Open the link right as the warp fires.
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
				let sx: number, sy: number, bright: number, flare: number, op: number;
				if (f < WARP_EXPAND_FRAC) {
					// Expand: space warps open around the button and the jets flare out.
					const k = easeOutCubic(f / WARP_EXPAND_FRAC);
					sx = 1 + 0.26 * k; // stretch along the jet axis a touch more than across
					sy = 1 + 0.12 * k;
					bright = 1 + 2.6 * k;
					flare = k;
					op = 1;
				} else {
					// Collapse: everything snaps inward through the pinpoint and blows out
					// bright as it vanishes.
					const k = easeInExpo((f - WARP_EXPAND_FRAC) / (1 - WARP_EXPAND_FRAC));
					sx = 1.26 * (1 - k * k); // sideways lingers a beat so the jets snap in last
					sy = 1.12 * (1 - k);
					bright = 3.6 + 4 * k;
					flare = 1 - k;
					op = 1 - k * k;
				}
				// Brightest white core right at the turn from expand to collapse.
				const core = 34 * (1 - Math.abs(f - WARP_EXPAND_FRAC) / WARP_EXPAND_FRAC);
				tgt.el.style.transform = `translate3d(${tox}px, ${toy}px, 0) rotate(${tdeg}deg) scale(${sx}, ${sy})`;
				tgt.el.style.opacity = `${op}`;
				tgt.el.style.filter = quasarFilter(
					bright,
					QUASAR_REACH * flare,
					QUASAR_BLUR + 24 * flare,
					core
				);
			}

			if (f >= 1) {
				if (tgt) tgt.el.style.filter = '';
				this.warpPhase = 'holding';
				this.warpHoldStart = now;
			}
			return;
		}

		if (this.warpPhase === 'holding') {
			// The glyphs are gone and the link has opened. Hold the empty title for a
			// beat so it doesn't snap back the instant the tab opens, then fade in.
			this.hideWarpGlyphs();
			if (now - this.warpHoldStart >= WARP_HOLD_MS) {
				this.warpPhase = 'restoring';
				this.warpRestoreStart = now;
			}
			return;
		}

		// Restoring — the return "warp in": space flashes back open at the pinpoint,
		// then every glyph bursts out of that single point and expands into home with
		// an overshoot, so the title looks like it jumps back in.
		const f = clamp01((now - this.warpRestoreStart) / WARP_OUT_MS);

		if (f < WARP_IN_FLASH_FRAC) {
			// Flash: a bright point of light blooms at the pinpoint (jets lance out then
			// snap back). The glyphs stay hidden inside it, a tiny seed ready to burst.
			const k = easeOutCubic(f / WARP_IN_FLASH_FRAC);
			const flare = Math.sin(k * Math.PI); // 0 -> 1 -> 0, peaks mid-flash
			for (const d of this.drifters) {
				if (d !== tgt) setWarp(d.el, cx - d.hx, cy - d.hy, 0, 0, 0);
			}
			if (tgt) {
				setWarp(tgt.el, tox, toy, tdeg, 0.2, 1);
				tgt.el.style.filter = quasarFilter(
					1 + 4 * flare,
					QUASAR_REACH * flare,
					QUASAR_BLUR + 24 * flare,
					34 * flare
				);
			}
			return;
		}

		// Burst: fling everything out from the single point to home with an overshoot,
		// glyphs fading in as they expand.
		if (tgt) tgt.el.style.filter = '';
		const e = easeOutBack(clamp01((f - WARP_IN_FLASH_FRAC) / (1 - WARP_IN_FLASH_FRAC)));
		for (const d of this.drifters) {
			if (d === tgt) {
				// Button seeds at 0.2 (where the flash left it) and grows out to home.
				setWarp(d.el, tox * (1 - e), toy * (1 - e), tdeg * (1 - e), 0.2 + 0.8 * e, 1);
				continue;
			}
			const ox = cx - d.hx; // every glyph starts at the pinpoint
			const oy = cy - d.hy;
			setWarp(d.el, ox * (1 - e), oy * (1 - e), 0, e, clamp01(e * 1.6));
		}
		if (f >= 1) this.finishWarp();
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
		this.destroyBodies();
		this.mode = 'idle';
		this.setActive(false); // back at rest — let the nudge field take over
	}

	/** Park every glyph hidden at the pinpoint (used during the hold beat). */
	private hideWarpGlyphs() {
		const tgt = this.warpTargetDrifter;
		const cx = this.warpCenter.x;
		const cy = this.warpCenter.y;
		const tox = tgt ? cx - tgt.hx : 0;
		const toy = tgt ? cy - tgt.hy : 0;
		const tdeg = tgt?.body ? (tgt.body.angle * 180) / Math.PI : 0;
		for (const d of this.drifters) {
			if (d === tgt) setWarp(d.el, tox, toy, tdeg, 0, 0);
			else setWarp(d.el, cx - d.hx, cy - d.hy, 0, 0, 0);
		}
	}

	// A warp opens GitHub in a new tab. If the user switches to it mid-warp,
	// requestAnimationFrame pauses and the animation would otherwise freeze, then
	// snap home on return. Instead: on leaving, fire any pending arrival, hide the
	// glyphs, and park in 'holding'; on returning, start the hold timer so the title
	// fades back in (rather than popping) once they're actually looking at it.
	private readonly onVisibilityChange = () => {
		if (typeof document === 'undefined' || this.mode !== 'warping') return;
		if (document.hidden) {
			if (!this.warpArrived) {
				this.warpArrived = true;
				const cb = this.onWarpArrive;
				this.onWarpArrive = null;
				cb?.();
			}
			if (this.warpTargetDrifter) this.warpTargetDrifter.el.style.filter = '';
			this.hideWarpGlyphs();
			this.warpPhase = 'holding';
			this.warpHoldStart = Number.POSITIVE_INFINITY; // don't count down while hidden
		} else if (this.warpPhase === 'holding') {
			this.warpHoldStart = performance.now(); // back on the page — begin the fade-in beat
			this.stage?.wake();
		}
	};
}
