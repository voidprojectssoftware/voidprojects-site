import Matter from 'matter-js';
import type { Actor, StepCtx } from './actor.js';
import type { PhysicsStage } from './stage.js';
import { readableUprightTorque } from './behaviors.js';

const { Constraint, Body } = Matter;

const SVG_NS = 'http://www.w3.org/2000/svg';

/** One graph node: a live body already in the shared world. */
export type GraphNode = { body: Matter.Body };

/**
 * A run of nodes that belong together (e.g. the letters of a word). Consecutive
 * nodes are linked in sequence (the "soft body" that holds the run together),
 * and one node (the {@link anchorIndex}, the first by default) links out to the
 * graph's hub.
 */
export type GraphCluster = {
	/** Ordered nodes; each consecutive pair gets an intra-cluster link. */
	nodes: GraphNode[];
	/** Which node links to the hub. Defaults to 0 (the first). */
	anchorIndex?: number;
	/**
	 * If set, this cluster's anchor links to the hub with this label (drawn to the
	 * hub's box edge). Leave undefined and the cluster is not tied to the hub, so a
	 * hub can connect to just one cluster instead of all of them.
	 */
	hubLabel?: string;
	/** Label drawn on every intra-cluster edge (kept short — these edges are tiny). */
	intraLabel?: string;
};

/** A labeled link between two clusters (anchor to anchor), forming the graph's spine. */
export type GraphLink = {
	/** Index into {@link GraphSpec.clusters} of the source cluster. */
	from: number;
	/** Index into {@link GraphSpec.clusters} of the target cluster. */
	to: number;
	/** Label drawn on the link. */
	label?: string;
};

/** What to wire up: clusters, the links between them, and optional extras. */
export type GraphSpec = {
	clusters: GraphCluster[];
	/** Optional links between clusters (anchor to anchor). */
	links?: GraphLink[];
	/** Optional center every cluster also anchors to (e.g. a hub card). */
	hub?: GraphNode;
	/**
	 * Bodies that take part in the repulsion but get no edges of their own, so the
	 * graph fans out around them without being sprung to them (e.g. a card the
	 * glyphs should avoid but not link to).
	 */
	repellers?: GraphNode[];
};

