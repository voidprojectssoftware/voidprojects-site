import { MAX_NUDGE_SUBSTEPS, NUDGE_STEP } from './nudge-field.js';

export type ChainConfig = {
	homeStiffness: number; // spring pulling each item toward its (wandering) home
	linkStiffness: number; // spring between linked items' offsets; how hard one tugs its neighbour
	damping: number; // per-step velocity retention
	wander: number; // idle drift amplitude (px) on x; y uses 60% of it
	radius: number; // cursor influence radius (px) from an item's centre
	push: number; // velocity (px/step) added away from the cursor at point-blank
	maxOffset: number; // hard clamp on any item's displacement (px)
};

export const CHAIN_DEFAULTS: ChainConfig = {
	homeStiffness: 0.02,
	linkStiffness: 0.008,
	damping: 0.9,
	wander: 6,
	radius: 90,
	push: 0.3,
	maxOffset: 9
};

type ChainNode = {
	el: HTMLElement;
	hx: number; // home centre (viewport px), own offset removed
	hy: number;
	ox: number;
	oy: number;
	vx: number;
	vy: number;
	present: boolean; // false while display:none (a closed branch); skipped by forces and links
	held: number; // hover/focus count; a held item freezes so it never slides out from under the pointer
	hovered: boolean;
	focused: boolean;
	phase: [number, number, number, number]; // per-item wander phases/rates so items drift independently
};

type ChainLine = {
	el: HTMLElement;
	a: string;
	b: string;
	mode: 'along' | 'across'; // along: hairline runs from a down to b; across: divider sitting between a and b
	length: number; // natural hairline length (px)
};

type ChainLink = { a: string; b: string; stiffness: number };

/**
 * A handful of DOM items on springs, linked to each other: each drifts a few px around its
 * home, the cursor shoves it a little, and links make one tug its neighbours. Hairline
 * elements registered with {@link line} are bent to follow the items they connect.
 *
 * Same fixed-timestep spring/damper as {@link NudgeField}, plus idle wander and links. It is
 * its own instance with its own loop, so it never touches the homepage hero's world.
 */
export class NudgeChain {
	private readonly cfg: ChainConfig;
	private readonly nodes = new Map<string, ChainNode>();
	private readonly links: ChainLink[] = [];
	private readonly lines: ChainLine[] = [];
	private readonly reduceMotion: boolean;
	private readonly frame: (now: number) => void;
	private observer: ResizeObserver | null = null;

	private enabled = false;
	private rafId = 0;
	private lastTime = 0;
	private accumulator = 0;
	private t = 0; // simulated seconds; drives wander and stops with the loop

	private readonly pointer = { x: 0, y: 0, active: false };

	constructor(config: Partial<ChainConfig> = {}) {
		this.cfg = { ...CHAIN_DEFAULTS, ...config };
		this.reduceMotion =
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		this.frame = this.step.bind(this);
	}

	/** Tag an item under `key`. Returns a cleanup function (suitable as a Svelte action `destroy`). */
	node(el: HTMLElement, key: string): () => void {
		const r = () => Math.random() * Math.PI * 2;
		const n: ChainNode = {
			el,
			hx: 0,
			hy: 0,
			ox: 0,
			oy: 0,
			vx: 0,
			vy: 0,
			present: false,
			held: 0,
			hovered: false,
			focused: false,
			phase: [r(), r(), 0.7 + Math.random() * 0.6, 0.7 + Math.random() * 0.6]
		};
		const hold = (field: 'hovered' | 'focused', on: boolean) => () => {
			n[field] = on;
			if (on) n.vx = n.vy = 0;
		};
		const enter = hold('hovered', true);
		const leave = hold('hovered', false);
		const focusIn = hold('focused', true);
		const focusOut = hold('focused', false);
		el.addEventListener('pointerenter', enter);
		el.addEventListener('pointerleave', leave);
		el.addEventListener('focusin', focusIn);
		el.addEventListener('focusout', focusOut);
		this.nodes.set(key, n);
		if (this.enabled) {
			this.measure(n);
			this.observer?.observe(el);
		}
		return () => {
			el.removeEventListener('pointerenter', enter);
			el.removeEventListener('pointerleave', leave);
			el.removeEventListener('focusin', focusIn);
			el.removeEventListener('focusout', focusOut);
			this.observer?.unobserve(el);
			el.style.transform = '';
			if (this.nodes.get(key) === n) this.nodes.delete(key);
		};
	}

