# Night-sky data (`$lib/sky`)

This folder drives the real night-sky background (`$lib/components/space-background`).
It renders actual catalogue stars as seen from a point on Earth at the current time.

## Files

| File                                    | Role                                                                   | Shipped to browser? |
| --------------------------------------- | ---------------------------------------------------------------------- | ------------------- |
| `star-catalog.json`                     | Trimmed catalogue, human-readable. Source of truth in git.             | No (not imported)   |
| `catalog-format.js`                     | Single source of truth for the binary layout: `encode` / `decode`.     | Yes (tiny)          |
| `astro.ts`                              | Pure astronomy math: sidereal time, equatorial→horizontal, B-V colour. | Yes (small)         |
| `../../../static/star-catalog.bin`      | Quantized binary the app actually `fetch`es at runtime.                | Yes (~52 KB)        |
| `../../../scripts/gen-star-catalog.mjs` | Builds the JSON and `.bin` (imports `catalog-format.js`).              | No                  |

The component **fetches the `.bin` at runtime** (after first paint) instead of importing
the JSON. Importing inlined ~224 KB into the layout JS bundle and blocked rendering;
fetching a 52 KB binary keeps it off the critical path. Do not re-import the JSON.

## Why a binary

The JSON is ~224 KB of text and needs a JSON parse. The binary is ~52 KB and decodes
with a `DataView`. Per star it stores 6 bytes; positions/brightness are quantized to a
precision the eye can't tell apart at this scale.

### Binary format (little-endian)

The layout is **defined once in `catalog-format.js`** (the `FIELDS` table plus
`encode` / `decode`), and both the generator and the runtime decoder import it, so
there are no hand-rolled byte offsets to keep in sync. For reference it is:

```
offset 0   uint32   star count N
then N records of 6 bytes each, brightest first:
  +0  uint16  ra   = round(ra_hours / 24  * 65535)
  +2  int16   dec  = round(dec_deg  / 90  * 32767)
  +4  uint8   mag  = round((mag + 2) * 28)
  +5  uint8   ci   = round((ci + 0.4) / 2.4 * 255)
```

`ra` = right ascension (hours), `dec` = declination (degrees), `mag` = apparent
magnitude (lower = brighter), `ci` = B-V colour index (blue ≈ −0.3, red ≈ 2.0).
To change the layout, edit `FIELDS` in `catalog-format.js` and re-run the generator.

## Regenerating

There is an npm script for the common case:

```bash
npm run gen:stars
```

With **no argument** it re-quantizes `star-catalog.bin` from the committed JSON. Pass
`--mag-limit` to thin it without re-downloading (the JSON stays untouched):

```bash
npm run gen:stars -- --mag-limit 5.5   # smaller, sparser .bin from the existing JSON
```

To **update the catalogue version or trim from the full data**, rebuild from the raw HYG
CSV. The script downloads it for you (to `data/`, which is git-ignored; it is ~34 MB):

```bash
npm run gen:stars -- --download                 # default HYG v41 source
npm run gen:stars -- --url <csv-url>            # a different catalogue URL
npm run gen:stars -- --download --mag-limit 6   # download + custom cutoff
```

`--download` fetches the default URL; `--url <url>` overrides it (and implies a download).
Use `--csv <path>` instead to build from a CSV you already have. Any of these re-trims the
JSON (skipping the Sun and anything fainter than the limit) and rewrites the `.bin`.

The default cutoff is `DEFAULT_MAG_LIMIT` (`6.5`) and the default source is
`DEFAULT_CSV_URL`, both at the top of `scripts/gen-star-catalog.mjs`. Run
`npm run gen:stars -- --help` for all options. Lower the limit for a sparser, smaller sky.

Data source: the [HYG database](https://github.com/astronexus/HYG-Database) (combines
Hipparcos, Yale Bright Star, and Gliese catalogues).

## Tuning the look

Visual knobs (density via `magLimit`, star size/brightness, field of view, look
direction, twinkle, parallax, time scale, vantage points) live in the `CONFIG` object at
the top of `$lib/components/space-background/space-background.svelte`, not here.
