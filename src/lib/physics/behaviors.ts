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
 * Let a body keep spinning, but bleed that spin with friction until it coasts to a stop
 * sitting readable. Two parts, mirroring how a real flicked object behaves:
 *
 * 1. **Friction on the spin.** The body keeps its angular momentum and loses it to
 *    friction over time — so a flick rotates the same direction and just slows down,
 *    it is never yanked backwards. The friction is *velocity-aware*: light while it is
 *    spinning fast (`spinFriction`, near 1, so a hard flick loops several times) and
 *    firmer as it slows (`settleFriction`), so it eases to a clean stop instead of
 *    oscillating. `settleSpeed` (rad/step) is the spin speed the friction blends across.
 * 2. **A slight pull toward upright.** A faint `sin(angle)` nudge toward the nearest
 *    upright (`stiffness`), too weak to fight the spin but enough to settle it legible
 *    once it has slowed. `sin` repeats every turn, so any full rotation counts as
 *    upright (it homes the short way) and only upside-down is unstable — it never rests
 *    inverted. With `readableDeg` > 0 the pull goes quiet within that many degrees of an
 *    upright, so the body is happy resting at any readable tilt inside the band (it does
 *    not true up to dead vertical); past the band it eases back in.
 *
 * Used for the GitHub button (exact upright) and the graph letters (a ±45° readable
 * band): fling it and it spins freely, scrubs off speed, and drifts to readable, with no
 * spring-like snap-back.
 */
export function readableUprightTorque(
	body: Matter.Body,
	stiffness: number,
	spinFriction: number,
	settleFriction: number,
	settleSpeed: number,
	readableDeg = 0
) {
	const speed = Math.abs(body.angularVelocity);
	const fast = settleSpeed > 0 ? Math.min(1, speed / settleSpeed) : 1; // 1 spinning, 0 at rest
	const friction = settleFriction + (spinFriction - settleFriction) * fast;
	// Tilt away from the nearest upright; inside the readable band the pull is off.
	const err = body.angle - Math.round(body.angle / (Math.PI * 2)) * (Math.PI * 2);
	const pull =
		readableDeg > 0 && Math.abs(err) <= (readableDeg * Math.PI) / 180
			? 0
			: Math.sin(body.angle) * stiffness;
	Body.setAngularVelocity(body, body.angularVelocity * friction - pull);
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

/**
 * Radial shove *away* from a moving point — a finger "plowing" through the glyphs
 * as it drags past them on a touch scroll. The push is scaled by `speed` (the
 * finger's travel this step, px/step) so a still finger does nothing and a fast
 * swipe parts the letters in its wake; it falls off with the square of distance
 * and nothing past `radius` feels it. A glyph sitting exactly under the finger is
 * shoved straight up so it never stalls on the point.
 */
export function cursorPush(
	body: Matter.Body,
	point: { x: number; y: number },
	speed: number,
	strength: number,
	radius: number
) {
	const dx = body.position.x - point.x;
	const dy = body.position.y - point.y;
	let dist = Math.hypot(dx, dy);
	if (dist > radius) return;
	let nx: number, ny: number;
	if (dist === 0) {
		nx = 0;
		ny = -1;
		dist = 1;
	} else {
		nx = dx / dist;
		ny = dy / dist;
	}
	const falloff = (1 - dist / radius) ** 2; // full at the finger, nothing at the edge
	const push = strength * falloff * speed;
	Body.setVelocity(body, {
		x: body.velocity.x + nx * push,
		y: body.velocity.y + ny * push
	});
}