/** Tunable knobs for how the graph pulls together and looks. */
export type GraphConfig = {
	/** Stiffness of the springs within a cluster — how rigidly a run holds shape. Zero draws the edges without springing them, for an owner that positions the nodes itself. */
	intraStiffness: number;
	/** Damping of the intra-cluster springs. */
	intraDamping: number;
	/**
	 * Rest length of an intra link as a multiple of the two nodes' average width.
	 * Derived from size (not their current scattered distance) so the spring
	 * actually gathers the letters in; above ~1.5 the run sits as a legible chain
	 * of spaced nodes with room for the edge labels rather than tight text.
	 */
	intraSpread: number;
	/** Stiffness of the spring from a cluster's anchor to the hub — keep gentle. */
	hubStiffness: number;
	/** Damping of the hub springs. */
	hubDamping: number;
	/** Rest length of a hub spring: roughly the radius clusters settle at around the hub. */
	hubLength: number;
	/** Rest length of an inter-cluster link: how far apart linked words settle. */
	linkLength: number;
	/** Stiffness of the inter-cluster links — keep low so clusters float loosely, not taut. */
	linkStiffness: number;
	/** Damping of the inter-cluster links. */
	linkDamping: number;
	/**
	 * Repulsion (px/step at contact) every node pushes its neighbours with, so the
	 * graph fans out instead of collapsing onto the spring lines. Measured from each
	 * body's surface, so the big card pushes glyphs over a wide range while glyphs
	 * nudge each other locally. Distributed by mass, so the heavy card barely drifts.
	 */
	repulsion: number;
	/** How far past two bodies' surfaces the repulsion still reaches (px). */
	repulsionRadius: number;
	/**
	 * Optional attraction toward a point (a spring stiffness), the force growing with
	 * distance. Off by default; the directional flow below is used instead.
	 */
	centerPull: number;
	/**
	 * Directional flow (px/step at the hub) that pushes the glyph members one way
	 * (e.g. out to the right, or up), emanating from the hub and falling off with
	 * distance. This is the "repulsion from the card in a direction".
	 */
	flowStrength: number;
	/** Distance (px) over which the directional flow falls to zero. */
	flowRange: number;
	/** Spring stiffness pinning the hub to its anchor point (when a hubAnchor is set). */
	hubAnchorStiffness: number;
	/** Velocity retained each step by the pinned hub (below 1 damps the spring so it settles without bouncing). */
	hubAnchorDamping: number;
	/**
	 * Per-step velocity damping (frictionAir) applied to member bodies while the
	 * graph is live, so the soft body settles instead of ringing forever in zero-g.
	 * Restored to each body's original value on deactivate.
	 */
	memberFrictionAir: number;
	/**
	 * Readability for the chained letters while the graph is live (see
	 * `readableUprightTorque`): a slight pull toward the nearest upright so the words
	 * read, the same behaviour as the GitHub button but with a readable band. This is
	 * that pull's strength; 0 leaves the letters to tumble.
	 */
	uprightStiffness: number;
	/** Spin friction while a letter is turning fast — keep near 1 so it isn't braked hard. */
	uprightSpinFriction: number;
	/** Firmer friction once a letter has slowed, so it eases to a clean readable stop. */
	uprightSettleFriction: number;
	/** Spin speed (rad/step) the letter friction blends across. */
	uprightSettleSpeed: number;
	/**
	 * Half-width (deg) of the readable band around upright. A letter is left at whatever
	 * tilt it has within ±this (so it sits at a natural readable angle, not dead vertical);
	 * past it the pull eases it back in. ~45 reads at a glance.
	 */
	uprightReadableDeg: number;
	/** Stroke of the faint intra-cluster edges. */
	webColor: string;
	/** Stroke of the prominent anchor-to-hub edges. */
	hubColor: string;
	/** Width (px) of intra edges. */
	webWidth: number;
	/** Width (px) of hub edges. */
	hubWidth: number;
	clipIntraEdges: boolean; // draw intra edges between the nodes' box edges, not their centers, so a line spans the gap between two text boxes instead of running through the glyphs
	clipPad: number; // px of clearance left between a clipped endpoint and the box it was clipped to
	/** Fill of the edge labels. */
	labelColor: string;
	/** Font size (px) of the prominent hub labels. */
	hubLabelSize: number;
	/** Font size (px) of the dim intra labels. */
	intraLabelSize: number;
	/** Opacity multiplier for the dim intra labels. */
	intraLabelOpacity: number;
	/** Duration (ms) of the draw-in fade when the graph activates. */
	fadeMs: number;
	/** Milliseconds between pulses that travel out from the hub through the graph (0 disables). */
	pulseInterval: number;
	/** Delay (ms) after activation before the first pulse, so the graph can settle first. */
	pulseInitialDelay: number;
	/** Pulse travel speed (px per fixed step). */
	pulseSpeed: number;
	/** Radius (px) within which the moving pulse shoves nodes aside (the wiggle). */
	pulseRadius: number;
	/** Push strength (px/step at its center) the pulse exerts on the nodes it passes. */
	pulseForce: number;
	/** Fill of the travelling pulse dot. */
	pulseColor: string;
	/** Radius (px) of the pulse dot. */
	pulseDotRadius: number;
};

export const GRAPH_DEFAULTS: GraphConfig = {
	intraStiffness: 0.04,
	intraDamping: 0.12,
	intraSpread: 2.1, // × the glyphs' average width: spaced nodes the labels fit between
	hubStiffness: 0.012, // gentle pull so clusters drift and swing around the hub
	hubDamping: 0.08,
	hubLength: 330, // words sit well out from the card so the hub edges read
	linkLength: 120, // how far apart linked words settle along the spine
	linkStiffness: 0.006, // loose tether, not a taut cable, so clusters float freely
	linkDamping: 0.05,
	repulsion: 0.6, // fan nodes apart against the springs (px/step at contact)
	repulsionRadius: 90, // reach past each body's surface
	centerPull: 0, // off: the directional flow positions the cloud instead
	flowStrength: 0.45, // push glyphs off the card in the flow direction (px/step at the hub)
	flowRange: 850, // distance over which the flow fades
	hubAnchorStiffness: 0.008, // subtle pull to the anchor (left on desktop, bottom on mobile)
	hubAnchorDamping: 0.82, // bleed the card's momentum so it glides in without bouncing
	memberFrictionAir: 0.02,
	uprightStiffness: 0.0022, // slight pull keeping the chained letters readable (matches the GitHub button)
	uprightSpinFriction: 0.99, // light while a letter is turning fast
	uprightSettleFriction: 0.86, // firmer once slowed, so it eases to a clean readable stop
	uprightSettleSpeed: 0.087, // ≈5°/step blend point between the two frictions
	uprightReadableDeg: 45, // letters rest anywhere within ±45° of upright, not snapped dead vertical
	webColor: 'rgba(150, 180, 255, 0.30)',
	hubColor: 'rgba(196, 162, 255, 0.85)', // brand violet (matches the warp quasar core)
	webWidth: 1,
	hubWidth: 1.5,
	clipIntraEdges: false, // the hero's letters are chained through their centers
	clipPad: 0,
	labelColor: 'rgba(214, 224, 255, 0.92)',
	hubLabelSize: 17,
	intraLabelSize: 11,
	intraLabelOpacity: 0.6,
	fadeMs: 600,
	pulseInterval: 2200, // gap between pulses
	pulseInitialDelay: 1200, // let the graph settle before the first pulse
	pulseSpeed: 13, // px per fixed step along the path
	pulseRadius: 120, // how wide a swath the pulse jostles
	pulseForce: 0.7, // how hard it shoves the nodes it passes
	pulseColor: 'rgba(210, 190, 255, 0.95)', // brand-violet glow
	pulseDotRadius: 5
};

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

