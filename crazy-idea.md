# Purpose

Maintain important context for the crazy idea we're doing: creating subtitles that float around in space.

## How the Text Gets Connected

`RelationGraph` (`src/lib/physics/relation-graph.ts`) is a force-directed graph actor sharing the same Matter.js world as the drifting glyphs and the project cards.

**Physics.** Every edge is a real Matter `Constraint` (a spring) added to the shared world and solved by the stage. Springs within a word gather its letters into a legible chain, with a rest length derived from glyph width × `intraSpread` rather than from wherever they happened to scatter to. Springs between words form the spine, and one gentle spring ties the hub card out to the anchor letter. Springs alone would collapse everything onto the lines, so `step()` adds the rest of a force-directed layout: pairwise surface-based `repulsion` fans the nodes apart, a `flowDirection` push blows glyphs off the card (right on desktop, up on mobile), `hubAnchor` pins the card itself with a damped velocity spring, and `readableUprightTorque` holds each letter within ±45° of upright so the words stay readable. Member bodies get a temporary `frictionAir` bump so the soft body settles instead of ringing forever in zero-g; the original value is restored on deactivate.

**Rendering.** The lines are SVG, not canvas and not Matter's debug renderer. `activate()` builds one fixed, full-viewport, `pointer-events:none` `<svg>` pinned at `z-index:-1` — between the star field and the hero text — and appends a `<line>` per edge plus an optional `<text>` label. Each frame, `sync()` copies the live body positions onto the line endpoints, so the lines track the letters wherever physics moves them. The hub edge is clipped to the card's box edge via `clipToBox` so it meets the border instead of the center. The whole group fades in over `fadeMs`, and a pulse dot periodically travels the real edges out from the hub into one cluster at a time.

The graph is purely additive: it only adds constraints and draws lines, never writing the glyphs' transforms, which `GlyphField` still owns. It no-ops entirely under `prefers-reduced-motion`.

## How to Map Audio File to Timed Events

We already know the words, so this is not a speech-recognition problem — it is a _forced alignment_ problem: given audio plus a known transcript, produce a start and end timestamp for every word. Off-the-shelf aligners land word boundaries within 20-50ms, comfortably under the ~80ms where desync becomes perceptible. That makes timing a build-step concern rather than a runtime one.

**Alignment (offline).** `scripts/align-vo.mjs` takes the audio and the transcript and writes `static/vo/hero.cues.json`, following the same precompute pattern as `gen-star-catalog.mjs` and `fetch-trajectories.mjs`. WhisperX is the tool of choice — it runs Whisper for a rough transcript, then does real wav2vec2 forced alignment against the known text to recover word-level timings. Montreal Forced Aligner is more accurate but a much heavier install, and for a voiceover of 60-150 words the difference does not survive contact with a hand pass: run the aligner once, check its output against an Audacity label track, nudge the handful of words it got wrong, and never run it again.

**Cue schema.** Cues are phrases with per-word offsets nested inside, which gives both granularities at once. A phrase spawns as a unit so `RelationGraph` can spring its letters into a legible chain; each word within it enters on its own timestamp, so the phrase assembles in sync instead of popping in whole.

```json
{
	"audio": "/vo/hero.mp3",
	"cues": [
		{
			"start": 1.24,
			"end": 2.91,
			"text": "we build in the open",
			"words": [
				{ "t": 1.24, "d": 0.19, "w": "we" },
				{ "t": 1.47, "d": 0.31, "w": "build" }
			]
		}
	]
}
```

**Playback.** The audio element is the clock. Never `setTimeout`, never an accumulated `performance.now()` — both drift against audio that pauses on tab hide, stalls on buffering, or gets seeked, and drift in a subtitle is the one artifact everybody notices. A `SubtitleField` actor samples `audio.currentTime` in its `step()` and advances a cursor over the sorted cue array: `while (i < cues.length && cues[i].start <= t + leadMs / 1000) spawn(cues[i++])`.

Playback starts on a click. Autoplay is blocked without a user gesture, and the field no-ops entirely under `prefers-reduced-motion`, as `RelationGraph` does.

**Timing details that bite.**

- Spawn early. A word that appears at the instant it is spoken reads as late, because the eye needs a beat to find and parse it. `leadMs` starts around 150-250ms and also absorbs the 20-50ms of hardware output latency that `currentTime` does not account for.
- Tab-hide is the real bug. RAF pauses while audio keeps playing, so on return `t` has jumped and the `while` loop dumps thirty words into the world at once. On a frame gap over threshold, fast-forward the cursor without spawning.
- Backward seeks mean `t < lastT`. Binary-search the cursor back and despawn anything ahead of it.

**Coloring by part of speech.** `scripts/build-cues.mjs` runs the whole voiceover through [compromise](https://github.com/spencermountain/compromise) and writes a `p` tag onto every word, which `SubtitleField` maps to a fill in `POS_COLORS`. Tagging is a build step for the same reason alignment is: the words never change, so the browser should not ship a 200KB NLP library to rediscover that "stars" is a noun.

The document is tagged whole, not cue by cue — a cue is a fragment, and compromise reads "code," as a verb or a noun depending on the sentence around it. Terms come back with character offsets into the input, which is what lets them be matched to the words that produced them even though compromise does not hand back the tokens it was given: a contraction expands ("there's" becomes "there" plus a zero-length "is" carrying the verb tags) and a hyphenate splits ("how-to" becomes "how" plus "to"). Both land inside the word's span, so a word takes the first part of speech among the terms overlapping it.

Content words are bright and hued, grammatical scaffolding is desaturated and dim, and nouns keep the near-white the subtitles had before there was a palette — they are a quarter of the script, and the sky should not turn into a highlighter. The connector lines stay neutral: colored words on colored edges is soup. `npm run build:cues -- --pos` prints the tag chosen for every word.

The tagger is right about 97% of the time, and `POS_OVERRIDES` corrects the rest: it reads the "code," ending a list of nouns as a bare infinitive, "tell" in "let us tell stories" as the noun, and the sentence-final "now." as the "now that" conjunction. "what" it declines to tag at all. Keys are the word, lowercased and stripped of edge punctuation; `word#n` corrects only the nth occurrence, for a word that is genuinely two parts of speech in two places.

An override that matches no word, or that agrees with the tagger, fails the build. Both are how a table like this rots: the first is a typo or a line left behind by a script edit, and the second outlives the bug it was written for, so that upgrading compromise silently makes it a lie. `--pos` stars the words the table corrected.

**Why not WebVTT.** It supports karaoke-style inline word timings (`<00:01.240>we <00:01.450>build`) and the browser fires `cuechange` for free, but `cuechange` only fires at cue granularity — the inline timings still have to be parsed by hand. JSON is simpler and skips the `<track>` element.

## Voice Over file and script

`Main_VO_04.wav`

The great thing about being in a group like Void Projects is that I can work on whatever I want. The downside is that there's so much stuff I want.

There's so much stuff at any job, really. You could drown in all the emails, tickets, database schemas, architectural diagrams, how-to manuals, code, documentation, reports...the list goes on. And we need all this to build anything useful.

But sometimes I look at all this stuff and wonder, "Where's the information?" I know it's in there somewhere. It's just buried in layers of chaos.

When we look up at the stars, we draw lines that aren't really there. They let us tell stories and point our ships the right way. 

I'm gonna draw lines of my own. I'm gonna build a new kind of map.

I know what to work on now.