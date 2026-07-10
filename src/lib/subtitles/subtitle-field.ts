import Matter from 'matter-js';
import type { Actor, StepCtx } from '../physics/actor.js';
import type { PhysicsStage } from '../physics/stage.js';
import { RelationGraph, type GraphConfig, type GraphSpec } from '../physics/relation-graph.js';
import type { Cue, CueWord, VoCues } from './cues.js';

const { Bodies, Body } = Matter;

/** Tunable knobs for how the subtitles enter, read, and leave. */
export type SubtitleConfig = {
	leadMs: number; // how far ahead of its timestamp a word appears; the eye needs a beat to find and parse it, and this also absorbs the hardware output latency `currentTime` does not report
	holdMs: number; // how long a phrase lingers after its last word finishes
	fadeInMs: number; // fade/scale-in of a word as it enters
	fadeOutMs: number; // fade-out of a whole phrase once it has been held
	resyncGapMs: number; // a frame gap this long means the loop stalled — a hidden tab, most often, where rAF pauses while the audio plays on. Past it the cursor is fast-forwarded without spawning, so the field does not dump every skipped word into the world at once. Must exceed a slow frame (~100ms) by a wide margin
	seekEpsilon: number; // backward jump in `currentTime` (seconds) that counts as a seek rather than jitter
	fontScale: number; // word size, as a fraction of viewport width, clamped by the two below
	fontMin: number; // px
	fontMax: number; // px
	fontFitMin: number; // px; floor when a long phrase has to shrink to fit the viewport width
	wordGap: number; // space between two words' boxes (ems); the connector line is drawn across it, so it has to stay wide enough to read as a line
	rowJitter: number; // vertical wander of each word off the row's baseline (ems), so the connectors read as a constellation rather than an underline
	edgeMargin: number; // viewport fraction kept clear around a row
	rowStiffness: number; // pull seating a word into its slot in the row
	rowDamping: number; // velocity a word retains each step; below 1 it eases in instead of ringing
	bobAmp: number; // px the phrase drifts up and down, as a unit, so the row floats without bending
	bobPeriodMs: number; // period of that drift
	spawnSpread: number; // how far off its slot a word materializes before the row spring seats it (px)
	spawnSpeed: number; // speed (px/step) a word enters with
	spinRate: number; // max tumble a word enters with (± rad/step); 0 keeps it flat
	density: number;
	frictionAir: number;
	restitution: number;
	color: string; // word fill
	fontWeight: string;
	graph: Partial<GraphConfig>; // overrides merged into each phrase's {@link RelationGraph} config
};

export const SUBTITLE_DEFAULTS: SubtitleConfig = {
	leadMs: 200, // inside the doc's 150-250ms window
	holdMs: 1900, // read time after the phrase finishes
	fadeInMs: 260,
	fadeOutMs: 750,
	resyncGapMs: 500, // ~30 dropped frames: a stall, not a slow frame
	seekEpsilon: 0.25,
	fontScale: 0.016,
	fontMin: 15,
	fontMax: 26,
	fontFitMin: 11,
	wordGap: 1.5, // wide tracking: the gap is the line
	rowJitter: 0.16,
	edgeMargin: 0.08,
	rowStiffness: 0.022,
	rowDamping: 0.86,
	bobAmp: 5,
	bobPeriodMs: 7000,
	spawnSpread: 16, // words materialize near their slot; the row spring does the rest
	spawnSpeed: 0.12,
	spinRate: 0, // a word is a whole line of text: it enters flat and stays flat
	density: 0.001,
	frictionAir: 0.05,
	restitution: 0.2,
	color: 'rgba(222, 230, 255, 0.96)',
	fontWeight: '500',
	graph: {
		// The row springs own the layout, so these edges are drawn but never sprung —
		// a spring between two words could only pull them together along whatever
		// direction they already lay, which is exactly what made the words illegible.
		intraStiffness: 0,
		intraDamping: 0,
		repulsion: 0, // the row already spaces the words
		centerPull: 0, // each phrase gathers on its own anchor, by its own springs
		flowStrength: 0, // nothing to blow the words off: there is no hub card here
		memberFrictionAir: 0.06, // settle quickly — a subtitle has to hold still to be read
		uprightStiffness: 0.005,
		uprightReadableDeg: 5, // a whole word tilts as one: even a small lean reads as broken
		fadeMs: 420,
		pulseInterval: 0, // one pulse per phrase across several live phrases is noise
		webColor: 'rgba(168, 196, 255, 0.5)',
		webWidth: 1.1,
		clipIntraEdges: true, // the line spans the gap between two words, not their glyphs
		clipPad: 5
	}
};