type Edge = {
	a: Matter.Body;
	b: Matter.Body;
	line: SVGLineElement;
	label: SVGTextElement | null;
	/** Null for a zero-stiffness edge: a drawn relationship that pulls on nothing. */
	constraint: Matter.Constraint | null;
	/** Which endpoints to draw at their body's box edge rather than its center. */
	clip: 'a' | 'b' | 'both' | null;
};

/**
 * A generic relationship graph laid over bodies that already live on the shared
 * {@link PhysicsStage}. Given a hub and a set of clusters, it springs the nodes
 * together (the links are real Matter constraints, solved by the stage) and
 * draws labeled edges on an SVG overlay that tracks the live body positions.
 *
 * It is deliberately node-agnostic: a node is just `{ el, body }`, so the same
 * effect can relate glyphs, the GitHub button, and a project card without
 * knowing what any of them are. The composition root assembles the spec and
 * calls {@link activate} / {@link deactivate} (e.g. when a card appears/leaves).
 *
 * The graph is purely additive — it never writes the nodes' transforms (their
 * owning actors still do that from the same bodies), it only adds constraints
 * and draws the connective lines. Reduced motion no-ops it entirely.
 */
export class RelationGraph implements Actor {
	private readonly cfg: GraphConfig;
	private readonly reduceMotion: boolean;
	private stage: PhysicsStage | null = null;

	private active = false;
	private activatedAt = 0;

	/**
	 * Where the center-pull gathers toward, given the current viewport size. Only
	 * used when `centerPull` > 0. Defaults to the viewport center.
	 */
	centerTarget?: (width: number, height: number) => { x: number; y: number };

	/**
	 * The direction the glyphs flow off the card, given the viewport size (any
	 * magnitude, normalized internally). E.g. right on desktop, up on mobile.
	 */
	flowDirection?: (width: number, height: number) => { x: number; y: number };

	/**
	 * Where the hub (card) is pinned, given the viewport size. E.g. left-of-center
	 * on desktop, near the bottom on mobile. Unset leaves the card free.
	 */
	hubAnchor?: (width: number, height: number) => { x: number; y: number };

	/**
	 * Rest length of the inter-cluster spine links, given the viewport size,
	 * evaluated when the graph activates. Lets a narrow screen pull the words much
	 * closer so the spine doesn't stretch tall. Falls back to {@link GraphConfig.linkLength}.
	 */
	linkLengthFor?: (width: number, height: number) => number;

	/**
	 * Stiffness of the inter-cluster spine links, given the viewport size, evaluated
	 * when the graph activates. Raise it on narrow screens so the short rest length
	 * actually holds against the repulsion. Falls back to {@link GraphConfig.linkStiffness}.
	 */
	linkStiffnessFor?: (width: number, height: number) => number;

	/**
	 * Rest length of the anchor-to-hub links, given the viewport size, evaluated when
	 * the graph activates. Lets a narrow screen pull the hub edge (e.g. card to the V)
	 * in close like the spine. Falls back to {@link GraphConfig.hubLength}.
	 */
	hubLengthFor?: (width: number, height: number) => number;

	fade = 1; // multiplied into the drawn opacity, so an owner can fade the whole overlay out

	private svg: SVGSVGElement | null = null;
	private group: SVGGElement | null = null;
	private readonly edges: Edge[] = [];
	/** The glyph member bodies, for the pairwise repulsion (the hub is excluded). */
	private nodeBodies: Matter.Body[] = [];
	/** The hub body (card), if any: the flow origin and the pinned anchor target. */
	private hubBody: Matter.Body | null = null;
	/** Member bodies whose frictionAir we bumped, with the value to restore. */
	private readonly damped = new Map<Matter.Body, number>();

