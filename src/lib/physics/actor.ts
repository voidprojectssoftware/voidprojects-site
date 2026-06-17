import type Matter from 'matter-js';
import type { PhysicsStage } from './stage.js';

/**
 * Collision categories so the shared world can let some bodies pass through some
 * walls. Cards spawn below the viewport and eject out the bottom, so they must
 * ignore the {@link COLLISION.FLOOR} wall that keeps the lightweight glyphs on
 * screen. Two bodies collide only if each one's mask includes the other's
 * category, so excluding FLOOR from a card's mask lets it slip through the floor
 * while still bumping glyphs, other cards, and the side/top walls.
 */
export const COLLISION = {
	/** Glyphs and the top/left/right walls — collides with everything. */
	DEFAULT: 0x0001,
	/** Project cards — collides with everything except the floor. */
	CARD: 0x0002,
	/** The bottom wall — solid to glyphs, transparent to cards. */
	FLOOR: 0x0004
} as const;

/** Per-frame context handed to every actor's {@link Actor.step}/{@link Actor.sync}. */
export type StepCtx = {
	/** `performance.now()` for this frame. */
	now: number;
	/** Fixed solver step in ms (always 1000/60 for a stable solver). */
	dtMs: number;
	/** Current viewport size. */
	width: number;
	height: number;
	/** Cursor position + whether the pointer is currently over the page. */
	pointer: { x: number; y: number; active: boolean };
	/** The body the stage is currently dragging, so actors skip it in their own forces. */
	draggedBody: Matter.Body | null;
};

/**
 * One self-contained behavior living on a {@link PhysicsStage}. Actors own their
 * own Matter bodies and DOM elements; the stage owns the engine, the single
 * solver step, the RAF loop, and pointer grab/throw. The frame runs every actor's
 * {@link step} (apply forces — never step the engine), then the stage steps the
 * engine once, then every actor's {@link sync} (read body positions → write DOM
 * transforms).
 */
export interface Actor {
	/** Called once when added to a stage. Store the stage to add/remove bodies and wake it. */
	mount(stage: PhysicsStage): void;
	/** Total page-scroll progress (0-1) changed. The actor decides what that means for it. */
	onScroll(progress: number): void;
	/** Apply forces / run the actor's own state machine. Must NOT call Engine.update. */
	step(ctx: StepCtx): void;
	/** Read body positions and write DOM transforms. Runs after the stage's solver step. */
	sync(ctx: StepCtx): void;
	/** True while the actor still needs animation frames; the stage parks the loop when all are idle. */
	isBusy(): boolean;
	/** Tear down. Called on stage destroy. */
	dispose(): void;
}