const TAU = Math.PI * 2;
/** Golden angle: successive phrases land far from their predecessors, never in a ring. */
const GOLDEN_ANGLE = 2.399963229728653;
/** Anchor candidates tried before a phrase settles for the least-crowded one. */
const ANCHOR_TRIES = 12;
/** Clear space (px) kept between two live phrases' rows. */
const PHRASE_CLEARANCE = 18;

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** A word's place in its phrase's row, as an offset from the phrase anchor. */
type Slot = { dx: number; dy: number };

type PhraseWord = {
	cue: CueWord;
	el: HTMLSpanElement;
	slot: Slot;
	halfW: number; // half-extents of the measured text box
	halfH: number;
	/** Null until the word's timestamp arrives; laid out and measured well before that. */
	body: Matter.Body | null;
	/** When this word began fading in (ms, frame clock). */
	enterAt: number;
};

type Phrase = {
	cue: Cue;
	el: HTMLDivElement;
	words: PhraseWord[];
	/** Next word awaiting its timestamp. */
	nextWord: number;
	/** Built once every word has entered, so the graph draws a complete phrase. */
	graph: RelationGraph | null;
	/** Where this phrase's row centers, in viewport coords. */
	anchor: { x: number; y: number };
	halfW: number; // half-extents of the laid-out row, for anchor placement
	halfH: number;
	bobPhase: number;
	/** Frame-clock time the fade-out began, or 0 while the phrase is alive. */
	leavingAt: number;
};

/**
 * Voiceover subtitles as drifting rigid bodies: one body per word, laid out in a
 * left-to-right row about the phrase's anchor, entering one at a time on their
 * spoken timestamps. A damped spring seats each word in its slot, so the phrase
 * reads as an ordinary line of text that happens to float; once the phrase is
 * complete a {@link RelationGraph} draws the connectors between consecutive
 * words, clipped to their boxes so a line spans each gap. An {@link Actor} on a
 * {@link PhysicsStage}, so the words collide with whatever else lives in the
 * shared world and can be grabbed and thrown.
 *
 * The row is measured and placed when the phrase spawns, not as its words
 * arrive: a slot that moved every time a word landed would reflow the line under
 * the reader. Words are the atom rather than letters, because a letter free to
 * find its own place in a force-directed layout finds one that cannot be read.
 *
 * The audio element is the clock. `step()` samples `currentTime` and walks a
 * cursor over the sorted cues — never `setTimeout`, never an accumulated
 * `performance.now()`, both of which drift against audio that pauses on tab
 * hide, stalls on buffering, or gets seeked. Drift in a subtitle is the one
 * artifact everybody notices.
 *
 * Each phrase owns its own {@link RelationGraph}, driven directly rather than
 * registered on the stage: graphs come and go with their phrases, and mutating
 * the stage's actor list mid-frame would disturb the iteration that is calling us.
 * Reduced motion draws nothing; the audio still plays.
 */
export class SubtitleField implements Actor {
	private readonly cfg: SubtitleConfig;
	private readonly cues: Cue[];
	private readonly reduceMotion: boolean;
	private stage: PhysicsStage | null = null;

	private container: HTMLDivElement | null = null;
	readonly audio: HTMLAudioElement;

	private readonly phrases: Phrase[] = [];
	/** Index of the next cue to spawn; every cue before it has been dealt with. */
	private cursor = 0;
	/** Whether the audio has been started by a user gesture. */
	private started = false;
	/** Previous frame's `currentTime`, to catch a backward seek. */
	private lastT = 0;
	/** Previous frame's `now`, to catch a stalled loop. 0 means "no previous frame". */
	private lastNow = 0;
	/** How many anchors have been tried, ever — drives the golden-angle placement. */
	private spawnCount = 0;

	/** Fired when playback starts, ends, or is stopped, so a page can retitle its button. */
	onPlayingChange?: (playing: boolean) => void;

