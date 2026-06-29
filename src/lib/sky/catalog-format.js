// @ts-check
/**
 * Single source of truth for the quantized star-catalogue binary format.
 *
 * Both the generator (scripts/gen-star-catalog.mjs, which writes the file) and
 * the runtime decoder ($lib/components/space-background, which reads it) import
 * from here, so the layout can only ever be defined in one place. Change a field
 * below and both sides stay in sync.
 *
 * Binary layout (little-endian):
 *   bytes 0..3                 uint32  star count N
 *   then N records, BYTES_PER_STAR each, brightest-first.
 */

/**
 * A catalogue star.
 * @typedef {object} Star
 * @property {number} ra  Right ascension, hours [0, 24).
 * @property {number} dec Declination, degrees [-90, 90].
 * @property {number} mag Apparent magnitude (lower = brighter).
 * @property {number} ci  B-V colour index (blue ~ -0.3 .. red ~ 2.0).
 */

/** @typedef {'uint8' | 'uint16' | 'int16'} FieldType */

/** @type {Record<FieldType, { bytes: number, lo: number, hi: number }>} */
const TYPE = {
	uint8: { bytes: 1, lo: 0, hi: 255 },
	uint16: { bytes: 2, lo: 0, hi: 65535 },
	int16: { bytes: 2, lo: -32768, hi: 32767 }
};

/**
 * Record fields, in byte order. `encode` maps a real value to the field's
 * integer; `decode` maps it back. Keep the two exact inverses of each other.
 * @type {ReadonlyArray<{
 *   key: keyof Star,
 *   type: FieldType,
 *   encode: (value: number) => number,
 *   decode: (raw: number) => number
 * }>}
 */
export const FIELDS = [
	{
		key: 'ra',
		type: 'uint16',
		encode: (v) => Math.round((v / 24) * 65535),
		decode: (i) => (i / 65535) * 24
	},
	{
		key: 'dec',
		type: 'int16',
		encode: (v) => Math.round((v / 90) * 32767),
		decode: (i) => (i / 32767) * 90
	},
	{ key: 'mag', type: 'uint8', encode: (v) => Math.round((v + 2) * 28), decode: (i) => i / 28 - 2 },
	{
		key: 'ci',
		type: 'uint8',
		encode: (v) => Math.round(((v + 0.4) / 2.4) * 255),
		decode: (i) => (i / 255) * 2.4 - 0.4
	}
];

export const HEADER_BYTES = 4;
export const BYTES_PER_STAR = FIELDS.reduce((n, f) => n + TYPE[f.type].bytes, 0);

/**
 * @param {number} v
 * @param {number} lo
 * @param {number} hi
 */
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Pack stars into a quantized binary buffer.
 * @param {ReadonlyArray<Star>} stars
 * @returns {ArrayBuffer}
 */
export function encode(stars) {
	const view = new DataView(new ArrayBuffer(HEADER_BYTES + stars.length * BYTES_PER_STAR));
	view.setUint32(0, stars.length, true);
	let o = HEADER_BYTES;
	for (const s of stars) {
		for (const f of FIELDS) {
			const t = TYPE[f.type];
			const raw = clamp(f.encode(s[f.key]), t.lo, t.hi);
			if (f.type === 'uint8') view.setUint8(o, raw);
			else if (f.type === 'uint16') view.setUint16(o, raw, true);
			else view.setInt16(o, raw, true);
			o += t.bytes;
		}
	}
	return view.buffer;
}

/**
 * Unpack a quantized binary buffer back into stars.
 * @param {ArrayBuffer} buffer
 * @returns {Star[]}
 */
export function decode(buffer) {
	const view = new DataView(buffer);
	const count = view.getUint32(0, true);
	/** @type {Star[]} */
	const stars = new Array(count);
	let o = HEADER_BYTES;
	for (let i = 0; i < count; i++) {
		/** @type {Record<string, number>} */
		const rec = {};
		for (const f of FIELDS) {
			const t = TYPE[f.type];
			const raw =
				f.type === 'uint8'
					? view.getUint8(o)
					: f.type === 'uint16'
						? view.getUint16(o, true)
						: view.getInt16(o, true);
			rec[f.key] = f.decode(raw);
			o += t.bytes;
		}
		stars[i] = /** @type {Star} */ (rec);
	}
	return stars;
}