	link(a: string, b: string, stiffness = this.cfg.linkStiffness) {
		this.links.push({ a, b, stiffness });
	}

	/** Bend a vertical hairline to follow items `a` and `b`. Returns a cleanup function. */
	line(el: HTMLElement, a: string, b: string, mode: ChainLine['mode']): () => void {
		const l: ChainLine = { el, a, b, mode, length: el.offsetHeight || 1 };
		this.lines.push(l);
		return () => {
			const i = this.lines.indexOf(l);
			if (i >= 0) this.lines.splice(i, 1);
			el.style.transform = '';
		};
	}

	/** Start floating. Re-measures every home from the current layout. */
	enable() {
		if (this.enabled || this.reduceMotion) return;
		this.enabled = true;
		// Fires on mount and whenever an item changes size, including a branch going from
		// display:none to shown, which is when its home becomes measurable.
		this.observer = new ResizeObserver(() => this.measureAll());
		for (const n of this.nodes.values()) this.observer.observe(n.el);
		this.measureAll();
		window.addEventListener('pointermove', this.onPointerMove, { passive: true });
		window.addEventListener('resize', this.measureAll);
		document.addEventListener('mouseleave', this.onPointerLeave, { passive: true });
		document.addEventListener('visibilitychange', this.onVisibility);
		this.ensureLoop();
	}

	/** Stop and put every item and hairline back at rest. */
	disable() {
		if (!this.enabled) return;
		this.enabled = false;
		this.park();
		this.observer?.disconnect();
		this.observer = null;
		window.removeEventListener('pointermove', this.onPointerMove);
		window.removeEventListener('resize', this.measureAll);
		document.removeEventListener('mouseleave', this.onPointerLeave);
		document.removeEventListener('visibilitychange', this.onVisibility);
		this.pointer.active = false;
		for (const n of this.nodes.values()) {
			n.ox = n.oy = n.vx = n.vy = 0;
			n.el.style.transform = '';
		}
		for (const l of this.lines) l.el.style.transform = '';
	}

	destroy() {
		this.disable();
		this.nodes.clear();
		this.links.length = 0;
		this.lines.length = 0;
	}

	/** Read-only snapshot of every item's offset, for verification. */
	snapshot() {
		const out: Record<string, { x: number; y: number; present: boolean; held: boolean }> = {};
		for (const [k, n] of this.nodes)
			out[k] = { x: n.ox, y: n.oy, present: n.present, held: n.hovered || n.focused };
		return out;
	}

	private readonly measureAll = () => {
		for (const n of this.nodes.values()) this.measure(n);
		for (const l of this.lines) l.length = l.el.offsetHeight || l.length;
	};

	private measure(n: ChainNode) {
		const r = n.el.getBoundingClientRect();
		const present = r.width > 0 || r.height > 0;
		if (!present) {
			n.ox = n.oy = n.vx = n.vy = 0;
			n.el.style.transform = '';
		} else {
			// The rect includes whatever offset is currently rendered; take it back out.
			const shown = n.el.style.transform !== '';
			n.hx = r.left + r.width / 2 - (shown ? n.ox : 0);
			n.hy = r.top + r.height / 2 - (shown ? n.oy : 0);
			if (!n.present) {
				// A branch item appearing starts where its parent is, so it reads as hanging off it.
				const parent = this.neighbours(n)[0];
				n.ox = parent?.ox ?? 0;
				n.oy = parent?.oy ?? 0;
				n.vx = n.vy = 0;
			}
		}
		n.present = present;
	}

	private neighbours(n: ChainNode) {
		const out: ChainNode[] = [];
		for (const l of this.links) {
			const a = this.nodes.get(l.a);
			const b = this.nodes.get(l.b);
			if (a === n && b?.present) out.push(b);
			if (b === n && a?.present) out.push(a);
		}
		return out;
	}

	private ensureLoop() {
		if (this.rafId || !this.enabled || document.hidden) return;
		this.rafId = requestAnimationFrame(this.frame);
	}

	private park() {
		if (this.rafId) cancelAnimationFrame(this.rafId);
		this.rafId = 0;
		this.lastTime = 0; // so the next wake does not bank the idle gap as elapsed time
		this.accumulator = 0;
	}

