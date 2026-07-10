import Matter from 'matter-js';
import type { Actor, StepCtx } from '../physics/actor.js';
import type { PhysicsStage } from '../physics/stage.js';
import { RelationGraph, type GraphConfig, type GraphSpec } from '../physics/relation-graph.js';
import type { Cue, CueWord, VoCues } from './cues.js';

const { Bodies, Body } = Matter;

/** Tunable knobs for how the subtitles enter, read, and leave. */
export type SubtitleConfig = {
	/**
	 * How far ahead of a word's timestamp it spawns (ms). A word that appears at the
	 * instant it is spoken reads as late — the eye needs a beat to find and parse it.
	 * This also absorbs the hardware output latency `currentTime` does not report.
	 */
	leadMs: number;
	/** How long a phrase lingers after its last word finishes (ms). */
	holdMs: number;
	/** Fade/scale-in of a word as it enters (ms). */
	fadeInMs: number;
	/** Fade-out of a whole phrase once it has been held (ms). */
	fadeOutMs: number;
	/**
	 * A frame gap this long (ms) means the loop stalled — a hidden tab, most often,
	 * where rAF pauses while the audio plays on. Past it the cursor is fast-forwarded
	 * without spawning, so the field does not dump every skipped word into the world
	 * at once. Must exceed a slow frame (~100ms) by a wide margin.
	 */
	resyncGapMs: number;
	/** Backward jump in `currentTime` (seconds) that counts as a seek rather than jitter. */
	seekEpsilon: number;
	/** Letter size, as a fraction of viewport width, clamped by the two below. */
	fontScale: number;
	fontMin: number; // px
	fontMax: number; // px
	/** How far a phrase's words scatter from its anchor before the springs gather them (px). */
	spawnSpread: number;
	/** Outward speed (px/step) a letter enters with. */
	spawnSpeed: number;
	/** Max tumble a letter enters with (± rad/step). */
	spinRate: number;
	density: number;
	frictionAir: number;
	restitution: number;
	color: string; // letter fill
	fontWeight: string;
	/** Overrides merged into each phrase's {@link RelationGraph} config. */
	graph: Partial<GraphConfig>;
};

export const SUBTITLE_DEFAULTS: SubtitleConfig = {
	leadMs: 200, // inside the doc's 150-250ms window
	holdMs: 1900, // read time after the phrase finishes
	fadeInMs: 280,
	fadeOutMs: 750,
	resyncGapMs: 500, // ~30 dropped frames: a stall, not a slow frame
	seekEpsilon: 0.25,
	fontScale: 0.016,
	fontMin: 15,
	fontMax: 26,
	spawnSpread: 34, // words land near their anchor; the springs do the rest
	spawnSpeed: 0.22,
	spinRate: 0.006,
	density: 0.001,
	frictionAir: 0,
	restitution: 0.3,
	color: 'rgba(222, 230, 255, 0.96)',
	fontWeight: '500',
	graph: {
		intraSpread: 1.3, // no edge labels to fit between, so letters sit close and read as a word
		intraStiffness: 0.05,
		intraDamping: 0.14,
		linkLength: 95,
		linkStiffness: 0.02,
		linkDamping: 0.08,
		repulsion: 0.18, // letters are small; a light fan, not the homepage's wide push
		repulsionRadius: 18,
		centerPull: 0.0012, // gather on the phrase's own anchor, not the viewport centre
		flowStrength: 0, // nothing to blow the words off: there is no hub card here
		memberFrictionAir: 0.08, // settle quickly — a subtitle has to hold still to be read
		uprightStiffness: 0.004,
		uprightReadableDeg: 20, // tighter than the hero's ±45°: these are meant to be read
		fadeMs: 420,
		pulseInterval: 0, // one pulse per phrase across eight live phrases is noise
		webWidth: 1,
		hubWidth: 1.2
	}
};

const TAU = Math.PI * 2;
/** Golden angle: successive phrases land far from their predecessors, never in a ring. */
const GOLDEN_ANGLE = 2.399963229728653;

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

type Letter = {
	el: HTMLSpanElement;
	body: Matter.Body;
	/** When this letter began fading in (ms, frame clock). Staggered across its word. */
	enterAt: number;
};

type PhraseWord = {
	cue: CueWord;
	letters: Letter[];
	spawned: boolean;
};

