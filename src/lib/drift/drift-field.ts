import Matter from 'matter-js';

const { Engine, Bodies, Body, Composite, Render } = Matter;

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
	/** Base outward speed (px/step) imparted when drift starts. */
	baseSpeed: number;
	/** Per-body speed variation added on top of baseSpeed. */
	speedJitter: number;
	/** Angular velocity (spin) imparted when drift starts. */
	spinRate: number;
	/** Off-screen wall thickness that keeps bodies inside the viewport. */
	wallThickness: number;
};

export const DRIFT_DEFAULTS: DriftConfig = {
	returnMs: 1400,
	restitution: 0.7, // bouncy enough that glyph-on-glyph hits visibly shove
	density: 0.001, // Matter's own default; mass then scales with glyph area
	gravity: 0,
	baseSpeed: 0.3,
	speedJitter: 0.08,
	spinRate: 0.0205,
	wallThickness: 200
};

/** Golden angle (deg): spreads bodies in evenly-distinct directions. */
const GOLDEN_ANGLE = 137.5;

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
};

type Mode = 'idle' | 'drifting' | 'returning';

/** ease-in: barely moves at first, then rushes home. */
const easeInExpo = (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * (t - 1)));

function setTransform(el: HTMLElement, dx: number, dy: number, deg: number) {
	el.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${deg}deg)`;
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

	constructor(config: Partial<DriftConfig> = {}) {
		this.cfg = { ...DRIFT_DEFAULTS, ...config };
		this.reduceMotion =
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		this.frame = this.step.bind(this);
	}

	/**
	 * Tag an element as a drifting rigid body. Returns a cleanup function that
	 * unregisters it (suitable as a Svelte action `destroy`).
	 */
	register(el: HTMLElement): () => void {
		const d: Drifter = { el, body: null, hx: 0, hy: 0, w: 0, h: 0, sx: 0, sy: 0, sr: 0 };
		el.style.willChange = 'transform';
		this.drifters.push(d);
		return () => {
			const i = this.drifters.indexOf(d);
			if (i >= 0) this.drifters.splice(i, 1);
		};
	}

	/** Kick the bodies apart. Builds the world on first call, re-impulses thereafter. */
	start() {
		if (this.reduceMotion || this.mode === 'drifting') return;
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

	/** Tear down the world and cancel the loop. Call on unmount. */
	destroy() {
		if (this.rafId) cancelAnimationFrame(this.rafId);
		this.rafId = 0;
		this.disableDebug();
		this.destroyWorld();
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
		this.drifters.forEach((d, i) => {
			if (!d.body) return;
			const angle = (i * GOLDEN_ANGLE * Math.PI) / 180; // distinct directions
			const speed = this.cfg.baseSpeed + (i % 5) * this.cfg.speedJitter;
			Body.setVelocity(d.body, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
			Body.setAngularVelocity(d.body, (i % 2 ? -1 : 1) * this.cfg.spinRate);
		});
	}

	private destroyWorld() {
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
		}

		if (this.mode === 'idle') {
			this.rafId = 0;
			return;
		} // park loop until next scroll
		this.rafId = requestAnimationFrame(this.frame);
	}
}