	private step(now: number) {
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

		this.render();
		this.rafId = requestAnimationFrame(this.frame);
	}

	private integrate() {
		const { homeStiffness, damping, wander, radius, push, maxOffset } = this.cfg;
		this.t += NUDGE_STEP / 1000;
		const t = this.t;

		const fx = new Map<ChainNode, number>();
		const fy = new Map<ChainNode, number>();
		for (const n of this.nodes.values()) {
			if (!n.present) continue;
			// Home wanders on slow incommensurate sines, so each item drifts on its own.
			const [px, py, rx, ry] = n.phase;
			const wx = wander * Math.sin(t * 0.55 * rx + px) * Math.cos(t * 0.21 * ry + py);
			const wy = wander * 0.6 * Math.sin(t * 0.43 * ry + py + 1.3 * Math.sin(t * 0.17 * rx));
			let x = homeStiffness * (wx - n.ox);
			let y = homeStiffness * (wy - n.oy);
			if (this.pointer.active) {
				const dx = n.hx + n.ox - this.pointer.x;
				const dy = n.hy + n.oy - this.pointer.y;
				const dist = Math.hypot(dx, dy);
				if (dist > 0 && dist < radius) {
					const f = push * (1 - dist / radius);
					x += (dx / dist) * f;
					y += (dy / dist) * f;
				}
			}
			fx.set(n, x);
			fy.set(n, y);
		}
		for (const l of this.links) {
			const a = this.nodes.get(l.a);
			const b = this.nodes.get(l.b);
			if (!a?.present || !b?.present) continue;
			const x = l.stiffness * (b.ox - a.ox);
			const y = l.stiffness * (b.oy - a.oy);
			fx.set(a, fx.get(a)! + x);
			fy.set(a, fy.get(a)! + y);
			fx.set(b, fx.get(b)! - x);
			fy.set(b, fy.get(b)! - y);
		}

		for (const n of this.nodes.values()) {
			if (!n.present) continue;
			if (n.hovered || n.focused) {
				n.vx = n.vy = 0; // frozen in place, but still an anchor its neighbours feel
				continue;
			}
			n.vx = (n.vx + fx.get(n)!) * damping;
			n.vy = (n.vy + fy.get(n)!) * damping;
			n.ox += n.vx;
			n.oy += n.vy;
			const off = Math.hypot(n.ox, n.oy);
			if (off > maxOffset) {
				n.ox *= maxOffset / off;
				n.oy *= maxOffset / off;
			}
		}
	}

	private render() {
		for (const n of this.nodes.values()) {
			if (n.present) n.el.style.transform = `translate3d(${n.ox}px, ${n.oy}px, 0)`;
		}
		for (const l of this.lines) {
			const a = this.nodes.get(l.a);
			const b = this.nodes.get(l.b);
			if (!a?.present || !b?.present) continue;
			const dx = b.ox - a.ox;
			const dy = b.oy - a.oy;
			if (l.mode === 'along') {
				// Top end rides on a, bottom end on b: the hairline swings and stretches between them.
				const len = Math.hypot(dx, l.length + dy);
				const angle = -Math.atan2(dx, l.length + dy);
				l.el.style.transformOrigin = '50% 0';
				l.el.style.transform = `translate3d(${a.ox}px, ${a.oy}px, 0) rotate(${angle}rad) scaleY(${len / l.length})`;
			} else {
				// Sits midway, tilts with the pair, and stretches as they pull apart.
				const gap = Math.max(1, b.hx - a.hx);
				const angle = Math.atan2(dy, gap + dx);
				const stretch = Math.min(1.35, Math.max(0.8, 1 + dx * 0.05));
				l.el.style.transform = `translate3d(${(a.ox + b.ox) / 2}px, ${(a.oy + b.oy) / 2}px, 0) rotate(${angle}rad) scaleY(${stretch})`;
			}
		}
	}

	private readonly onPointerMove = (e: PointerEvent) => {
		// Touch has no hover, so a tap must never shove the thing being tapped.
		if (e.pointerType === 'touch') return;
		this.pointer.x = e.clientX;
		this.pointer.y = e.clientY;
		this.pointer.active = true;
	};

	private readonly onPointerLeave = () => {
		this.pointer.active = false;
	};

	private readonly onVisibility = () => {
		if (document.hidden) this.park();
		else this.ensureLoop();
	};
}
