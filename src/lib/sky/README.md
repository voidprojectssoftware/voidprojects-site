# Night-sky data (`$lib/sky`)

This folder drives the real night-sky background (`$lib/components/space-background`).
It renders actual catalogue stars as seen from a point on Earth at the current time.

## Files

| File | Role | Shipped to browser? |
| --- | --- | --- |
| `star-catalog.json` | Trimmed catalogue, human-readable. Source of truth in git. | No (not imported) |
| `astro.ts` | Pure astronomy math: sidereal time, equatorial→horizontal, B-V colour. | Yes (small) |
| `../../../static/star-catalog.bin` | Quantized binary the app actually `fetch`es at runtime. | Yes (~52 KB) |
| `../../../scripts/gen-star-catalog.mjs` | Builds the JSON and `.bin`. | No |

The component **fetches the `.bin` at runtime** (after first paint) instead of importing
the JSON. Importing inlined ~224 KB into the layout JS bundle and blocked rendering;
fetching a 52 KB binary keeps it off the critical path. Do not re-import the JSON.

## Why a binary

The JSON is ~224 KB of text and needs a JSON parse. The binary is ~52 KB and decodes
with a `DataView`. Per star it stores 6 bytes; positions/brightness are quantized to a
precision the eye can't tell apart at this scale.

### Binary format (little-endian)

```
offset 0   uint32   star count N
then N records of 6 bytes each, brightest first:
  +0  uint16  ra   = round(ra_hours / 24  * 65535)
  +2  int16   dec  = round(dec_deg  / 90  * 32767)
  +4  uint8   mag  = round((mag + 2) * 28)
  +5  uint8   ci   = round((ci + 0.4) / 2.4 * 255)
```

Decode (this is what `space-background.svelte` does):

```
ra_hours = ra16 / 65535 * 24
dec_deg  = dec16 / 32767 * 90
mag      = magByte / 28 - 2
ci       = ciByte / 255 * 2.4 - 0.4
```

`ra` = right ascension (hours), `dec` = declination (degrees), `mag` = apparent
magnitude (lower = brighter), `ci` = B-V colour index (blue ≈ −0.3, red ≈ 2.0).

## Regenerating

There is an npm script for the common case:

```bash
npm run gen:stars
```

With **no argument** it re-quantizes `star-catalog.bin` from the committed JSON. Use this
if you only changed the binary format or quantization in the script.

To **change the magnitude cutoff or update the catalogue version**, rebuild from the raw
HYG CSV (it is ~34 MB and is git-ignored under `data/`, so it is downloaded on demand):

```bash
mkdir -p data
curl -L -o data/hyg.csv \
  https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv
node scripts/gen-star-catalog.mjs data/hyg.csv
```

That re-trims the JSON (skipping the Sun and anything fainter than `MAG_LIMIT`) and
rewrites the `.bin`. The magnitude cutoff lives in `MAG_LIMIT` at the top of
`scripts/gen-star-catalog.mjs` (default `6.5`). Lower it for a sparser, smaller sky.

Data source: the [HYG database](https://github.com/astronexus/HYG-Database) (combines
Hipparcos, Yale Bright Star, and Gliese catalogues).

## Tuning the look

Visual knobs (density via `magLimit`, star size/brightness, field of view, look
direction, twinkle, parallax, time scale, vantage points) live in the `CONFIG` object at
the top of `$lib/components/space-background/space-background.svelte`, not here.
