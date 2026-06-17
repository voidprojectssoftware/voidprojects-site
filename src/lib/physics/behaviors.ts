import Matter from 'matter-js';

const { Body } = Matter;

/**
 * Reusable per-step forces shared across actors. Each one nudges a body's
 * velocity directly (px/step) rather than via `applyForce` — Matter scales
 * forces by deltaTime², which makes raw "force" units wildly unintuitive here.
 */

/**
 * Spring a body's rotation back toward upright (0°) while bleeding its spin, so
 * a card stays readable but can still be knocked askew and wobble back. Higher
 * `stiffness` snaps upright harder; lower `damping` lets it overshoot and rock.
 */
export function uprightTorque(body: Matter.Body, stiffness: number, damping: number) {
	const av = body.angularVelocity * damping - body.angle * stiffness;
	Body.setAngularVelocity(body, av);
}

/**
 * Faint lean toward the cursor: adds velocity (px/step) toward `pointer`, falling
 * off with the square of distance so only bodies close to the cursor are tugged
 * meaningfully, and nothing past `radius` feels it. Steady, so it accumulates —
 * keep `strength` tiny.
 */
export function cursorPull(
	body: Matter.Body,
	pointer: { x: number; y: number },
	strength: number,
	radius: number
) {
	const dx = pointer.x - body.position.x;
	const dy = pointer.y - body.position.y;
	const dist = Math.hypot(dx, dy);
	if (dist === 0 || dist > radius) return;
	const falloff = (1 - dist / radius) ** 2; // full at the cursor, nothing at the edge
	const pull = strength * falloff;
	Body.setVelocity(body, {
		x: body.velocity.x + (dx / dist) * pull,
		y: body.velocity.y + (dy / dist) * pull
	});
}
