# /// script
# requires-python = ">=3.10"
# dependencies = ["torch", "torchaudio", "soundfile"]
# ///
"""Seed a hand-tunable cue script by force-aligning a voiceover to its transcript.

This runs once. Its output, scripts/vo/hero.cues.txt, is a text file you own and
edit; build-cues.mjs compiles that into the JSON the browser loads. Rerunning
this OVERWRITES your hand-tuning, so it takes an explicit --force to do so.

The transcript is known, so this is alignment only -- no speech recognition. The
wav2vec2 emission is scored against the transcript's token sequence (torchaudio's
MMS_FA bundle, the same acoustic model WhisperX aligns with). Expect word
boundaries within 20-50ms, comfortably under the ~80ms where desync shows.
"""

import argparse
import os
import re
import sys
import unicodedata

import soundfile
import torch
import torchaudio

# A phrase spawns as a unit and has to stay legible as a floating chain, so
# sentences are chopped well below their natural length.
MAX_PHRASE_WORDS = 6
MIN_PHRASE_WORDS = 2
# Length a forced break aims for; seams near it beat seams that merely fit.
TARGET_PHRASE_WORDS = 4

# Punctuation that ends a phrase, so a break lands where the voice already pauses.
BREAK_CHARS = ',.?!;:'

# Words that typically open a clause or a prepositional phrase. When a run is too
# long to fit one cue and the punctuation gives us nowhere to cut, breaking just
# before one of these lands on a grammatical seam ("... is that | I can work ...")
# rather than mid-thought ("... being in | a group ..."). A crude stand-in for a
# parser, but the transcript is 140 words and the failures are visible by eye.
HEAD_WORDS = frozenset("""
and but or so nor yet that which who whom whose when where while if because
although though since unless until as than in on at to of for with from by
about into onto over under like i we you they he she it there this these those
could would should can will what how why
the a an my our your its their his her
""".split())

# MMS_FA's dictionary is lowercase a-z plus apostrophe. Anything else must be
# folded away before tokenizing or the aligner will not have a token for it.
TOKENIZABLE = re.compile(r"[^a-z']")


def normalize(word: str) -> str:
    """Fold a display word down to the aligner's alphabet, or '' if nothing survives."""
    # Curly apostrophes and dashes would otherwise vanish, welding words together.
    w = unicodedata.normalize('NFKD', word).lower()
    w = w.replace('’', "'").replace('‘', "'")
    w = w.replace('—', ' ').replace('–', ' ').replace('-', ' ')
    w = TOKENIZABLE.sub('', w)
    return w.strip("'")


def read_tokens(path: str):
    """Transcript -> [(display, aligned, breaks_after)], dropping unalignable words."""
    text = open(path, encoding='utf-8').read()
    tokens = []
    for raw in text.split():
        # "reports...the" is two words to the ear and one to str.split().
        pieces = [p for p in re.split(r'\.{2,}', raw) if p]
        for i, piece in enumerate(pieces):
            display = piece.strip('"“”')
            aligned = normalize(piece)
            if not aligned:
                continue
            tail = piece.rstrip('"“”')
            # The ellipsis is a pause, so every piece but the last one breaks after it.
            breaks = i < len(pieces) - 1 or (bool(tail) and tail[-1] in BREAK_CHARS)
            # A hyphenated word ("how-to") is one display word but two aligner words.
            tokens.append((display, aligned.split(), breaks))
    return tokens


def split_run(run, tokens):
    """Chop one punctuation-delimited run into cues of at most MAX_PHRASE_WORDS."""
    cues = []
    while len(run) > MAX_PHRASE_WORDS:
        # `i` is a break-before index, so it is also the head chunk's length. Take the
        # seam nearest the target length (ties to the longer chunk); with no seam at
        # all, fall back to a blunt cut at the cap.
        seams = [
            i
            for i in range(MIN_PHRASE_WORDS, MAX_PHRASE_WORDS + 1)
            if tokens[run[i]][1][0] in HEAD_WORDS
        ]
        cut = min(seams, key=lambda i: (abs(i - TARGET_PHRASE_WORDS), -i), default=MAX_PHRASE_WORDS)
        cues.append(run[:cut])
        run = run[cut:]
    if run:
        cues.append(run)
    return cues