	constructor(cues: VoCues, config: Partial<SubtitleConfig> = {}) {
		this.cfg = {
			...SUBTITLE_DEFAULTS,
			...config,
			graph: { ...SUBTITLE_DEFAULTS.graph, ...config.graph }
		};
		this.cues = cues.cues;
		this.reduceMotion =
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		this.audio = new Audio(cues.audio);
		this.audio.preload = 'auto';
		this.audio.addEventListener('ended', this.onEnded);
	}

	mount(stage: PhysicsStage) {
		this.stage = stage;
	}

	get playing(): boolean {
		return this.started && !this.audio.paused;
	}

	/**
	 * Start the voiceover. Must be called from a user gesture — autoplay is blocked
	 * without one, and the returned promise rejects if the browser refuses.
	 */
	async play(): Promise<void> {
		if (this.started) return;
		this.started = true;
		this.lastT = this.audio.currentTime;
		this.lastNow = 0; // first frame measures no gap
		this.cursor = this.cueIndexAtOrAfter(this.audio.currentTime);
		if (!this.reduceMotion) this.buildContainer();
		await this.audio.play();
		this.stage?.wake();
		this.onPlayingChange?.(true);
	}

	/** Stop the voiceover and let the live phrases fade out. */
	stop() {
		if (!this.started) return;
		this.audio.pause();
		this.audio.currentTime = 0;
		this.started = false;
		const now = typeof performance !== 'undefined' ? performance.now() : 0;
		for (const p of this.phrases) if (!p.leavingAt) p.leavingAt = now;
		this.stage?.wake();
		this.onPlayingChange?.(false);
	}

	onScroll() {
		// Subtitles are driven by the audio clock, not by scroll.
	}

	/**
	 * A read-only view of the real state (the audio clock, the cursor, what is live),
	 * so the console hook and tests can assert on it instead of scraping the DOM.
	 */
	snapshot() {
		return {
			playing: this.playing,
			time: this.audio.currentTime,
			cursor: this.cursor,
			totalCues: this.cues.length,
			words: this.phrases.reduce((n, p) => n + p.words.filter((w) => w.body).length, 0),
			phrases: this.phrases.map((p) => ({
				text: p.cue.text,
				wordsIn: p.words.filter((w) => w.body).length,
				of: p.words.length,
				graphed: p.graph?.formed ?? false,
				leaving: p.leavingAt > 0
			}))
		};
	}

	step(ctx: StepCtx) {
		if (this.reduceMotion) return;

		if (this.started) {
			const t = this.audio.currentTime;
			const lead = this.cfg.leadMs / 1000;

			// A stalled loop (hidden tab) or a backward seek both mean the cursor no longer
			// describes what is on screen. Rebuild it from the clock instead of spawning
			// every cue we slept through.
			const gap = this.lastNow === 0 ? 0 : ctx.now - this.lastNow;
			if (gap > this.cfg.resyncGapMs || t < this.lastT - this.cfg.seekEpsilon) {
				this.resync(t, ctx.now);
			}
			this.lastNow = ctx.now;
			this.lastT = t;

			while (this.cursor < this.cues.length && this.cues[this.cursor].start <= t + lead) {
				this.spawnPhrase(this.cursor, ctx);
				this.cursor++;
			}

			// Words enter on their own timestamps, so a phrase assembles in sync with the
			// voice rather than popping in whole.
			for (const p of this.phrases) {
				while (p.nextWord < p.words.length && p.words[p.nextWord].cue.t <= t + lead) {
					this.enterWord(p, p.nextWord, ctx);
					p.nextWord++;
				}
				if (!p.leavingAt && t > p.cue.end + this.cfg.holdMs / 1000) p.leavingAt = ctx.now;
			}
		}

		// Retire faded phrases, then hold the survivors' words in their rows.
		for (let i = this.phrases.length - 1; i >= 0; i--) {
			const p = this.phrases[i];
			if (p.leavingAt && ctx.now - p.leavingAt >= this.cfg.fadeOutMs) {
				this.despawnPhrase(p);
				this.phrases.splice(i, 1);
			}
		}
		for (const p of this.phrases) {
			this.holdRow(p, ctx);
			p.graph?.step(ctx);
		}
	}

