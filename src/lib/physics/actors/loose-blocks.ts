import type Matter from 'matter-js';
import { matter } from '../matter.js';
import type { Actor, StepCtx } from '../actor.js';
import type { PhysicsStage } from '../stage.js';
import { readableUprightTorque } from '../behaviors.js';

export type LooseBlocksConfig = {
	frictionAir: number; // per-step velocity damping, so a drift or a throw coasts to a stop
	restitution: number; // bounciness when blocks hit each other or a wall
	density: number; // shared by every block, so a big card outweighs a heading
	kickSpeed: number; // base speed (px/step) each block gets when the page breaks
	kickJitter: number; // extra random speed on top of kickSpeed, in [0, this)
	spin: number; // max starting spin (rad/step), either way
	readableDeg: number; // tilt a block may rest at before it eases back toward upright
	restSpeed: number; // below this speed (px/step) everywhere, the scene counts as still and the loop parks
	returnMs: number; // duration of the eased trip home on restore
	inset: number; // px shaved off a body's top and bottom so blocks stacked flush in the layout do not start overlapping
};

export const LOOSE_BLOCK_DEFAULTS: LooseBlocksConfig = {
	frictionAir: 0.012,
	restitution: 0.5,
	density: 0.001,
	kickSpeed: 0.8,
	kickJitter: 0.8,
	spin: 0.002,
	readableDeg: 8,
	restSpeed: 0.04,
	returnMs: 700,
	inset: 3
};

