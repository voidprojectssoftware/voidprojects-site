// @ts-check
/**
 * Single source of truth for the trajectory points binary (trajectories.bin).
 *
 * The generator (scripts/gen-trajectory-bin.mjs) and the runtime loader
 * (./data.ts) both import from here. Only the per-craft series live in the
 * binary; names, colours, launch dates and the planet rings stay in
 * trajectory-meta.json, in the same craft order.
 *
 * Layout (little-endian). Coordinates are integers in units of 1e-4 AU, which is
 * the precision the source JSON is rounded to, so the round trip is exact.
 *   uint16  craft count
 *   per craft:
 *     uint16  point count N (>= 1)
 *     int32   x0, y0                 first point
 *     N-1 x   int16 dx, int16 dy     delta from the previous point
 *     uint16  year marker count Y
 *     Y x     uint16 year, uint16 i  point index where that calendar year starts
 */

/**
 * @typedef {object} CraftSeries
 * @property {[number, number][]} points heliocentric ecliptic X-Y, AU
 * @property {{ year: number, i: number }[]} years
 */

export const SCALE = 1e4; // integer units per AU

/**
 * @param {number} v
 * @param {number} lo
 * @param {number} hi
 * @param {string} what
 */
function checked(v, lo, hi, what) {
	if (!Number.isInteger(v) || v < lo || v > hi) throw new RangeError(`${what} ${v} out of range`);
	return v;
}

/**
 * Pack the series into the binary layout. Throws if a value does not fit its
 * field, so a refetch with a larger monthly step fails loudly instead of wrapping.
 * @param {ReadonlyArray<CraftSeries>} craft
 * @returns {ArrayBuffer}
 */
export function encode(craft) {
	let size = 2;
	for (const c of craft) size += 2 + 8 + (c.points.length - 1) * 4 + 2 + c.years.length * 4;
	const view = new DataView(new ArrayBuffer(size));
	let o = 0;
	view.setUint16(o, checked(craft.length, 0, 0xffff, 'craft count'), true);
	o += 2;
	for (const c of craft) {
		view.setUint16(o, checked(c.points.length, 1, 0xffff, 'point count'), true);
		o += 2;
		let px = 0;
		let py = 0;
		c.points.forEach(([x, y], i) => {
			const ix = Math.round(x * SCALE);
			const iy = Math.round(y * SCALE);
			if (i === 0) {
				view.setInt32(o, checked(ix, -0x80000000, 0x7fffffff, 'x0'), true);
				view.setInt32(o + 4, checked(iy, -0x80000000, 0x7fffffff, 'y0'), true);
				o += 8;
			} else {
				view.setInt16(o, checked(ix - px, -0x8000, 0x7fff, 'dx'), true);
				view.setInt16(o + 2, checked(iy - py, -0x8000, 0x7fff, 'dy'), true);
				o += 4;
			}
			px = ix;
			py = iy;
		});
		view.setUint16(o, checked(c.years.length, 0, 0xffff, 'year count'), true);
		o += 2;
		for (const { year, i } of c.years) {
			view.setUint16(o, checked(year, 0, 0xffff, 'year'), true);
			view.setUint16(o + 2, checked(i, 0, 0xffff, 'year index'), true);
			o += 4;
		}
	}
	return view.buffer;
}

/**
 * @param {ArrayBuffer} buffer
 * @returns {CraftSeries[]}
 */
export function decode(buffer) {
	const view = new DataView(buffer);
	let o = 0;
	const count = view.getUint16(o, true);
	o += 2;
	/** @type {CraftSeries[]} */
	const craft = [];
	for (let k = 0; k < count; k++) {
		const n = view.getUint16(o, true);
		o += 2;
		let x = view.getInt32(o, true);
		let y = view.getInt32(o + 4, true);
		o += 8;
		/** @type {[number, number][]} */
		const points = [[x / SCALE, y / SCALE]];
		for (let i = 1; i < n; i++) {
			x += view.getInt16(o, true);
			y += view.getInt16(o + 2, true);
			o += 4;
			points.push([x / SCALE, y / SCALE]);
		}
		const yc = view.getUint16(o, true);
		o += 2;
		const years = [];
		for (let i = 0; i < yc; i++) {
			years.push({ year: view.getUint16(o, true), i: view.getUint16(o + 2, true) });
			o += 4;
		}
		craft.push({ points, years });
	}
	if (o !== buffer.byteLength)
		throw new Error(`trajectory binary: ${buffer.byteLength - o} trailing bytes`);
	return craft;
}