	// Pulse: a wave that travels out from the hub through the graph, shoving the
	// nodes it passes so they wiggle and settle once it moves on. Each pulse takes a
	// different cluster.
	/** Each valid cluster's node bodies in order (spine order), for routing the pulse. */
	private pulseClusters: Matter.Body[][] = [];
	/** Which cluster the next pulse heads into (cycles). */
	private pulseTargetIndex = 0;
	/** The current pulse's route through the graph, or null between pulses. */
	private pulsePath: Matter.Body[] | null = null;
	/** Arc length the current pulse has travelled along its path. */
	private pulseS = 0;
	/** Timestamp the next pulse may spawn. */
	private nextPulseAt = 0;
	/** The travelling pulse dot, and where it is this frame. */
	private pulseDot: SVGCircleElement | null = null;
	private readonly pulsePoint = { x: 0, y: 0, visible: false };

	constructor(config: Partial<GraphConfig> = {}) {
		this.cfg = { ...GRAPH_DEFAULTS, ...config };
		this.reduceMotion =
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	mount(stage: PhysicsStage) {
		this.stage = stage;
	}

	/** Whether the graph is currently wired up and drawn (between activate/deactivate). */
	get formed(): boolean {
		return this.active;
	}

	/**
	 * Wire up the graph: spring every cluster together, connect the clusters with
	 * the spine links (and optionally a hub), and draw the edges. No-op under
	 * reduced motion or if already active.
	 */
	activate(spec: GraphSpec) {
		if (this.reduceMotion || this.active || !this.stage) return;

		this.buildSvg();

		// Viewport-responsive rest lengths, evaluated once at activation.
		const hasWin = typeof window !== 'undefined';
		const vw = hasWin ? window.innerWidth : 0;
		const vh = hasWin ? window.innerHeight : 0;
		const hubLen = this.hubLengthFor && hasWin ? this.hubLengthFor(vw, vh) : this.cfg.hubLength;
		const linkLen = this.linkLengthFor && hasWin ? this.linkLengthFor(vw, vh) : this.cfg.linkLength;
		const linkStiff =
			this.linkStiffnessFor && hasWin ? this.linkStiffnessFor(vw, vh) : this.cfg.linkStiffness;

		this.pulseClusters = [];

		// Each cluster's anchor body, kept by cluster index so the spine links can
		// connect them (null for any empty cluster, whose links are skipped).
		const anchors: (Matter.Body | null)[] = [];

		spec.clusters.forEach((cluster, ci) => {
			const nodes = cluster.nodes;
			if (nodes.length === 0) {
				anchors[ci] = null;
				return;
			}

			// Bleed momentum on every member so the soft body settles, and register it
			// as a node for the pairwise repulsion.
			for (const n of nodes) {
				this.dampen(n.body);
				this.nodeBodies.push(n.body);
			}
			this.pulseClusters.push(nodes.map((n) => n.body)); // for pulse routing

			// Intra-cluster links: consecutive nodes, gathered in to a size-based rest
			// length (not their scattered distance) so the spring actually pulls them
			// together, with room for the labels.
			for (let i = 1; i < nodes.length; i++) {
				const a = nodes[i - 1].body;
				const b = nodes[i].body;
				const length = ((this.width(a) + this.width(b)) / 2) * this.cfg.intraSpread;
				this.addEdge(a, b, {
					length,
					stiffness: this.cfg.intraStiffness,
					damping: this.cfg.intraDamping,
					color: this.cfg.webColor,
					width: this.cfg.webWidth,
					label: cluster.intraLabel,
					labelSize: this.cfg.intraLabelSize,
					labelOpacity: this.cfg.intraLabelOpacity,
					clip: this.cfg.clipIntraEdges ? 'both' : undefined
				});
			}

			const anchor = nodes[Math.min(cluster.anchorIndex ?? 0, nodes.length - 1)].body;
			anchors[ci] = anchor;

			// Optional hub link, opt-in per cluster via hubLabel, drawn to the hub's box
			// edge (clip 'b') not its center, so the line meets the card's border.
			if (spec.hub && cluster.hubLabel !== undefined) {
				this.addEdge(anchor, spec.hub.body, {
					length: hubLen,
					stiffness: this.cfg.hubStiffness,
					damping: this.cfg.hubDamping,
					color: this.cfg.hubColor,
					width: this.cfg.hubWidth,
					label: cluster.hubLabel,
					labelSize: this.cfg.hubLabelSize,
					labelOpacity: 1,
					clip: 'b'
				});
			}
		});

		// Spine links: connect clusters to each other (anchor to anchor), the
		// prominent labeled relationships between words (responsive lengths above).
		for (const link of spec.links ?? []) {
			const a = anchors[link.from];
			const b = anchors[link.to];
			if (!a || !b) continue;
			this.addEdge(a, b, {
				length: linkLen,
				stiffness: linkStiff,
				damping: this.cfg.linkDamping,
				color: this.cfg.hubColor,
				width: this.cfg.hubWidth,
				label: link.label,
				labelSize: this.cfg.hubLabelSize,
				labelOpacity: 1
			});
		}

		// The hub drives the directional flow and is pinned to its anchor; it is not a
		// radial-repulsion node (its push on the glyphs is the directional flow instead).
		this.hubBody = spec.hub?.body ?? null;
		// Repellers take part in the fan-out but get no edges (e.g. a card to avoid).
		for (const r of spec.repellers ?? []) this.nodeBodies.push(r.body);

		this.active = true;
		this.activatedAt = performance.now();

		// Arm the pulse.
		this.pulseTargetIndex = 0;
		this.pulsePath = null;
		this.pulseS = 0;
		this.pulsePoint.visible = false;
		this.nextPulseAt = this.activatedAt + this.cfg.pulseInitialDelay;
		this.buildPulseDot();

		this.stage.wake();
	}

	/** Tear the graph down: drop the constraints, restore damping, remove the overlay. */
	deactivate() {
		if (!this.active) return;
		for (const e of this.edges) if (e.constraint) this.stage?.removeConstraint(e.constraint);
		this.edges.length = 0;
		this.nodeBodies = [];
		this.hubBody = null;
		this.pulseClusters = [];
		this.pulsePath = null;
		this.pulseDot = null;
		this.pulsePoint.visible = false;
		for (const [body, frictionAir] of this.damped) body.frictionAir = frictionAir;
		this.damped.clear();
		this.removeSvg();
		this.active = false;
	}

	onScroll() {
		// The graph is driven by activate/deactivate (a card appearing), not scroll.
	}

	step(ctx: StepCtx) {
		// The attractive links are constraints (the stage's solver handles them). The
		// forces here are the rest of a force-directed layout: a gentle pull toward the
		// viewport center (so nodes gather where they're visible) plus node repulsion
		// (so the graph fans out instead of collapsing onto the spring lines).
		if (!this.active) return;

		// Pin the hub (card) to its anchor, e.g. left-of-center on desktop, bottom on
		// mobile. A velocity spring so it flies in from the toss and settles there.
		if (this.hubBody && this.hubAnchor && this.hubBody !== ctx.draggedBody) {
			const a = this.hubAnchor(ctx.width, ctx.height);
			const k = this.cfg.hubAnchorStiffness;
			const d = this.cfg.hubAnchorDamping;
			// Damped spring: add the pull, then bleed momentum so it settles, no bounce.
			Body.setVelocity(this.hubBody, {
				x: (this.hubBody.velocity.x + (a.x - this.hubBody.position.x) * k) * d,
				y: (this.hubBody.velocity.y + (a.y - this.hubBody.position.y) * k) * d
			});
		}

		// Keep the chained letters readable: a slight pull toward the nearest upright with
		// a ±readable-deg band, so each word reads but the letters sit at natural tilts
		// rather than snapping dead vertical (the GitHub button's behaviour, banded).
		if (this.cfg.uprightStiffness > 0) {
			for (const body of this.damped.keys()) {
				if (body === ctx.draggedBody) continue;
				readableUprightTorque(
					body,
					this.cfg.uprightStiffness,
					this.cfg.uprightSpinFriction,
					this.cfg.uprightSettleFriction,
					this.cfg.uprightSettleSpeed,
					this.cfg.uprightReadableDeg
				);
			}
		}

		// Directional flow: push the glyph members off the hub in one direction (the
		// "repulsion from the card in a direction"), strongest at the hub, fading out.
		if (this.flowDirection && this.cfg.flowStrength > 0) {
			const fd = this.flowDirection(ctx.width, ctx.height);
			const mag = Math.hypot(fd.x, fd.y) || 1;
			const dirx = fd.x / mag;
			const diry = fd.y / mag;
			const ox = this.hubBody ? this.hubBody.position.x : ctx.width / 2;
			const oy = this.hubBody ? this.hubBody.position.y : ctx.height / 2;
			const range = this.cfg.flowRange;
			for (const body of this.damped.keys()) {
				if (body === ctx.draggedBody) continue;
				const d = Math.hypot(body.position.x - ox, body.position.y - oy);
				const push = d >= range ? 0 : this.cfg.flowStrength * (1 - d / range);
				if (push <= 0) continue;
				Body.setVelocity(body, {
					x: body.velocity.x + dirx * push,
					y: body.velocity.y + diry * push
				});
			}
		}

		// Center spring: force grows with distance, near-zero in the middle, strongest
		// at the edges. Applied to the glyph members only (not the card or button).
		if (this.cfg.centerPull > 0) {
			const target = this.centerTarget?.(ctx.width, ctx.height);
			const cx = target ? target.x : ctx.width / 2;
			const cy = target ? target.y : ctx.height / 2;
			for (const body of this.damped.keys()) {
				if (body === ctx.draggedBody) continue;
				Body.setVelocity(body, {
					x: body.velocity.x + (cx - body.position.x) * this.cfg.centerPull,
					y: body.velocity.y + (cy - body.position.y) * this.cfg.centerPull
				});
			}
		}

		// Pulse: a wave travelling out from the hub that shoves nodes as it passes.
		this.stepPulse(ctx);

		if (this.cfg.repulsion <= 0) return;
		const nodes = this.nodeBodies;
		const R = this.cfg.repulsionRadius;
		for (let i = 0; i < nodes.length; i++) {
			const a = nodes[i];
			const ra = this.radius(a);
			for (let j = i + 1; j < nodes.length; j++) {
				const b = nodes[j];
				let dx = b.position.x - a.position.x;
				let dy = b.position.y - a.position.y;
				let dist = Math.hypot(dx, dy);
				if (dist < 0.01) {
					// Exactly overlapping: shove apart in a deterministic direction.
					dx = ((a.id - b.id) % 2 || 1) * 0.5;
					dy = 0.5;
					dist = Math.hypot(dx, dy);
				}
				// Reach measured from the bodies' surfaces, so the large card pushes
				// glyphs over a wide range while glyphs only nudge each other up close.
				const surf = dist - ra - this.radius(b);
				if (surf > R) continue;
				const push = this.cfg.repulsion * (surf <= 0 ? 1 : 1 - surf / R);
				const ux = dx / dist;
				const uy = dy / dist;
				// Split inversely by mass: the heavy hub barely moves, glyphs do the fanning.
				const mt = a.mass + b.mass || 1;
				const sa = b.mass / mt;
				const sb = a.mass / mt;
				if (a !== ctx.draggedBody)
					Body.setVelocity(a, {
						x: a.velocity.x - ux * push * sa,
						y: a.velocity.y - uy * push * sa
					});
				if (b !== ctx.draggedBody)
					Body.setVelocity(b, {
						x: b.velocity.x + ux * push * sb,
						y: b.velocity.y + uy * push * sb
					});
			}
		}
	}

	sync(ctx: StepCtx) {
		if (!this.active || !this.group) return;
		this.group.style.opacity = `${clamp01((ctx.now - this.activatedAt) / this.cfg.fadeMs) * this.fade}`;

		for (const e of this.edges) {
			const acx = e.a.position.x;
			const acy = e.a.position.y;
			const bcx = e.b.position.x;
			const bcy = e.b.position.y;
			let ax = acx;
			let ay = acy;
			let bx = bcx;
			let by = bcy;
			// Clip to the box edge so the line stops at a border (the card's, or both
			// words' boxes) instead of running to the center. Both ends are measured from
			// the raw centers, never from an already-clipped endpoint.
			if (e.clip === 'b' || e.clip === 'both') [bx, by] = this.clipToBox(e.b, acx, acy);
			if (e.clip === 'a' || e.clip === 'both') [ax, ay] = this.clipToBox(e.a, bcx, bcy);

			// Two padded boxes close enough to overlap push their clipped endpoints past
			// each other, which would draw the segment reversed. Hide it until they part.
			if (e.clip === 'both') {
				const crossed = (bx - ax) * (bcx - acx) + (by - ay) * (bcy - acy) <= 0;
				e.line.style.visibility = crossed ? 'hidden' : '';
				if (e.label) e.label.style.visibility = crossed ? 'hidden' : '';
				if (crossed) continue;
			}
			e.line.setAttribute('x1', `${ax}`);
			e.line.setAttribute('y1', `${ay}`);
			e.line.setAttribute('x2', `${bx}`);
			e.line.setAttribute('y2', `${by}`);
			if (e.label) {
				e.label.setAttribute('x', `${(ax + bx) / 2}`);
				e.label.setAttribute('y', `${(ay + by) / 2}`);
			}
		}

		// Draw the travelling pulse dot at its current spot (or hide it between pulses).
		if (this.pulseDot) {
			if (this.pulsePoint.visible) {
				this.pulseDot.setAttribute('cx', `${this.pulsePoint.x}`);
				this.pulseDot.setAttribute('cy', `${this.pulsePoint.y}`);
				this.pulseDot.style.opacity = '1';
			} else {
				this.pulseDot.style.opacity = '0';
			}
		}
	}

	isBusy(): boolean {
		return this.active;
	}

	dispose() {
		this.deactivate();
	}

	/**
	 * Advance the pulse: spawn one when due, walk it along its path, shove the nodes
	 * it passes (so they wiggle and settle behind it), and retire it at the end.
	 */
	private stepPulse(ctx: StepCtx) {
		if (this.cfg.pulseForce <= 0 || this.cfg.pulseInterval <= 0 || this.pulseClusters.length === 0)
			return;

		// Spawn the next pulse, heading into the next cluster in turn.
		if (!this.pulsePath && ctx.now >= this.nextPulseAt) {
			this.pulsePath = this.buildPulsePath(this.pulseTargetIndex);
			this.pulseTargetIndex = (this.pulseTargetIndex + 1) % this.pulseClusters.length;
			this.pulseS = 0;
		}
		if (!this.pulsePath) {
			this.pulsePoint.visible = false;
			return;
		}

		this.pulseS += this.cfg.pulseSpeed;
		const pt = this.pulsePointAt(this.pulsePath, this.pulseS);
		this.pulsePoint.x = pt.x;
		this.pulsePoint.y = pt.y;

		if (pt.done) {
			// Reached the end: retire and schedule the next.
			this.pulsePath = null;
			this.pulsePoint.visible = false;
			this.nextPulseAt = ctx.now + this.cfg.pulseInterval;
			return;
		}
		this.pulsePoint.visible = true;

		// Shove nearby nodes away from the pulse. As it approaches then passes a node,
		// the push direction flips, so the node bobs and then springs settle it.
		const R = this.cfg.pulseRadius;
		for (const body of this.damped.keys()) {
			if (body === ctx.draggedBody) continue;
			const dx = body.position.x - pt.x;
			const dy = body.position.y - pt.y;
			const dist = Math.hypot(dx, dy);
			if (dist >= R || dist < 0.001) continue;
			const push = this.cfg.pulseForce * (1 - dist / R);
			Body.setVelocity(body, {
				x: body.velocity.x + (dx / dist) * push,
				y: body.velocity.y + (dy / dist) * push
			});
		}
	}

	/**
	 * Route a pulse out from the hub, down the spine to cluster `i`, then into that
	 * cluster's remaining nodes — following the real edges. Null if too short.
	 */
	private buildPulsePath(i: number): Matter.Body[] | null {
		const path: Matter.Body[] = [];
		if (this.hubBody) path.push(this.hubBody);
		for (let c = 0; c <= i; c++) {
			const cl = this.pulseClusters[c];
			if (cl?.length) path.push(cl[0]); // spine anchor (first node of each cluster)
		}
		const target = this.pulseClusters[i];
		for (let k = 1; k < target.length; k++) path.push(target[k]); // into the target word
		return path.length >= 2 ? path : null;
	}

	/** The point at arc length `s` along a path of bodies, flagged `done` past the end. */
	private pulsePointAt(path: Matter.Body[], s: number): { x: number; y: number; done: boolean } {
		let remaining = s;
		for (let i = 1; i < path.length; i++) {
			const a = path[i - 1].position;
			const b = path[i].position;
			const len = Math.hypot(b.x - a.x, b.y - a.y);
			if (len <= 0) continue;
			if (remaining <= len) {
				const t = remaining / len;
				return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, done: false };
			}
			remaining -= len;
		}
		const last = path[path.length - 1].position;
		return { x: last.x, y: last.y, done: true };
	}