type Block = {
	el: HTMLElement;
	home: { x: number; y: number }; // body centre when the element sits in its layout spot
	body: Matter.Body | null;
	from: { x: number; y: number; a: number }; // offset when the trip home began
	saved: { transform: string; transition: string; willChange: string; cursor: string };
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Ordinary page blocks (headings, paragraphs, cards) that come loose on {@link loosen}
 * and float in zero-g as grabbable bodies, then ease back on {@link restore}.
 *
 * Elements never leave the flow: each one only gets a transform relative to its layout
 * spot, so DOM order, focus order and what a screen reader reads are untouched, and
 * clearing the transform puts it back exactly, even if its home was measured stale.
 * Obstacles are static bodies that blocks bounce off but cannot move.
 */
export class LooseBlocks implements Actor {
	private stage: PhysicsStage | null = null;
	private readonly cfg: LooseBlocksConfig;
	private readonly blocks: Block[] = [];
	private readonly obstacleEls: HTMLElement[] = [];
	private obstacles: Matter.Body[] = [];
	private mode: 'idle' | 'loose' | 'returning' = 'idle';
	private returnStart = 0;

	onHome: (() => void) | null = null; // fires once the trip home ends and the inline styles are back

	constructor(cfg: Partial<LooseBlocksConfig> = {}) {
		this.cfg = { ...LOOSE_BLOCK_DEFAULTS, ...cfg };
	}

	mount(stage: PhysicsStage) {
		this.stage = stage;
	}

	register(el: HTMLElement) {
		this.blocks.push({
			el,
			home: { x: 0, y: 0 },
			body: null,
			from: { x: 0, y: 0, a: 0 },
			saved: { transform: '', transition: '', willChange: '', cursor: '' }
		});
	}

	addObstacle(el: HTMLElement) {
		this.obstacleEls.push(el);
	}

	get count(): number {
		return this.blocks.length;
	}

	/** Measure every block where it sits, give it a body and a gentle push. Needs a ready stage. */
	loosen() {
		const stage = this.stage;
		if (!stage || this.mode !== 'idle' || !stage.matterEngine) return;
		const M = matter();
		const o = stage.origin();
		const inset = this.cfg.inset;

		for (const el of this.obstacleEls) {
			const r = el.getBoundingClientRect();
			const body = M.Bodies.rectangle(
				r.left - o.x + r.width / 2,
				r.top - o.y + r.height / 2,
				r.width,
				r.height,
				{ isStatic: true }
			);
			this.obstacles.push(body);
			stage.addBody(body);
		}

		for (const b of this.blocks) {
			const r = b.el.getBoundingClientRect();
			b.home.x = r.left - o.x + r.width / 2;
			b.home.y = r.top - o.y + r.height / 2;
			const body = M.Bodies.rectangle(
				b.home.x,
				b.home.y,
				r.width, // full width, so a block held against a side wall stays inside the page
				Math.max(4, r.height - 2 * inset),
				{
					frictionAir: this.cfg.frictionAir,
					restitution: this.cfg.restitution,
					density: this.cfg.density,
					friction: 0.05
				}
			);
			const dir = Math.random() * Math.PI * 2;
			const speed = this.cfg.kickSpeed + Math.random() * this.cfg.kickJitter;
			M.Body.setVelocity(body, { x: Math.cos(dir) * speed, y: Math.sin(dir) * speed });
			M.Body.setAngularVelocity(body, (Math.random() * 2 - 1) * this.cfg.spin);
			b.body = body;
			stage.addBody(body, { grabbable: true });

			const s = b.el.style;
			b.saved = {
				transform: s.transform,
				transition: s.transition,
				willChange: s.willChange,
				cursor: s.cursor
			};
			s.transition = 'none'; // a CSS transform transition would trail the body by its duration
			s.willChange = 'transform';
			s.cursor = 'grab';
		}
		this.mode = 'loose';
		stage.wake();
	}

	/** Ease every block back to its layout spot. The bodies leave the world at once. */
	restore() {
		if (this.mode !== 'loose') return;
		for (const b of this.blocks) {
			if (b.body) {
				b.from.x = b.body.position.x - b.home.x;
				b.from.y = b.body.position.y - b.home.y;
				b.from.a = b.body.angle;
				this.stage?.removeBody(b.body);
				b.body = null;
			}
		}
		this.removeObstacles();
		this.mode = 'returning';
		this.returnStart = performance.now();
		this.stage?.wake();
	}

	isBusy(): boolean {
		if (this.mode === 'returning') return true;
		if (this.mode !== 'loose') return false;
		if (this.stage?.holding) return true;
		const rest = this.cfg.restSpeed;
		return this.blocks.some(
			(b) => b.body && (b.body.speed > rest || Math.abs(b.body.angularVelocity) > rest * 0.01)
		);
	}

	onScroll() {}

	step(ctx: StepCtx) {
		if (this.mode !== 'loose') return;
		for (const b of this.blocks) {
			if (!b.body || b.body === ctx.draggedBody) continue;
			readableUprightTorque(b.body, 0.0008, 0.99, 0.94, 0.01, this.cfg.readableDeg);
		}
	}

	sync(ctx: StepCtx) {
		if (this.mode === 'loose') {
			for (const b of this.blocks) {
				if (!b.body) continue;
				const { x, y } = b.body.position;
				b.el.style.transform = `translate3d(${x - b.home.x}px, ${y - b.home.y}px, 0) rotate(${b.body.angle}rad)`;
			}
		} else if (this.mode === 'returning') {
			const t = Math.min(1, (ctx.now - this.returnStart) / this.cfg.returnMs);
			const k = 1 - easeInOut(t);
			for (const b of this.blocks) {
				const turn = Math.round(b.from.a / (Math.PI * 2)) * Math.PI * 2; // home the short way round
				const a = turn + (b.from.a - turn) * k;
				b.el.style.transform = `translate3d(${b.from.x * k}px, ${b.from.y * k}px, 0) rotate(${a}rad)`;
			}
			if (t >= 1) {
				this.settle();
				this.onHome?.();
			}
		}
	}

	/** Put every inline style back as it was, with no animation. */
	private settle() {
		for (const b of this.blocks) {
			if (b.body) this.stage?.removeBody(b.body);
			b.body = null;
			const s = b.el.style;
			s.transform = b.saved.transform;
			s.willChange = b.saved.willChange;
			s.cursor = b.saved.cursor;
		}
		// Commit the cleared transforms before transitions come back, or a card's CSS
		// transform transition would replay the last bit of the trip (a whole turn, say).
		if (this.blocks.length) this.blocks[0].el.getBoundingClientRect();
		for (const b of this.blocks) b.el.style.transition = b.saved.transition;
		this.removeObstacles();
		this.mode = 'idle';
	}

	private removeObstacles() {
		for (const body of this.obstacles) this.stage?.removeBody(body);
		this.obstacles = [];
	}

	dispose() {
		if (this.mode !== 'idle') this.settle();
		this.blocks.length = 0;
		this.obstacleEls.length = 0;
		this.stage = null;
	}
}
