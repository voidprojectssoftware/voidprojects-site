import type { GeoLocation } from '$lib/sky/astro.js';

// The night sky's settings and what its catalogue load produced, shared by the background
// that draws it and by the explainer (the "?" dialog and /about/brand), so the copy cannot
// drift from what is drawn and the catalogue is fetched only once.

/** All the sky's knobs in one place. */
export const SKY_CONFIG = {
	// A couple of fixed vantage points (great dark-sky sites). Geolocation can
	// override these at runtime, see `useGeolocation` / the skyView console API.
	vantages: [
		{ name: 'Memphis, TN', lat: 35.1495, lon: -90.049 },
		{ name: 'Mauna Kea, Hawaii', lat: 19.8207, lon: -155.4681 },
		{ name: 'Atacama, Chile', lat: -24.6272, lon: -70.4039 }
	] as GeoLocation[],
	defaultVantage: 0,
	useGeolocation: false, // flip on (or call skyView.useMyLocation()) to prompt

	lookAzimuth: 180, // compass direction the camera faces (deg; 180 = due south)
	lookAltitude: 52, // how high it looks (deg above horizon)
	fov: 96, // field of view (deg)

	magLimit: 6.5, // hide stars fainter than this (data goes to 6.5)
	sizeBase: 0.35, // radius of the faintest stars (px)
	sizePerMag: 0.27, // extra radius per magnitude brighter
	alphaFloor: 0.16, // dimmest stars
	twinkle: 0.28, // 0 = none .. 1 = full blink
	parallax: 4, // max px the field shifts with the pointer
	timeScale: 1 // 1 = real time; raise to speed up the sky's rotation
};

export const PROJECT_MS = 100; // reproject the (slowly drifting) sky at most this often

/** What actually loaded; zeros until the background has fetched the catalogue. */
export const catalogStats = $state({ stars: 0, bytes: 0 });

export type SkyFacts = {
	starCount: number; // stars loaded from the catalogue after the magnitude cut; 0 until loaded
	catalogBytes: number; // size of the fetched star-catalog.bin
	magLimit: number;
	defaultPlace: string;
	lookAzimuth: number;
	lookAltitude: number;
	fov: number;
	reprojectMs: number;
};

/** The explainer's props. Reads {@link catalogStats}, so call it from a reactive context. */
export function skyFacts(): SkyFacts {
	return {
		starCount: catalogStats.stars,
		catalogBytes: catalogStats.bytes,
		magLimit: SKY_CONFIG.magLimit,
		defaultPlace: SKY_CONFIG.vantages[SKY_CONFIG.defaultVantage].name,
		lookAzimuth: SKY_CONFIG.lookAzimuth,
		lookAltitude: SKY_CONFIG.lookAltitude,
		fov: SKY_CONFIG.fov,
		reprojectMs: PROJECT_MS
	};
}
