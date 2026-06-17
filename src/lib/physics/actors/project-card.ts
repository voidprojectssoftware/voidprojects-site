import Matter from 'matter-js';
import { COLLISION, type Actor, type StepCtx } from '../actor.js';
import type { PhysicsStage } from '../stage.js';
import { uprightTorque } from '../behaviors.js';

const { Bodies, Body } = Matter;

/** Tunable knobs for how a card "feels" as it joins the mess. */
export type CardConfig = {
	/** Fraction of total page scroll at which this card tosses in (and below which it ejects). */
	threshold: number;
	/** Mass per unit area — cards are heavy so they shove glyphs around, not the reverse. */
	density: number;
	/** Bounciness on impact. */
	restitution: number;
	/** Per-step velocity damping. Bleeds the toss so the card slows and settles into the mess. */
	frictionAir: number;
	/** Upward launch speed (px/step) when tossed in from below the fold. */
	launchSpeed: number;
	/** Max random sideways speed (px/step) added to the launch so cards fan out. */
	launchSpread: number;
	/** Downward speed (px/step) applied on eject so the card falls back out the bottom. */
	ejectSpeed: number;
	/** Angular spring stiffness keeping the card upright (readable). */
	uprightStiffness: number;
	/** Angular spring damping. */
	uprightDamping: number;
};

export const CARD_DEFAULTS: Omit<CardConfig, 'threshold'> = {
	density: 0.005, // ~5× a glyph: heavy enough to bully the title text, not get bullied
	restitution: 0.4,
	frictionAir: 0.018, // settles the toss within the viewport instead of drifting forever
	launchSpeed: 15,
	launchSpread: 4,
	ejectSpeed: 13,
	uprightStiffness: 0.02, // gentle pull back to 0° so text stays readable while it bobs
	uprightDamping: 0.9
};

type State = 'dormant' | 'active' | 'ejecting';

/**
 * A single project card as a heavy, stays-upright rigid body. Dormant and
 * off-screen until total scroll crosses {@link CardConfig.threshold}, when it is
 * tossed up from below the fold to join the drifting glyph mess; scrolling back
 * up past the threshold ejects it back out the bottom. An {@link Actor} on the
 * shared {@link PhysicsStage}, so it collides with the glyphs and the other cards.
 */
export class ProjectCard implements Actor {
	private readonly cfg: CardConfig;
	private readonly reduceMotion: boolean;
	private stage: PhysicsStage | null = null;
	private el: HTMLElement | null = null;

	private state: State = 'dormant';
	private body: Matter.Body | null = null;
	/** Home center in viewport coords — the transform origin (and the reduced-motion resting spot). */
	private hx = 0;
	private hy = 0;
	private w = 0;
	private h = 0;

	constructor(config: Partial<CardConfig> & { threshold: number }) {
		this.cfg = { ...CARD_DEFAULTS, ...config };
		this.reduceMotion =
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	mount(stage: PhysicsStage) {
		this.stage = stage;
	}

	/** Bind the card's DOM element. Returns a cleanup fn (suitable as a Svelte action `destroy`). */
	register(el: HTMLElement): () => void {
		this.el = el;
		el.style.willChange = 'transform';
		el.style.opacity = '0'; // dormant until tossed in
		return () => {
			this.el = null;
		};
	}

	onScroll(progress: number) {
		const past = progress > this.cfg.threshold;

		// Reduced motion: no physics, just reveal the card at its home position.
		if (this.reduceMotion) {
			if (this.el) this.el.style.opacity = past ? '1' : '0';
			return;
		}

		if (past && this.state === 'dormant') this.toss();
		else if (!past && this.state === 'active') this.eject();
	}

	step() {
		if (!this.body) return;
		// Keep the card readable: spring its rotation back toward upright while it's in
		// the mess. On the way out we let it tumble freely.
		if (this.state === 'active') {
			uprightTorque(this.body, this.cfg.uprightStiffness, this.cfg.uprightDamping);
		}
	}

	sync(ctx: StepCtx) {
		if (!this.body || !this.el) return;
		const dx = this.body.position.x - this.hx;
		const dy = this.body.position.y - this.hy;
		const deg = (this.body.angle * 180) / Math.PI;
		this.el.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${deg}deg)`;

		// Ejecting: once the card has fully fallen past the bottom, retire it.
		if (this.state === 'ejecting' && this.body.position.y - this.h / 2 > ctx.height) {
			this.retire();
		}
	}

	isBusy(): boolean {
		return this.state !== 'dormant';
	}

	dispose() {
		this.retire();
	}

	/** Spawn the body below the fold and lob it up into the hero. */
	private toss() {
		if (!this.stage || !this.el) return;
		const rect = this.el.getBoundingClientRect(); // measured at home, transform-free
		this.hx = rect.left + rect.width / 2;
		this.hy = rect.top + rect.height / 2;
		this.w = Math.max(2, rect.width);
		this.h = Math.max(2, rect.height);

		const H = window.innerHeight;
		const body = Bodies.rectangle(this.hx, H + this.h, this.w, this.h, {
			density: this.cfg.density,
			restitution: this.cfg.restitution,
			friction: 0,
			frictionAir: this.cfg.frictionAir,
			frictionStatic: 0,
			// Collide with glyphs, other cards, and the side/top walls, but pass through
			// the floor so the card can fly up from below and later drop back out.
			collisionFilter: { category: COLLISION.CARD, mask: 0xffffffff & ~COLLISION.FLOOR }
		});
		Body.setVelocity(body, {
			x: (Math.random() * 2 - 1) * this.cfg.launchSpread,
			y: -this.cfg.launchSpeed // upward, into the hero
		});
		this.body = body;
		this.state = 'active';
		this.el.style.opacity = '1';
		this.el.style.pointerEvents = 'auto'; // grabbable now it's in the mess
		this.stage.addBody(body, { grabbable: true });
		this.stage.wake();
	}

	/** Drop the upright spring and shove the card down so it falls back out the bottom. */
	private eject() {
		if (!this.body || !this.stage) return;
		this.state = 'ejecting';
		Body.setVelocity(this.body, { x: this.body.velocity.x, y: this.cfg.ejectSpeed });
		this.stage.wake();
	}

	/** Remove the body and reset to dormant/off-screen. */
	private retire() {
		if (this.body) this.stage?.removeBody(this.body);
		this.body = null;
		this.state = 'dormant';
		if (this.el) {
			this.el.style.opacity = '0';
			this.el.style.pointerEvents = 'none'; // dormant: don't block the hero beneath
			this.el.style.transform = '';
		}
	}
}
