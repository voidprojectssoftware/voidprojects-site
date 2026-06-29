// Small, dependency-free astronomy helpers for turning catalog star positions
// (right ascension / declination) into where they sit in an observer's sky at a
// given moment, plus a couple of cosmetic mappings. Accuracy here is "looks
// right to the eye", not "point a telescope by it".

export type GeoLocation = {
	name: string;
	lat: number; // degrees, +N
	lon: number; // degrees, +E
};

const DEG = Math.PI / 180;

/** Julian Date for a JS Date. */
export function julianDate(date: Date): number {
	return date.getTime() / 86400000 + 2440587.5;
}

/** Greenwich Mean Sidereal Time, in degrees [0, 360). */
export function gmstDeg(date: Date): number {
	const jd = julianDate(date);
	const d = jd - 2451545.0;
	const t = d / 36525;
	let g = 280.46061837 + 360.98564736629 * d + 0.000387933 * t * t - (t * t * t) / 38710000;
	g %= 360;
	return g < 0 ? g + 360 : g;
}

/** Local Apparent Sidereal Time in hours [0, 24), for a longitude (+E). */
export function lstHours(date: Date, lonDeg: number): number {
	let lst = (gmstDeg(date) + lonDeg) / 15;
	lst %= 24;
	return lst < 0 ? lst + 24 : lst;
}

/**
 * Star direction in the observer's local horizontal frame, as a unit vector in
 * (north, east, up) coordinates. `up <= 0` means the star is below the horizon.
 * `raHours`/`decDeg` are the star's equatorial coords; `latDeg` the observer's
 * latitude; `lst` the local sidereal time in hours.
 */
export function horizontalVector(
	raHours: number,
	decDeg: number,
	sinLat: number,
	cosLat: number,
	lst: number
): { n: number; e: number; u: number } {
	const ha = (lst - raHours) * 15 * DEG; // hour angle, radians (west positive)
	const dec = decDeg * DEG;
	const sinDec = Math.sin(dec);
	const cosDec = Math.cos(dec);
	const cosHa = Math.cos(ha);
	const cosDcosH = cosDec * cosHa;

	const u = cosLat * cosDcosH + sinLat * sinDec; // = sin(altitude)
	const s = sinLat * cosDcosH - cosLat * sinDec; // south component
	const w = cosDec * Math.sin(ha); // west component
	return { n: -s, e: -w, u };
}

// Colour stops keyed by B-V colour index (blue → white → red).
const CI_STOPS: Array<[number, [number, number, number]]> = [
	[-0.4, [155, 176, 255]],
	[0.0, [202, 215, 255]],
	[0.4, [248, 247, 255]],
	[0.6, [255, 244, 234]],
	[0.8, [255, 229, 207]],
	[1.2, [255, 206, 166]],
	[1.6, [255, 184, 138]],
	[2.0, [255, 162, 120]]
];

/** Approximate star colour from its B-V colour index, as "r,g,b". */
export function ciToRgb(ci: number): string {
	let lo = CI_STOPS[0];
	let hi = CI_STOPS[CI_STOPS.length - 1];
	for (let i = 0; i < CI_STOPS.length - 1; i++) {
		if (ci >= CI_STOPS[i][0] && ci <= CI_STOPS[i + 1][0]) {
			lo = CI_STOPS[i];
			hi = CI_STOPS[i + 1];
			break;
		}
	}
	const span = hi[0] - lo[0] || 1;
	const t = Math.max(0, Math.min(1, (ci - lo[0]) / span));
	const r = Math.round(lo[1][0] + (hi[1][0] - lo[1][0]) * t);
	const g = Math.round(lo[1][1] + (hi[1][1] - lo[1][1]) * t);
	const b = Math.round(lo[1][2] + (hi[1][2] - lo[1][2]) * t);
	return `${r},${g},${b}`;
}