	sync(ctx: StepCtx) {
		if (this.reduceMotion) return;
		for (const p of this.phrases) {
			// The phrase's fade-out has to take its edges with it, so hand the graph the
			// same alpha the words use before it writes its overlay's opacity.
			const leaving = p.leavingAt ? 1 - clamp01((ctx.now - p.leavingAt) / this.cfg.fadeOutMs) : 1;
			if (p.graph) {
				p.graph.fade = leaving;
				p.graph.sync(ctx);
			}
			for (const w of p.words) {
				if (!w.body) continue; // laid out, but not yet spoken
				const enter = clamp01((ctx.now - w.enterAt) / this.cfg.fadeInMs);
				const scale = 0.72 + 0.28 * easeOutCubic(enter);
				const deg = (w.body.angle * 180) / Math.PI;
				w.el.style.transform =
					`translate3d(${w.body.position.x}px, ${w.body.position.y}px, 0) ` +
					`translate(-50%, -50%) rotate(${deg}deg) scale(${scale})`;
				w.el.style.opacity = `${enter * leaving}`;
			}
		}
	}

	isBusy(): boolean {
		if (this.reduceMotion) return false;
		return this.playing || this.phrases.length > 0;
	}

	dispose() {
		this.audio.removeEventListener('ended', this.onEnded);
		this.audio.pause();
		for (const p of this.phrases) this.despawnPhrase(p);
		this.phrases.length = 0;
		this.container?.remove();
		this.container = null;
	}

	private readonly onEnded = () => {
		this.started = false;
		const now = typeof performance !== 'undefined' ? performance.now() : 0;
		for (const p of this.phrases) if (!p.leavingAt) p.leavingAt = now;
		this.stage?.wake();
		this.onPlayingChange?.(false);
	};

	/**
	 * Drop every live phrase and point the cursor at the first cue still ahead of the
	 * clock. Used after a stall or a seek, where spawning the skipped cues would dump
	 * the whole backlog into the world at once.
	 */
	private resync(t: number, now: number) {
		for (const p of this.phrases) this.despawnPhrase(p);
		this.phrases.length = 0;
		this.cursor = this.cueIndexAtOrAfter(t);
		this.lastNow = now;
	}

