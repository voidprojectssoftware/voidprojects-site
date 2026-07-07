// Renders the same real star catalogue the site's SpaceBackground uses (the HYG
// stars in static/star-catalog.bin), projected through the same virtual camera,
// into an arbitrary-sized canvas as a single static frame. Sharing the catalogue
// and projection keeps the brand banners' sky consistent with the live site.
// Deterministic: a fixed observation time so every export is identical.

import { base } from '$app/paths';
import { horizontalVector, lstHours, ciToRgb } from '$lib/sky/astro.js';
import { decode } from '$lib/sky/catalog-format.js';

const DEG = Math.PI / 180;

export interface SkyOptions {
	lat?: number; // observer latitude (matches the site's Memphis vantage)
	lon?: number;
	azimuth?: number; // camera compass direction (deg)
	altitude?: number; // camera elevation (deg)
	fov?: number;
	magLimit?: number;
	date?: Date; // fixed instant, so the sky is reproducible across exports
	sizeBase?: number;
	sizePerMag?: number;
	alphaFloor?: number;
	bloom?: number; // halo intensity (0 = none); lower than the site for a calmer banner
}

// Draws once into ctx (already scaled for devicePixelRatio by the caller). Async
// because it fetches the catalogue; resolves after the frame is drawn.
export async function drawRealSky(
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	opts: SkyOptions = {}
): Promise<void> {
	const {
		lat = 35.1495,
		lon = -90.049,
		azimuth = 180,
		altitude = 52,
		fov = 96,
		magLimit = 6.5,
		date = new Date(Date.UTC(2026, 0, 1, 4, 0, 0)),
		sizeBase = 0.35,
		sizePerMag = 0.27,
		alphaFloor = 0.16,
		bloom = 0.1
	} = opts;

	let buffer: ArrayBuffer;
	try {
		const res = await fetch(`${base}/star-catalog.bin`);
		if (!res.ok) return;
		buffer = await res.arrayBuffer();
	} catch {
		return; // offline / missing catalogue — leave the sky empty
	}
	const stars = decode(buffer);

	const sinLat = Math.sin(lat * DEG);
	const cosLat = Math.cos(lat * DEG);
	const lst = lstHours(date, lon);

	// Virtual camera basis in (north, east, up), same as SpaceBackground.
	const a0 = azimuth * DEG;
	const t0 = altitude * DEG;
	const cosT = Math.cos(t0);
	const fN = cosT * Math.cos(a0);
	const fE = cosT * Math.sin(a0);
	const fU = Math.sin(t0);
	const rN = -fE / cosT;
	const rE = fN / cosT;
	const uN = -fU * rE;
	const uE = fU * rN;
	const uU = fN * rE - fE * rN;

	const scale = Math.max(w, h) / 2 / Math.tan((fov / 2) * DEG);
	const cx = w / 2;
	const cy = h / 2;

	for (const s of stars) {
		if (s.mag > magLimit) continue;
		const { n, e, u } = horizontalVector(s.ra, s.dec, sinLat, cosLat, lst);
		if (u <= 0) continue; // below horizon

		const zf = n * fN + e * fE + u * fU;
		if (zf <= 0.05) continue; // behind / too far off-axis

		const sx = cx + ((n * rN + e * rE) / zf) * scale;
		const sy = cy - ((n * uN + e * uE + u * uU) / zf) * scale;
		if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;

		const m = magLimit - s.mag; // 0 (faint) .. ~8 (brightest)
		const size = sizeBase + m * sizePerMag;
		const alpha = Math.min(0.97, alphaFloor + (m / 8) * 0.82);
		const rgb = ciToRgb(s.ci);

		// Gentle bloom on the brightest few only.
		if (bloom > 0 && size > 1.9) {
			const hd = size * 4;
			const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, hd / 2);
			g.addColorStop(0, `rgba(${rgb},${alpha * bloom})`);
			g.addColorStop(1, `rgba(${rgb},0)`);
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(sx, sy, hd / 2, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.fillStyle = `rgba(${rgb},${alpha})`;
		ctx.beginPath();
		ctx.arc(sx, sy, size, 0, Math.PI * 2);
		ctx.fill();
	}
}
