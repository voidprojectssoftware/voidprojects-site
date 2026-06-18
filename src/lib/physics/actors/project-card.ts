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
	/**
	 * Sustained downward acceleration (px/step²) while ejecting. Without it the one-shot
	 * eject speed decays against frictionAir in zero-g and the card strands mid-screen;
	 * this keeps it accelerating (toward a terminal speed of ~ejectGravity/frictionAir)
	 * until it clears the bottom and retires.
	 */
	ejectGravity: number;
	/** Angular spring stiffness keeping the card upright (readable). */
	uprightStiffness: number;
	/** Angular spring damping. */
	uprightDamping: number;
};

export const CARD_DEFAULTS: Omit<CardConfig, 'threshold'> = {
	density: 0.005, // ~5× a glyph: heavy enough to bully the title text, not get bullied
	restitution: 0.4,
	frictionAir: 0.018, // settles the toss within the viewport instead of drifting forever
	launchSpeed: 26, // fast enough that it slams up into the drifting glyphs and scatters them
	launchSpread: 4,
	ejectSpeed: 2,
	ejectGravity: 0.12, // gentle sustained fall: heavy and sluggish out the bottom (terminal ~7 px/step)
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
	private body_: Matter.Body | null = null;

	/**
	 * Notified whenever the card changes state ('active' when it tosses in,
	 * 'ejecting' when it leaves, 'dormant' once retired). Lets the composition
	 * root trigger a card-specific effect (e.g. activate a {@link RelationGraph}
	 * when this card appears) without the card knowing the effect exists.
	 */
	onStateChange?: (state: State) => void;
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

	/** The live Matter body while the card is in the mess, or null while dormant. */
	get body(): Matter.Body | null {
		return this.body_;
	}

	/**
	 * Toggle whether the card collides with other bodies. Off makes it a sensor, so
	 * glyphs pass straight through it instead of being shoved aside — the composition
	 * root uses this to let the freshly-arrived title blow past the card before it
	 * goes solid. No-op while dormant; the eject sensor swap is independent.
	 */
	setColliding(on: boolean) {
		if (this.body_) this.body_.isSensor = !on;
	}

	/** Move to a new state and notify any listener (idempotent on a no-op change). */
	private setState(state: State) {
		if (state === this.state) return;
		this.state = state;
		this.onStateChange?.(state);
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
		if (!this.body_) return;
		// Keep the card readable: spring its rotation back toward upright while it's in
		// the mess. On the way out we let it tumble freely.
		if (this.state === 'active') {
			uprightTorque(this.body_, this.cfg.uprightStiffness, this.cfg.uprightDamping);
		} else if (this.state === 'ejecting') {
			// Sustain a downward pull so frictionAir + zero-g can't strand the card
			// mid-screen; it keeps accelerating until it clears the bottom and retires.
			Body.setVelocity(this.body_, {
				x: this.body_.velocity.x,
				y: this.body_.velocity.y + this.cfg.ejectGravity
			});
		}
	}

	sync(ctx: StepCtx) {
		if (!this.body_ || !this.el) return;
		const dx = this.body_.position.x - this.hx;
		const dy = this.body_.position.y - this.hy;
		const deg = (this.body_.angle * 180) / Math.PI;
		this.el.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${deg}deg)`;

		// Ejecting: once the card has fully fallen past the bottom, retire it.
		if (this.state === 'ejecting' && this.body_.position.y - this.h / 2 > ctx.height) {
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
		this.body_ = body;
		this.el.style.opacity = '1';
		this.el.style.pointerEvents = 'auto'; // grabbable now it's in the mess
		this.stage.addBody(body, { grabbable: true });
		this.setState('active'); // fire after the body exists so listeners can read it
		this.stage.wake();
	}

	/** Drop the upright spring and shove the card down so it falls back out the bottom. */
	private eject() {
		if (!this.body_ || !this.stage) return;
		// Fire while the body is still alive so a listener (e.g. a graph effect) can
		// tear down anything attached to it before it's removed.
		this.setState('ejecting');
		// Pass through everything on the way out: as a sensor it still falls but stops
		// colliding, so it can't get jammed by a glyph pinned between it and a wall.
		this.body_.isSensor = true;
		Body.setVelocity(this.body_, { x: this.body_.velocity.x, y: this.cfg.ejectSpeed });
		this.stage.wake();
	}

	/** Remove the body and reset to dormant/off-screen. */
	private retire() {
		if (this.body_) this.stage?.removeBody(this.body_);
		this.body_ = null;
		this.setState('dormant');
		if (this.el) {
			this.el.style.opacity = '0';
			this.el.style.pointerEvents = 'none'; // dormant: don't block the hero beneath
			this.el.style.transform = '';
		}
	}
}
