/**
 * The cue file `scripts/align_vo.py` emits: phrases with per-word offsets nested
 * inside, which gives both granularities at once. A phrase is the unit that
 * springs into a legible chain; a word is the unit that enters on its own beat.
 */

/** One spoken word: when it starts, how long it lasts, and the text to draw. */
export type CueWord = {
	t: number; // start (seconds into the audio)
	d: number; // spoken duration (seconds)
	w: string; // display text, punctuation and all
};

/** One phrase: a run of words short enough to read as a floating chain. */
export type Cue = {
	start: number; // seconds; equals words[0].t
	end: number; // seconds; equals the last word's t + d
	text: string; // the whole phrase, for a11y and debugging
	words: CueWord[];
};

export type VoCues = {
	audio: string; // URL the browser fetches the audio from
	duration: number; // seconds; the full track
	cues: Cue[]; // sorted by start
};

/**
 * Fetch and validate a cue file. The cursor in {@link SubtitleField} assumes the
 * cues are sorted by start, so sort defensively rather than trust the file — a
 * hand-nudged timing is exactly the kind of edit that reorders two cues.
 */
export async function loadCues(url: string, fetcher: typeof fetch = fetch): Promise<VoCues> {
	const res = await fetcher(url);
	if (!res.ok) throw new Error(`cues: ${url} -> ${res.status}`);
	const data = (await res.json()) as VoCues;
	if (!data?.audio || !Array.isArray(data.cues)) throw new Error(`cues: ${url} is malformed`);
	data.cues.sort((a, b) => a.start - b.start);
	for (const cue of data.cues) cue.words.sort((a, b) => a.t - b.t);
	return data;
}