	/** Create the glowing pulse dot on top of the edges (hidden until a pulse runs). */
	private buildPulseDot() {
		if (!this.group) return;
		const dot = document.createElementNS(SVG_NS, 'circle');
		dot.setAttribute('r', `${this.cfg.pulseDotRadius}`);
		dot.setAttribute('fill', this.cfg.pulseColor);
		dot.style.filter = `drop-shadow(0 0 6px ${this.cfg.pulseColor})`;
		dot.style.opacity = '0';
		this.group.appendChild(dot); // last child: drawn over the edges and labels
		this.pulseDot = dot;
	}

	/** Bump a body's frictionAir for settling, remembering the original to restore. */
	private dampen(body: Matter.Body) {
		if (this.damped.has(body)) return;
		this.damped.set(body, body.frictionAir);
		body.frictionAir = this.cfg.memberFrictionAir;
	}

	private width(b: Matter.Body): number {
		return b.bounds.max.x - b.bounds.min.x || 1;
	}

	/** Rough half-extent of a body (averaged across its AABB), for surface-based repulsion. */
	private radius(b: Matter.Body): number {
		return (b.bounds.max.x - b.bounds.min.x + (b.bounds.max.y - b.bounds.min.y)) / 4 || 1;
	}

	private addEdge(
		a: Matter.Body,
		b: Matter.Body,
		opts: {
			length: number;
			stiffness: number;
			damping: number;
			color: string;
			width: number;
			label?: string;
			labelSize: number;
			labelOpacity: number;
			clip?: 'a' | 'b' | 'both';
		}
	) {
		// A zero-stiffness edge is drawn but never sprung — the owner positions these
		// nodes itself. Matter cannot express that: `Constraint.create` reads a falsy
		// stiffness as "unset" and substitutes 1, welding the bodies rigidly. So the
		// constraint is omitted rather than created limp.
		let constraint: Matter.Constraint | null = null;
		if (opts.stiffness > 0) {
			constraint = Constraint.create({
				bodyA: a,
				bodyB: b,
				length: opts.length,
				stiffness: opts.stiffness,
				damping: opts.damping,
				render: { visible: false } // we draw our own line; hide Matter's
			});
			this.stage?.addConstraint(constraint);
		}

		const line = document.createElementNS(SVG_NS, 'line');
		line.setAttribute('stroke', opts.color);
		line.setAttribute('stroke-width', `${opts.width}`);
		line.setAttribute('stroke-linecap', 'round');
		this.group?.appendChild(line);

		let label: SVGTextElement | null = null;
		if (opts.label) {
			label = document.createElementNS(SVG_NS, 'text');
			label.textContent = opts.label;
			label.setAttribute('font-size', `${opts.labelSize}`);
			label.setAttribute('fill', this.cfg.labelColor);
			label.setAttribute('text-anchor', 'middle');
			label.setAttribute('dominant-baseline', 'middle');
			label.setAttribute('opacity', `${opts.labelOpacity}`);
			// A faint dark outline keeps a label legible over both the stars and the text.
			label.setAttribute('stroke', 'rgba(8, 10, 20, 0.85)');
			label.setAttribute('stroke-width', `${Math.max(2, opts.labelSize * 0.28)}`);
			label.style.paintOrder = 'stroke';
			this.group?.appendChild(label);
		}

		this.edges.push({ a, b, line, label, constraint, clip: opts.clip ?? null });
	}

