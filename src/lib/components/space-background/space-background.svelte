<!--
	Fixed, full-viewport night sky behind all page content.

	Instead of procedurally faking stars, this renders the real naked-eye sky
	(~9k stars from the HYG catalog) as seen from a chosen spot on Earth, right
	now. Each star's catalogue position (RA/Dec) is converted to where it sits in
	the local sky, then projected through a virtual camera looking out in a fixed
	direction. The sky drifts in real time as the Earth turns, plus a faint mouse
	parallax. Real constellations emerge on their own. Dark-mode only.

	Dev console (when dark): `skyView.list()`, `skyView.setVantage(i)`,
	`skyView.useMyLocation()`.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { lstHours, ciToRgb, type GeoLocation } from '$lib/sky/astro.js';
	import { decode as decodeCatalog } from '$lib/sky/catalog-format.js';

	let { showLabel = true } = $props(); // bottom-left location label / geolocation button

	let canvas: HTMLCanvasElement;

	const DEFAULT_LABEL = 'Our Sky - Memphis, TN';
	let skyLabel = $state(DEFAULT_LABEL);
	let locating = $state(false);
	// assigned in onMount once the sky's setLocation is available
	let requestLocation = $state<() => void>(() => {});

	// Reverse-geocode coords to a "City, REGION" string via BigDataCloud's free,
	// keyless client endpoint. Sends the coordinates to bigdatacloud.net.
	async function nearestPlace(lat: number, lon: number): Promise<string> {
		const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
		const res = await fetch(url);
		if (!res.ok) throw new Error('geocode failed');
		const d = await res.json();
		const city = d.city || d.locality || d.principalSubdivision || 'Your location';
		const region = (d.principalSubdivisionCode || '').split('-')[1] || d.countryCode || '';
		return region ? `${city}, ${region}` : city;
	}

	// All the knobs in one place.
	const CONFIG = {
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

	type Star = {
		ra: number; // hours
		sinDec: number;
		cosDec: number;
		alpha: number;
		twPhase: number;
		twSpeed: number;
		bucket: number; // index into the pre-rendered colour-sprite palette
		coreD: number; // core sprite draw diameter (px)
		haloD: number; // bloom sprite draw diameter (px)
		bloom: boolean; // bright enough to warrant the halo pass
		bx: number; // cached projected screen x, before parallax (refreshed off the hot path)
		by: number;
	};

	const DEG = Math.PI / 180;

	onMount(() => {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);

		let w = 0;
		let h = 0;
		let raf = 0;
		let running = false;

		// Projection cache state: the on-screen star subset and when it was last
		// reprojected. Marked dirty on resize / vantage change to reproject at once.
		let visible: Star[] = [];
		let lastProjectAt = 0;
		let projectDirty = true;

		// active observer location + cached trig
		let location = CONFIG.vantages[CONFIG.defaultVantage];
		let sinLat = Math.sin(location.lat * DEG);
		let cosLat = Math.cos(location.lat * DEG);
		const setLocation = (loc: GeoLocation) => {
			location = loc;
			sinLat = Math.sin(loc.lat * DEG);
			cosLat = Math.cos(loc.lat * DEG);
			projectDirty = true; // observer moved — reproject every star next frame
		};

		// real (or sped-up) clock
		const epoch = Date.now();
		let startPerf = 0;

		// pointer parallax, eased toward target
		let px = 0;
		let py = 0;
		let targetX = 0;
		let targetY = 0;

		const isDark = () => document.documentElement.classList.contains('dark');

		// Filled asynchronously from the binary catalogue so it never blocks paint.
		let stars: Star[] = [];

		// --- Render scaffolding: sprite atlas, sine LUT, projection cadence --------
		// Stars are blitted from a small pre-rendered sprite instead of building an
		// arc path (and parsing a fillStyle string) per star each frame — far cheaper,
		// and the soft glow is baked in. One sprite per quantized colour bucket;
		// brightness and twinkle ride on globalAlpha so the sprite itself never changes.
		const SPRITE_PX = 64; // native sprite resolution; downscaled per star
		const PALETTE_N = 24; // colour buckets across the B-V range
		const CORE_K = 2.5; // core sprite draw diameter = star size × this
		const HALO_K = 4.8; // halo (bloom) sprite draw diameter = star size × this
		const BLOOM_MIN = 1.7; // star size above which the halo pass runs (matches the old cutoff)
		const PROJECT_MS = 100; // reproject the (slowly drifting) sky at most this often

		const makeSprite = (rgb: string, halo: boolean): HTMLCanvasElement => {
			const c = document.createElement('canvas');
			c.width = c.height = SPRITE_PX;
			const g = c.getContext('2d')!;
			const r = SPRITE_PX / 2;
			const grad = g.createRadialGradient(r, r, 0, r, r, r);
			if (halo) {
				// Soft glow: bright centre easing to nothing at the edge.
				grad.addColorStop(0, `rgba(${rgb},0.9)`);
				grad.addColorStop(0.5, `rgba(${rgb},0.5)`);
				grad.addColorStop(1, `rgba(${rgb},0)`);
			} else {
				// Crisp dot: solid core with a thin anti-aliased edge.
				grad.addColorStop(0, `rgba(${rgb},1)`);
				grad.addColorStop(0.8, `rgba(${rgb},1)`);
				grad.addColorStop(1, `rgba(${rgb},0)`);
			}
			g.fillStyle = grad;
			g.fillRect(0, 0, SPRITE_PX, SPRITE_PX);
			return c;
		};

		const coreSprites: HTMLCanvasElement[] = [];
		const haloSprites: HTMLCanvasElement[] = [];
		for (let k = 0; k < PALETTE_N; k++) {
			const rgb = ciToRgb((k / (PALETTE_N - 1)) * 2.4 - 0.4); // span the B-V range
			coreSprites[k] = makeSprite(rgb, false);
			haloSprites[k] = makeSprite(rgb, true);
		}
		const ciBucket = (ci: number) => {
			const k = Math.round(((ci + 0.4) / 2.4) * (PALETTE_N - 1));
			return k < 0 ? 0 : k > PALETTE_N - 1 ? PALETTE_N - 1 : k;
		};

		// Twinkle reads a sine lookup table instead of calling Math.sin per star per
		// frame. Power-of-two size so the phase wraps with a cheap bitwise mask.
		const TW_N = 1024;
		const TW_MASK = TW_N - 1;
		const TW_SCALE = TW_N / (Math.PI * 2);
		const SIN_LUT = new Float32Array(TW_N);
		for (let i = 0; i < TW_N; i++) SIN_LUT[i] = Math.sin((i / TW_N) * Math.PI * 2);

		// Fetch + decode the binary catalogue (format shared with the generator via
		// catalog-format.js), then turn each star into a ready-to-draw record.
		const loadCatalog = async () => {
			let buffer: ArrayBuffer;
			try {
				const res = await fetch(`${base}/star-catalog.bin`);
				if (!res.ok) return;
				buffer = await res.arrayBuffer();
			} catch {
				return; // offline / fetch failed — sky just stays empty
			}
			const next: Star[] = [];
			for (const c of decodeCatalog(buffer)) {
				if (c.mag > CONFIG.magLimit) continue;
				const dec = c.dec * DEG;
				const m = CONFIG.magLimit - c.mag; // 0 (faint) .. ~8 (brightest)
				const size = CONFIG.sizeBase + m * CONFIG.sizePerMag;
				next.push({
					ra: c.ra,
					sinDec: Math.sin(dec),
					cosDec: Math.cos(dec),
					alpha: Math.min(0.97, CONFIG.alphaFloor + (m / 8) * 0.82),
					twPhase: Math.random() * Math.PI * 2,
					twSpeed: 0.4 + Math.random() * 1.4,
					bucket: ciBucket(c.ci),
					coreD: size * CORE_K,
					haloD: size * HALO_K,
					bloom: size > BLOOM_MIN,
					bx: 0,
					by: 0
				});
			}
			stars = next;
			projectDirty = true; // new star set — project it before the next draw
			sync();
		};

		const resize = () => {
			w = window.innerWidth;
			h = window.innerHeight;
			canvas.width = Math.floor(w * dpr);
			canvas.height = Math.floor(h * dpr);
			canvas.style.width = `${w}px`;
			canvas.style.height = `${h}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			projectDirty = true; // viewport changed — scale/centre moved, reproject
		};

		// Reproject every star to its base (pre-parallax) screen position. This is the
		// heavy trig; the sky drifts far slower than the frame rate, so the draw loop
		// only calls this every PROJECT_MS, then reuses `visible` (the on-screen subset)
		// across the frames in between. Parallax is a uniform offset applied per frame,
		// so it doesn't need a reprojection.
		const project = (now: number) => {
			// local sidereal time for the current (optionally sped-up) instant
			const date = new Date(epoch + (now - startPerf) * CONFIG.timeScale);
			const lst = lstHours(date, location.lon);

			// virtual camera basis in (north, east, up)
			const a0 = CONFIG.lookAzimuth * DEG;
			const t0 = CONFIG.lookAltitude * DEG;
			const cosT = Math.cos(t0);
			const fN = cosT * Math.cos(a0);
			const fE = cosT * Math.sin(a0);
			const fU = Math.sin(t0);
			// right = normalize(Z × f); horizontal, so its up-component is 0
			const rN = -fE / cosT;
			const rE = fN / cosT;
			// up = f × right
			const uN = -fU * rE;
			const uE = fU * rN;
			const uU = fN * rE - fE * rN;

			const scale = Math.max(w, h) / 2 / Math.tan((CONFIG.fov / 2) * DEG);
			const cx = w / 2;
			const cy = h / 2;

			visible.length = 0;
			for (const s of stars) {
				const ha = (lst - s.ra) * 15 * DEG; // hour angle
				const cosDcosH = s.cosDec * Math.cos(ha);
				const u = cosLat * cosDcosH + sinLat * s.sinDec; // sin(altitude)
				if (u <= 0) continue; // below the horizon

				const sN = sinLat * cosDcosH - cosLat * s.sinDec;
				const n = -sN;
				const e = -s.cosDec * Math.sin(ha);

				const zf = n * fN + e * fE + u * fU; // depth along view direction
				if (zf <= 0.05) continue; // behind / too far off-axis

				const xf = n * rN + e * rE;
				const yf = n * uN + e * uE + u * uU;
				const sx = cx + (xf / zf) * scale;
				const sy = cy - (yf / zf) * scale;
				// Cull on the base position; the parallax offset (≤ a few px) stays well
				// inside this 40px margin, so nothing pops at the edges between reprojections.
				if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) continue;

				s.bx = sx;
				s.by = sy;
				visible.push(s);
			}

			lastProjectAt = now;
			projectDirty = false;
		};

		const draw = (now: number) => {
			if (!startPerf) startPerf = now;
			ctx.clearRect(0, 0, w, h);

			px += (targetX - px) * 0.04;
			py += (targetY - py) * 0.04;
			const offX = px * CONFIG.parallax;
			const offY = py * CONFIG.parallax;

			if (projectDirty || now - lastProjectAt >= PROJECT_MS) project(now);

			const twAmt = CONFIG.twinkle;
			const twPhase = now * 0.001;
			for (const s of visible) {
				const tw = reduce
					? 1
					: 1 -
						twAmt +
						twAmt * (0.5 + 0.5 * SIN_LUT[((s.twPhase + twPhase * s.twSpeed) * TW_SCALE) & TW_MASK]);

				const x = s.bx + offX;
				const y = s.by + offY;

				// faint bloom on the brightest few, drawn under the core
				if (s.bloom) {
					ctx.globalAlpha = s.alpha * tw * 0.18;
					const hd = s.haloD;
					ctx.drawImage(haloSprites[s.bucket], x - hd / 2, y - hd / 2, hd, hd);
				}

				ctx.globalAlpha = s.alpha * tw;
				const cd = s.coreD;
				ctx.drawImage(coreSprites[s.bucket], x - cd / 2, y - cd / 2, cd, cd);
			}

			ctx.globalAlpha = 1;
			if (!reduce) raf = requestAnimationFrame(draw);
		};

		const start = () => {
			if (running || !stars.length) return;
			running = true;
			raf = requestAnimationFrame(draw);
		};
		const stop = () => {
			running = false;
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
		};

		// Only animate when visible (dark + tab focused).
		const sync = () => {
			if (isDark() && !document.hidden) start();
			else {
				stop();
				if (isDark()) requestAnimationFrame(draw); // one static frame
			}
		};

		const onPointer = (ev: PointerEvent) => {
			targetX = ev.clientX / w - 0.5;
			targetY = ev.clientY / h - 0.5;
		};

		const useMyLocation = () => {
			if (!navigator.geolocation) return;
			navigator.geolocation.getCurrentPosition(
				(pos) =>
					setLocation({
						name: 'Your location',
						lat: pos.coords.latitude,
						lon: pos.coords.longitude
					}),
				() => {
					/* denied or unavailable — keep the fixed vantage */
				},
				{ enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
			);
		};

		// Bottom-left label flow: prompt for location, swap the sky, then relabel
		// with the nearest city. On denial/failure we keep the "Our Sky" default.
		requestLocation = () => {
			if (!navigator.geolocation || locating) return;
			locating = true;
			navigator.geolocation.getCurrentPosition(
				async (pos) => {
					const { latitude, longitude } = pos.coords;
					setLocation({ name: 'Your location', lat: latitude, lon: longitude });
					try {
						skyLabel = `Your Sky - ${await nearestPlace(latitude, longitude)}`;
					} catch {
						skyLabel = 'Your Sky';
					}
					locating = false;
				},
				() => {
					locating = false; // denied — keep the default vantage + label
				},
				{ enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
			);
		};

		resize();
		if (CONFIG.useGeolocation) useMyLocation();
		loadCatalog(); // async; starts the render loop once stars arrive

		// Console helpers for switching vantage / opting into geolocation.
		const win = window as typeof window & { skyView?: Record<string, unknown> };
		win.skyView = {
			list: () => CONFIG.vantages.map((v, i) => `${i}: ${v.name}`),
			setVantage: (i: number) => CONFIG.vantages[i] && setLocation(CONFIG.vantages[i]),
			useMyLocation
		};

		window.addEventListener('resize', resize);
		window.addEventListener('pointermove', onPointer, { passive: true });
		document.addEventListener('visibilitychange', sync);
		const themeObserver = new MutationObserver(sync);
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});

		return () => {
			stop();
			window.removeEventListener('resize', resize);
			window.removeEventListener('pointermove', onPointer);
			document.removeEventListener('visibilitychange', sync);
			themeObserver.disconnect();
			delete win.skyView;
		};
	});
</script>

<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
	<div class="base absolute inset-0"></div>
	<canvas bind:this={canvas} class="absolute inset-0 hidden h-full w-full dark:block"></canvas>
	<div class="grain absolute inset-0"></div>
</div>

{#if showLabel}
	<button
		type="button"
		onclick={() => requestLocation()}
		disabled={locating}
		title="Use my location"
		class="fixed bottom-4 left-4 z-10 hidden cursor-pointer text-xs tracking-wide text-foreground/25 transition-opacity hover:text-foreground/60 disabled:cursor-progress dark:sm:block"
	>
		{locating ? 'Locating…' : skyLabel}
	</button>
{/if}

<style>
	/* flat deep-space backdrop */
	.base {
		background: var(--background);
	}

	.grain {
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
		opacity: 0.025;
		mix-blend-mode: overlay;
	}
</style>
