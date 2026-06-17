<!--
	Fixed, full-viewport space backdrop behind all page content.

	Rather than the usual blurry coloured gradient blobs (which read as generic),
	this leans on a canvas particle starfield for depth and life: stars are tiered
	by depth, so near stars are larger/brighter/parallax more and far stars are
	tiny and faint. Each star twinkles and drifts slowly, and the whole field
	parallaxes against the pointer, which is what makes foreground content read as
	floating. A single restrained glow and a faint grain finish it. Starfield is
	dark-mode only; light mode keeps a clean background.
-->
<script lang="ts">
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;

	// All the knobs in one place — tweak these to taste.
	const CONFIG = {
		density: 2400, // lower divisor = more stars (per px² of viewport)
		depthSkew: 2.6, // higher = far more tiny/distant stars, fewer near ones
		baseSize: 0.5, // radius of the most distant stars (px)
		sizeGrowth: 1.3, // extra radius for the nearest stars
		minAlpha: 0.16, // brightness floor (distant stars)
		alphaGrowth: 0.5, // extra brightness for the nearest stars
		parallax: 4, // max px the field shifts with the pointer (at depth 1)
		twinkle: 0.32, // twinkle depth, 0 = none .. 1 = full blink
		clusterCount: 5, // number of star clumps
		clusterFraction: 0.42, // share of stars that belong to clumps (rest are scattered)
		clusterSpread: 90, // px spread of a clump
		galaxyCount: 3 // faint nebula/galaxy hazes (a subset of clusters get one)
	};

	type Star = {
		x: number;
		y: number;
		depth: number; // 0 far .. 1 near
		r: number;
		alpha: number;
		twPhase: number;
		twSpeed: number;
		color: string;
	};

	type Galaxy = {
		x: number;
		y: number;
		r: number;
		squash: number; // <1 = elongated
		rot: number;
		color: string; // "r,g,b"
		alpha: number;
	};

	// Mostly white, with the occasional cool/warm/violet pinprick for variety.
	const PALETTE = ['#ffffff', '#ffffff', '#ffffff', '#cfd8ff', '#e7d8ff', '#fff4d6'];
	// Subtle, desaturated haze tints for the galaxy patches.
	const GALAXY_TINTS = ['126,96,196', '78,116,184', '150,96,168'];

	onMount(() => {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);

		let w = 0;
		let h = 0;
		let stars: Star[] = [];
		let galaxies: Galaxy[] = [];
		let raf = 0;
		let running = false;

		// rough normal distribution in ~[-1.5, 1.5], for clumping stars around a center
		const gauss = () => Math.random() + Math.random() + Math.random() - 1.5;

		// pointer parallax, eased toward the target each frame
		let px = 0;
		let py = 0;
		let targetX = 0;
		let targetY = 0;

		const isDark = () => document.documentElement.classList.contains('dark');

		const makeStar = (x: number, y: number): Star => {
			// depthSkew pushes most stars toward "far" (small + faint), so the field
			// reads as deep distance rather than a swarm of near specks.
			const depth = Math.pow(Math.random(), CONFIG.depthSkew);
			return {
				x,
				y,
				depth,
				r: CONFIG.baseSize + depth * depth * CONFIG.sizeGrowth,
				alpha: CONFIG.minAlpha + depth * CONFIG.alphaGrowth,
				twPhase: Math.random() * Math.PI * 2,
				twSpeed: 0.4 + Math.random() * 1.4,
				color: PALETTE[(Math.random() * PALETTE.length) | 0]
			};
		};

		const buildStars = () => {
			const count = Math.round((w * h) / CONFIG.density);

			// cluster/galaxy centers
			const centers = Array.from({ length: CONFIG.clusterCount }, () => ({
				x: Math.random() * w,
				y: Math.random() * h
			}));

			galaxies = centers.slice(0, CONFIG.galaxyCount).map((c, i) => ({
				x: c.x,
				y: c.y,
				r: 140 + Math.random() * 160,
				squash: 0.45 + Math.random() * 0.35,
				rot: Math.random() * Math.PI,
				color: GALAXY_TINTS[i % GALAXY_TINTS.length],
				alpha: 0.05 + Math.random() * 0.03
			}));

			const clustered = Math.round(count * CONFIG.clusterFraction);
			stars = [];

			// clumped stars: gaussian scatter around a random center
			for (let i = 0; i < clustered; i++) {
				const c = centers[(Math.random() * centers.length) | 0];
				const x = c.x + gauss() * CONFIG.clusterSpread;
				const y = c.y + gauss() * CONFIG.clusterSpread;
				stars.push(makeStar(x, y));
			}

			// scattered field stars filling the rest of the sky
			for (let i = clustered; i < count; i++) {
				stars.push(makeStar(Math.random() * w, Math.random() * h));
			}
		};

		const resize = () => {
			w = window.innerWidth;
			h = window.innerHeight;
			canvas.width = Math.floor(w * dpr);
			canvas.height = Math.floor(h * dpr);
			canvas.style.width = `${w}px`;
			canvas.style.height = `${h}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			buildStars();
		};

		const draw = (now: number) => {
			ctx.clearRect(0, 0, w, h);
			px += (targetX - px) * 0.04;
			py += (targetY - py) * 0.04;

			// faint galaxy/nebula hazes, drawn behind the stars (they barely parallax)
			for (const g of galaxies) {
				const gx = g.x + px * 3;
				const gy = g.y + py * 3;
				const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, g.r);
				grad.addColorStop(0, `rgba(${g.color},${g.alpha})`);
				grad.addColorStop(1, `rgba(${g.color},0)`);
				ctx.globalAlpha = 1;
				ctx.fillStyle = grad;
				ctx.save();
				ctx.translate(gx, gy);
				ctx.rotate(g.rot);
				ctx.scale(1, g.squash);
				ctx.beginPath();
				ctx.arc(0, 0, g.r, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			}

			const twAmt = CONFIG.twinkle;
			for (const s of stars) {
				const shift = s.depth * CONFIG.parallax; // deeper stars parallax more
				const sx = s.x + px * shift;
				const sy = s.y + py * shift;

				const tw = reduce
					? 1
					: 1 - twAmt + twAmt * (0.5 + 0.5 * Math.sin(now * 0.001 * s.twSpeed + s.twPhase));
				const a = s.alpha * tw;

				// faint bloom on only the brightest few near stars
				if (s.depth > 0.85) {
					ctx.globalAlpha = a * 0.2;
					ctx.fillStyle = s.color;
					ctx.beginPath();
					ctx.arc(sx, sy, s.r * 2.4, 0, Math.PI * 2);
					ctx.fill();
				}

				// round dot core
				ctx.globalAlpha = a;
				ctx.fillStyle = s.color;
				ctx.beginPath();
				ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
				ctx.fill();
			}

			ctx.globalAlpha = 1;
			if (!reduce) raf = requestAnimationFrame(draw);
		};

		const start = () => {
			if (running) return;
			running = true;
			raf = requestAnimationFrame(draw);
		};

		const stop = () => {
			running = false;
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
		};

		// Only animate when the starfield is actually visible (dark + tab focused).
		const sync = () => {
			if (isDark() && !document.hidden) start();
			else {
				stop();
				if (isDark()) requestAnimationFrame(draw); // one static frame
			}
		};

		const onPointer = (e: PointerEvent) => {
			targetX = e.clientX / w - 0.5;
			targetY = e.clientY / h - 0.5;
		};

		resize();
		sync();

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
		};
	});
</script>

<div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
	<div class="base absolute inset-0"></div>
	<canvas bind:this={canvas} class="absolute inset-0 hidden h-full w-full dark:block"></canvas>
	<div class="grain absolute inset-0"></div>
</div>

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