	/**
	 * The point on a body's axis-aligned box edge (grown by {@link GraphConfig.clipPad})
	 * along the ray from its center toward (tx, ty), so a line meets the card's border
	 * instead of its center. If the target is already inside the box, returns it unchanged.
	 */
	private clipToBox(body: Matter.Body, tx: number, ty: number): [number, number] {
		const pad = this.cfg.clipPad;
		const cx = body.position.x;
		const cy = body.position.y;
		const hw = (body.bounds.max.x - body.bounds.min.x) / 2 + pad || 1;
		const hh = (body.bounds.max.y - body.bounds.min.y) / 2 + pad || 1;
		const dx = tx - cx;
		const dy = ty - cy;
		const m = Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);
		if (m <= 1) return [tx, ty]; // target sits inside the box; don't overshoot it
		return [cx + dx / m, cy + dy / m];
	}

	private buildSvg() {
		if (this.svg) return;
		const svg = document.createElementNS(SVG_NS, 'svg');
		// Cover the viewport so SVG user units equal viewport pixels (body coords).
		// z-index -1 sits between the star background (-z-10) and the hero text.
		svg.style.cssText =
			'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:-1;overflow:visible';
		svg.setAttribute('aria-hidden', 'true');
		const group = document.createElementNS(SVG_NS, 'g');
		group.style.opacity = '0'; // fades in via sync()
		svg.appendChild(group);
		document.body.appendChild(svg);
		this.svg = svg;
		this.group = group;
	}

	private removeSvg() {
		this.svg?.remove();
		this.svg = null;
		this.group = null;
	}
}