def phrase_cues(tokens):
    """Token indices grouped into phrase cues: break on punctuation, then on length."""
    cues, run = [], []
    for i, (_, _, breaks) in enumerate(tokens):
        run.append(i)
        if breaks:
            cues.extend(split_run(run, tokens))
            run = []
    if run:
        cues.extend(split_run(run, tokens))
    return cues


def load_audio(path: str, target_rate: int):
    # soundfile, not torchaudio.load: torchaudio >=2.9 routes load() through
    # TorchCodec, which shells out to ffmpeg. soundfile reads the WAV directly.
    data, rate = soundfile.read(path, dtype='float32', always_2d=True)
    wave = torch.from_numpy(data.T)
    if wave.shape[0] > 1:
        wave = wave.mean(dim=0, keepdim=True)  # aligner wants mono
    if rate != target_rate:
        wave = torchaudio.functional.resample(wave, rate, target_rate)
    return wave


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--audio', required=True)
    ap.add_argument('--transcript', required=True)
    ap.add_argument('--out', required=True, help='cue script to seed (refuses to clobber)')
    ap.add_argument('--force', action='store_true', help='overwrite an existing cue script')
    ap.add_argument('--warmup', action='store_true', help='fetch deps + model, then exit')
    args = ap.parse_args()

    if os.path.exists(args.out) and not (args.force or args.warmup):
        print(f'{args.out} exists; hand-tuned timings live there. Pass --force to overwrite.',
              file=sys.stderr)
        return 1

    bundle = torchaudio.pipelines.MMS_FA
    model = bundle.get_model()
    tokenizer = bundle.get_tokenizer()
    aligner = bundle.get_aligner()
    if args.warmup:
        print('warmed: torch, torchaudio, MMS_FA')
        return 0

    tokens = read_tokens(args.transcript)
    words = [w for _, aligned, _ in tokens for w in aligned]
    print(f'{len(tokens)} display words, {len(words)} aligner words', file=sys.stderr)

    wave = load_audio(args.audio, bundle.sample_rate)
    duration = wave.shape[1] / bundle.sample_rate

    with torch.inference_mode():
        emission, _ = model(wave)
    # Emission frames are a downsampled view of the waveform; this ratio converts a
    # frame index back to a sample index, and thence to seconds.
    ratio = wave.shape[1] / emission.shape[1] / bundle.sample_rate
    spans = aligner(emission[0], tokenizer(words))

    # Re-gather aligner words back into their display words: a hyphenated display
    # word spans from the start of its first piece to the end of its last.
    times, cursor = [], 0
    for _, aligned, _ in tokens:
        group = spans[cursor:cursor + len(aligned)]
        cursor += len(aligned)
        start = group[0][0].start * ratio
        end = group[-1][-1].end * ratio
        times.append((start, end))

    # Chop into phrases at the voice's own pauses, capped so a cue stays legible.
    groups = phrase_cues(tokens)

    lines = [
        '# Hero voiceover cue script — the source of truth for subtitle timing.',
        '#',
        '# One phrase per line:   <start> <end>  <text>        (seconds)',
        '# A word may pin its own start:  word[1.24]',
        '# Unpinned words are spread across the phrase, weighted by length.',
        '# Blank lines and #-comments are ignored. Order does not matter.',
        '#',
        f'# Seeded from {args.audio} ({duration:.2f}s) by `npm run align:vo`.',
        '# Hand-tune freely — `npm run build:cues` is what the browser reads.',
        '',
    ]
    for group in groups:
        start = times[group[0]][0]
        end = times[group[-1]][1]
        words = ' '.join(f'{tokens[i][0]}[{times[i][0]:.2f}]' for i in group)
        lines.append(f'{start:6.2f} {end:6.2f}  {words}')

    with open(args.out, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')

    print(f'{len(groups)} cues over {duration:.2f}s -> {args.out}', file=sys.stderr)
    print('now run: npm run build:cues', file=sys.stderr)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