	/**
	 * First cue not yet begun at `t` (binary search; the cues are sorted). Pass the raw
	 * clock, never `t + lead`: `step()` already spawns everything inside the lead window,
	 * so biasing the cursor forward by the lead skips those cues instead of spawning them
	 * early. A cue starting exactly at `t` has not begun, and is the cursor.
	 */
	private cueIndexAtOrAfter(t: number): number {
		let lo = 0;
		let hi = this.cues.length;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (this.cues[mid].start < t) lo = mid + 1;
			else hi = mid;
		}
		return lo;
	}

	private buildContainer() {
		if (this.container) return;
		const el = document.createElement('div');
		// Above the RelationGraph overlays (z-index -1) so the words sit on their edges.
		el.style.cssText =
			'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:1';
		el.setAttribute('aria-hidden', 'true');
		document.body.appendChild(el);
		this.container = el;
	}

	/**
	 * Spawn a phrase: render and measure every word, lay them out in a row, and place
	 * that row where it fits. The words themselves stay invisible until {@link enterWord}
	 * gives each one a body on its own timestamp.
	 */
	private spawnPhrase(index: number, ctx: StepCtx) {
		if (!this.container) return;
		const cue = this.cues[index];
		if (cue.words.length === 0) return;

		const el = document.createElement('div');
		el.style.cssText = 'position:absolute;left:0;top:0';
		this.container.appendChild(el);

		const words = this.layoutRow(el, cue.words, ctx);
		const halfW = words.reduce((m, w) => Math.max(m, Math.abs(w.slot.dx) + w.halfW), 0);
		const halfH = words.reduce((m, w) => Math.max(m, Math.abs(w.slot.dy) + w.halfH), 0);

		this.phrases.push({
			cue,
			el,
			words,
			nextWord: 0,
			graph: null,
			anchor: this.placeAnchor(halfW, halfH, ctx),
			halfW,
			halfH,
			bobPhase: Math.random() * TAU,
			leavingAt: 0
		});
	}

	/**
	 * Build a span per word, measure them in one pass, and hand back the row: each
	 * word's offset from the phrase's center, plus its half-extents. The font shrinks
	 * if the phrase would not otherwise fit across the viewport.
	 */
	private layoutRow(parent: HTMLDivElement, cues: CueWord[], ctx: StepCtx): PhraseWord[] {
		let size = clamp(ctx.width * this.cfg.fontScale, this.cfg.fontMin, this.cfg.fontMax);

		const els = cues.map((w) => {
			const span = document.createElement('span');
			span.textContent = w.w;
			span.style.cssText =
				`position:absolute;left:0;top:0;opacity:0;will-change:transform,opacity;white-space:pre;` +
				`font-size:${size}px;font-weight:${this.cfg.fontWeight};color:${this.cfg.color};` +
				`text-shadow:0 0 6px rgba(8,10,20,0.9),0 0 2px rgba(8,10,20,0.9)`;
			parent.appendChild(span);
			return span;
		});

		// Measure after append, in one pass, so the browser lays out once.
		const measure = () => els.map((el) => el.getBoundingClientRect());
		const rowWidth = (boxes: DOMRect[], gap: number) =>
			boxes.reduce((sum, b) => sum + b.width, 0) + gap * (boxes.length - 1);

		let boxes = measure();
		let gap = size * this.cfg.wordGap;
		const avail = ctx.width * (1 - 2 * this.cfg.edgeMargin);
		let total = rowWidth(boxes, gap);

		// A long phrase is shrunk to fit rather than run off the edges. The widths scale
		// with the font, so one correction lands close; re-measure for the truth.
		if (total > avail && avail > 0) {
			size = Math.max(this.cfg.fontFitMin, size * (avail / total));
			for (const el of els) el.style.fontSize = `${size}px`;
			boxes = measure();
			gap = size * this.cfg.wordGap;
			total = rowWidth(boxes, gap);
		}

		const seed = this.spawnCount * GOLDEN_ANGLE;
		let x = -total / 2;
		return cues.map((cue, i) => {
			const b = boxes[i];
			const dx = x + b.width / 2;
			x += b.width + gap;
			return {
				cue,
				el: els[i],
				slot: { dx, dy: Math.sin(seed + i * GOLDEN_ANGLE) * size * this.cfg.rowJitter },
				halfW: Math.max(1, b.width / 2),
				// Shorter than the text box: the connectors leave the words' sides, and a
				// full-height box would have them clip out of a corner on a jittered row.
				halfH: Math.max(1, b.height * 0.32),
				body: null,
				enterAt: 0
			};
		});
	}

	/**
	 * Where a row of the given half-extents goes. Successive candidates step by the
	 * golden angle around the viewport center, and the first that clears every live
	 * phrase wins — rows are wide, so two of them landing on top of each other is far
	 * more likely (and more ruinous) than it was for scattered letters. If none is
	 * clear, the roomiest candidate is used.
	 */
	private placeAnchor(halfW: number, halfH: number, ctx: StepCtx) {
		const cx = ctx.width / 2;
		const cy = ctx.height / 2;
		// A row too big for the viewport gets centered rather than clamped to nothing.
		const marginX = ctx.width * this.cfg.edgeMargin + halfW;
		const marginY = ctx.height * this.cfg.edgeMargin + halfH;
		const loX = Math.min(marginX, cx);
		const hiX = Math.max(ctx.width - marginX, cx);
		const loY = Math.min(marginY, cy);
		const hiY = Math.max(ctx.height - marginY, cy);

		let best = { x: cx, y: cy };
		let bestClearance = -Infinity;
		for (let i = 0; i < ANCHOR_TRIES; i++) {
			const raw = this.anchorFor(this.spawnCount++, ctx.width, ctx.height);
			const p = { x: clamp(raw.x, loX, hiX), y: clamp(raw.y, loY, hiY) };
			const clearance = this.clearanceAt(p, halfW, halfH);
			if (clearance >= 0) return p;
			if (clearance > bestClearance) {
				bestClearance = clearance;
				best = p;
			}
		}
		return best;
	}

	/**
	 * How far a row at `p` sits from the nearest live phrase's row: negative when the
	 * two boxes overlap, `Infinity` when nothing else is on screen.
	 */
	private clearanceAt(p: { x: number; y: number }, halfW: number, halfH: number): number {
		let worst = Infinity;
		for (const q of this.phrases) {
			if (q.leavingAt) continue; // already on its way out; let a new row take the space
			const sx = Math.abs(p.x - q.anchor.x) - (halfW + q.halfW) - PHRASE_CLEARANCE;
			const sy = Math.abs(p.y - q.anchor.y) - (halfH + q.halfH) - PHRASE_CLEARANCE;
			worst = Math.min(worst, Math.max(sx, sy)); // separated if either axis clears
		}
		return worst;
	}

	/**
	 * Candidate `n` on a golden-angle spiral about the viewport center: consecutive
	 * phrases never land on top of each other, and the radius cycles so the field
	 * fills rather than tracing a ring. {@link placeAnchor} clamps it on screen.
	 */
	private anchorFor(n: number, width: number, height: number) {
		const angle = n * GOLDEN_ANGLE;
		const frac = (n * 0.618033988749895) % 1;
		const rx = width * (0.16 + 0.24 * frac);
		const ry = height * (0.14 + 0.2 * frac);
		return { x: width / 2 + Math.cos(angle) * rx, y: height / 2 + Math.sin(angle) * ry };
	}

	/** Give one word its body, near its slot, and draw the phrase once the last one lands. */
	private enterWord(phrase: Phrase, wordIndex: number, ctx: StepCtx) {
		if (!this.stage) return;
		const word = phrase.words[wordIndex];

		// Materialize just off the slot, so the word visibly settles into the row.
		const dir = Math.random() * TAU;
		const r = Math.random() * this.cfg.spawnSpread;
		const body = Bodies.rectangle(
			phrase.anchor.x + word.slot.dx + Math.cos(dir) * r,
			phrase.anchor.y + word.slot.dy + Math.sin(dir) * r,
			word.halfW * 2,
			word.halfH * 2,
			{
				restitution: this.cfg.restitution,
				density: this.cfg.density,
				friction: 0,
				frictionAir: this.cfg.frictionAir,
				frictionStatic: 0
			}
		);
		const drift = Math.random() * TAU;
		Body.setVelocity(body, {
			x: Math.cos(drift) * this.cfg.spawnSpeed,
			y: Math.sin(drift) * this.cfg.spawnSpeed
		});
		Body.setAngularVelocity(body, (Math.random() * 2 - 1) * this.cfg.spinRate);
		this.stage.addBody(body, { grabbable: true });

		word.body = body;
		word.enterAt = ctx.now;
		if (phrase.words.every((w) => w.body)) this.formGraph(phrase);
	}

	/**
	 * Hold every word of a phrase in its slot with a damped spring, the whole row
	 * bobbing as one so it floats without bending. A word being dragged is left alone,
	 * and springs back when it is let go.
	 */
	private holdRow(phrase: Phrase, ctx: StepCtx) {
		const bob =
			Math.sin((ctx.now / this.cfg.bobPeriodMs) * TAU + phrase.bobPhase) * this.cfg.bobAmp;
		const k = this.cfg.rowStiffness;
		const d = this.cfg.rowDamping;
		for (const w of phrase.words) {
			const body = w.body;
			if (!body || body === ctx.draggedBody) continue;
			const tx = phrase.anchor.x + w.slot.dx;
			const ty = phrase.anchor.y + w.slot.dy + bob;
			Body.setVelocity(body, {
				x: (body.velocity.x + (tx - body.position.x) * k) * d,
				y: (body.velocity.y + (ty - body.position.y) * k) * d
			});
		}
	}

	/** Draw the finished phrase: one connector per adjacent pair, left to right. */
	private formGraph(phrase: Phrase) {
		if (!this.stage || phrase.graph) return;
		const nodes = phrase.words
			.filter((w): w is PhraseWord & { body: Matter.Body } => w.body !== null)
			.map((w) => ({ body: w.body }));
		if (nodes.length === 0) return;

		// One cluster, in reading order: its intra edges are the connectors. There is no
		// spine and no hub — a phrase is a single run of words.
		const clusters: GraphSpec['clusters'] = [{ nodes }];
		const graph = new RelationGraph(this.cfg.graph);
		graph.mount(this.stage);
		graph.activate({ clusters });
		phrase.graph = graph;
	}

	private despawnPhrase(phrase: Phrase) {
		phrase.graph?.deactivate();
		phrase.graph = null;
		for (const w of phrase.words) {
			if (w.body) this.stage?.removeBody(w.body);
			w.body = null;
		}
		phrase.el.remove();
	}
}