type Phrase = {
	cue: Cue;
	el: HTMLDivElement;
	words: PhraseWord[];
	/** Next word awaiting its timestamp. */
	nextWord: number;
	/** Built once every word has entered, so the graph springs a complete phrase. */
	graph: RelationGraph | null;
	/** Where this phrase gathers, in viewport coords. */
	anchor: { x: number; y: number };
	/** Frame-clock time the fade-out began, or 0 while the phrase is alive. */
	leavingAt: number;
};

/**
 * Voiceover subtitles as drifting rigid bodies: each phrase spawns near its own
 * anchor, its words enter one at a time on their spoken timestamps, and once the
 * phrase is complete a {@link RelationGraph} springs the letters into a legible
 * chain. An {@link Actor} on a {@link PhysicsStage}, so the letters collide with
 * whatever else lives in the shared world.
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
	/** How many phrases have spawned, ever — drives the golden-angle anchor placement. */
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
		this.cursor = this.cueIndexAfter(this.audio.currentTime + this.cfg.leadMs / 1000);
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
			letters: this.phrases.reduce(
				(n, p) => n + p.words.reduce((m, w) => m + w.letters.length, 0),
				0
			),
			phrases: this.phrases.map((p) => ({
				text: p.cue.text,
				wordsIn: p.words.filter((w) => w.spawned).length,
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

		// Retire faded phrases, then let the survivors' graphs pull their letters together.
		for (let i = this.phrases.length - 1; i >= 0; i--) {
			const p = this.phrases[i];
			if (p.leavingAt && ctx.now - p.leavingAt >= this.cfg.fadeOutMs) {
				this.despawnPhrase(p);
				this.phrases.splice(i, 1);
			}
		}
		for (const p of this.phrases) p.graph?.step(ctx);
	}

	sync(ctx: StepCtx) {
		if (this.reduceMotion) return;
		for (const p of this.phrases) {
			// The phrase's fade-out has to take its edges with it, so hand the graph the
			// same alpha the letters use before it writes its overlay's opacity.
			const leaving = p.leavingAt ? 1 - clamp01((ctx.now - p.leavingAt) / this.cfg.fadeOutMs) : 1;
			if (p.graph) {
				p.graph.fade = leaving;
				p.graph.sync(ctx);
			}
			for (const word of p.words) {
				for (const l of word.letters) {
					const enter = clamp01((ctx.now - l.enterAt) / this.cfg.fadeInMs);
					const scale = 0.55 + 0.45 * easeOutCubic(enter);
					const deg = (l.body.angle * 180) / Math.PI;
					l.el.style.transform =
						`translate3d(${l.body.position.x}px, ${l.body.position.y}px, 0) ` +
						`translate(-50%, -50%) rotate(${deg}deg) scale(${scale})`;
					l.el.style.opacity = `${enter * leaving}`;
				}
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
		this.cursor = this.cueIndexAfter(t + this.cfg.leadMs / 1000);
		this.lastNow = now;
	}

	/** First cue starting strictly after `t` (binary search; the cues are sorted). */
	private cueIndexAfter(t: number): number {
		let lo = 0;
		let hi = this.cues.length;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (this.cues[mid].start <= t) lo = mid + 1;
			else hi = mid;
		}
		return lo;
	}

	private buildContainer() {
		if (this.container) return;
		const el = document.createElement('div');
		// Above the RelationGraph overlays (z-index -1) so the letters sit on their edges.
		el.style.cssText =
			'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:1';
		el.setAttribute('aria-hidden', 'true');
		document.body.appendChild(el);
		this.container = el;
	}

	/**
	 * Where phrase `n` gathers. Successive phrases step by the golden angle around the
	 * viewport centre, so consecutive lines never land on top of each other, and the
	 * radius cycles so the field fills rather than tracing a ring.
	 */
	private anchorFor(n: number, width: number, height: number) {
		const angle = n * GOLDEN_ANGLE;
		const frac = (n * 0.618033988749895) % 1;
		const rx = width * (0.16 + 0.24 * frac);
		const ry = height * (0.14 + 0.2 * frac);
		const margin = 0.12;
		return {
			x: Math.min(width * (1 - margin), Math.max(width * margin, width / 2 + Math.cos(angle) * rx)),
			y: Math.min(
				height * (1 - margin),
				Math.max(height * margin, height / 2 + Math.sin(angle) * ry)
			)
		};
	}

	private spawnPhrase(index: number, ctx: StepCtx) {
		if (!this.container) return;
		const cue = this.cues[index];
		const el = document.createElement('div');
		el.style.cssText = 'position:absolute;left:0;top:0';
		this.container.appendChild(el);

		this.phrases.push({
			cue,
			el,
			words: cue.words.map((w) => ({ cue: w, letters: [], spawned: false })),
			nextWord: 0,
			graph: null,
			anchor: this.anchorFor(this.spawnCount++, ctx.width, ctx.height),
			leavingAt: 0
		});
	}

	/** Build one word's letters as bodies + spans, and form the graph once the phrase is whole. */
	private enterWord(phrase: Phrase, wordIndex: number, ctx: StepCtx) {
		if (!this.stage) return;
		const word = phrase.words[wordIndex];
		const size = Math.min(
			this.cfg.fontMax,
			Math.max(this.cfg.fontMin, ctx.width * this.cfg.fontScale)
		);

		// Scatter the words around the phrase's anchor so the springs have something to
		// gather, then lay each word's letters out left-to-right about its own centre.
		const a = wordIndex * GOLDEN_ANGLE;
		const spread = this.cfg.spawnSpread * (1 + wordIndex * 0.35);
		const wx = phrase.anchor.x + Math.cos(a) * spread;
		const wy = phrase.anchor.y + Math.sin(a) * spread;

		const chars = [...word.cue.w];
		const els = chars.map((ch) => {
			const span = document.createElement('span');
			span.textContent = ch;
			span.style.cssText =
				`position:absolute;left:0;top:0;will-change:transform,opacity;white-space:pre;` +
				`font-size:${size}px;font-weight:${this.cfg.fontWeight};color:${this.cfg.color};` +
				`text-shadow:0 0 6px rgba(8,10,20,0.9),0 0 2px rgba(8,10,20,0.9)`;
			phrase.el.appendChild(span);
			return span;
		});

		// Measure after append, in one pass, so the browser lays out once.
		const boxes = els.map((el) => el.getBoundingClientRect());
		const total = boxes.reduce((sum, b) => sum + b.width, 0);

		// Letters of a word stagger across the time it is actually spoken, so a long word
		// assembles as it is said rather than snapping in on its first frame.
		const staggerMs = Math.min(word.cue.d * 1000, this.cfg.fadeInMs * 2);

		let cx = wx - total / 2;
		chars.forEach((ch, i) => {
			const b = boxes[i];
			const px = cx + b.width / 2;
			cx += b.width;
			const w = Math.max(2, b.width);
			const h = Math.max(2, b.height);
			const body = Bodies.rectangle(px, wy, w * 0.92, h * 0.68, {
				restitution: this.cfg.restitution,
				density: this.cfg.density,
				friction: 0,
				frictionAir: this.cfg.frictionAir,
				frictionStatic: 0
			});
			const dir = Math.random() * TAU;
			Body.setVelocity(body, {
				x: Math.cos(dir) * this.cfg.spawnSpeed,
				y: Math.sin(dir) * this.cfg.spawnSpeed
			});
			Body.setAngularVelocity(body, (Math.random() * 2 - 1) * this.cfg.spinRate);
			this.stage!.addBody(body, { grabbable: true });

			word.letters.push({
				el: els[i],
				body,
				enterAt: ctx.now + (chars.length > 1 ? (i / (chars.length - 1)) * staggerMs : 0)
			});
		});

		word.spawned = true;
		if (phrase.words.every((w) => w.spawned)) this.formGraph(phrase);
	}

	/** Spring the finished phrase into a chain: letters within a word, words along a spine. */
	private formGraph(phrase: Phrase) {
		if (!this.stage || phrase.graph) return;
		const clusters: GraphSpec['clusters'] = phrase.words
			.filter((w) => w.letters.length > 0)
			.map((w) => ({ nodes: w.letters.map((l) => ({ body: l.body })) }));
		if (clusters.length === 0) return;

		const links = clusters.slice(1).map((_, i) => ({ from: i, to: i + 1 }));
		const graph = new RelationGraph(this.cfg.graph);
		graph.mount(this.stage);
		graph.centerTarget = () => phrase.anchor;
		graph.activate({ clusters, links });
		phrase.graph = graph;
	}

	private despawnPhrase(phrase: Phrase) {
		phrase.graph?.deactivate();
		phrase.graph = null;
		for (const word of phrase.words) {
			for (const l of word.letters) this.stage?.removeBody(l.body);
			word.letters.length = 0;
		}
		phrase.el.remove();
	}
}
