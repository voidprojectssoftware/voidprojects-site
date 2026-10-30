<!--
	The "?" beside the sky label and the dialog it opens. Every number shown comes in
	through props from space-background.svelte (its CONFIG and the loaded catalogue),
	so the copy cannot drift from what is actually drawn.
-->
<script lang="ts">
	import * as Dialog from '$lib/components/shadcn/ui/dialog/index.js';

	type Props = {
		starCount: number; // stars loaded from the catalogue after the magnitude cut; 0 until loaded
		catalogBytes: number; // size of the fetched star-catalog.bin
		magLimit: number;
		defaultPlace: string;
		lookAzimuth: number;
		lookAltitude: number;
		fov: number;
		reprojectMs: number;
	};

	let {
		starCount,
		catalogBytes,
		magLimit,
		defaultPlace,
		lookAzimuth,
		lookAltitude,
		fov,
		reprojectMs
	}: Props = $props();

	const fmt = (n: number) => n.toLocaleString('en-US');
	const compass = $derived(
		['north', 'east', 'south', 'west'][Math.round((((lookAzimuth % 360) + 360) % 360) / 90) % 4]
	);
	const starsText = $derived(starCount > 0 ? `${fmt(starCount)} stars` : 'the stars');
	const kb = $derived(catalogBytes > 0 ? `${Math.round(catalogBytes / 1024)} KB` : '');

	// Fixed dot layouts for the catalogue diagram (x, y, r).
	const cloud: [number, number, number][] = [
		[30, 22, 1],
		[42, 16, 0.8],
		[55, 20, 1.2],
		[66, 28, 0.8],
		[24, 34, 0.8],
		[36, 30, 1.6],
		[48, 34, 0.8],
		[60, 38, 1],
		[72, 40, 0.7],
		[28, 46, 1],
		[40, 44, 0.7],
		[52, 48, 2],
		[64, 50, 0.8],
		[33, 56, 0.8],
		[45, 58, 1.1],
		[58, 60, 0.7],
		[70, 56, 1],
		[38, 66, 0.7],
		[50, 68, 0.9],
		[62, 66, 0.7],
		[26, 60, 0.6],
		[74, 30, 0.6],
		[44, 24, 0.6],
		[56, 42, 0.6]
	];
	const kept: [number, number, number][] = [
		[252, 26, 1.6],
		[270, 20, 1.1],
		[286, 30, 2.2],
		[258, 44, 1.2],
		[276, 42, 1.6],
		[292, 50, 1.1],
		[262, 60, 2],
		[280, 62, 1.2]
	];
</script>

<Dialog.Root>
	<Dialog.Trigger
		aria-label="What is this night sky?"
		title="What is this night sky?"
		class="cursor-pointer rounded-full px-1 text-xs tracking-wide text-foreground/25 transition-opacity hover:text-foreground/60 focus-visible:text-foreground/60 focus-visible:outline-1 focus-visible:outline-foreground/40"
	>
		?
	</Dialog.Trigger>
	<Dialog.Content
		class="max-h-[calc(100dvh-2rem)] [scrollbar-width:none] overflow-y-auto sm:max-w-lg [&::-webkit-scrollbar]:hidden"
	>
		<Dialog.Header class="pr-8">
			<Dialog.Title>The sky behind this page</Dialog.Title>
			<Dialog.Description>
				It is the real night sky, right now, as seen from {defaultPlace}, or from where you are if
				you share your location. It turns slowly with the Earth.
			</Dialog.Description>
		</Dialog.Header>

		<section class="grid gap-2">
			<h3 class="font-medium">1. The stars</h3>
			<p class="text-muted-foreground">
				They come from the HYG database (v41), which combines the Hipparcos, Yale Bright Star and
				Gliese catalogues. We keep {starsText} brighter than magnitude {magLimit}, roughly what the
				naked eye can see on a dark night. Each star keeps its position, brightness and colour,
				packed into a tiny file{kb ? ` (${kb})` : ''} your browser downloads after the page loads.
			</p>
			<svg
				viewBox="0 0 320 96"
				class="mx-auto w-full max-w-sm text-muted-foreground"
				role="img"
				aria-label="Diagram: the HYG catalogue is filtered by brightness down to {starsText}."
			>
				{#each cloud as [x, y, r] (`${x},${y}`)}
					<circle cx={x} cy={y} {r} class="fill-foreground" opacity="0.7" />
				{/each}
				<text x="48" y="88" text-anchor="middle" font-size="12" fill="currentColor">HYG v41</text>

				<path
					d="M92 44 h18 m-5 -4 l5 4 l-5 4"
					fill="none"
					stroke="currentColor"
					stroke-width="1.2"
				/>

				<path
					d="M132 18 h56 l-18 30 v16 h-20 v-16 z"
					fill="none"
					class="stroke-primary"
					stroke-width="1.4"
				/>
				<text x="160" y="88" text-anchor="middle" font-size="12" fill="currentColor"
					>mag ≤ {magLimit}</text
				>

				<path
					d="M210 44 h18 m-5 -4 l5 4 l-5 4"
					fill="none"
					stroke="currentColor"
					stroke-width="1.2"
				/>

				{#each kept as [x, y, r] (`${x},${y}`)}
					<circle cx={x} cy={y} {r} class="fill-foreground" />
				{/each}
				<text x="272" y="88" text-anchor="middle" font-size="12" fill="currentColor">
					{starCount > 0 ? `${fmt(starCount)} stars` : 'naked-eye stars'}
				</text>
			</svg>
		</section>

		<section class="grid gap-2">
			<h3 class="font-medium">2. From your place and time</h3>
			<p class="text-muted-foreground">
				Your device's clock and your longitude give the local sidereal time, which says which part
				of the sky is overhead. Your latitude then turns each star's catalogue position into a
				height and compass direction above your horizon. Stars below the horizon are left out. While
				the page is visible the sky is recomputed up to {Math.round(1000 / reprojectMs)} times a second,
				so it drifts in real time (or holds still if your system asks for reduced motion).
			</p>
			<svg
				viewBox="0 0 320 112"
				class="mx-auto w-full max-w-sm text-muted-foreground"
				role="img"
				aria-label="Diagram: your latitude, longitude and the current time place the stars on the dome above your horizon."
			>
				<circle cx="44" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="1.2" />
				<ellipse
					cx="44"
					cy="50"
					rx="12"
					ry="30"
					fill="none"
					stroke="currentColor"
					stroke-width="0.8"
					opacity="0.6"
				/>
				<path
					d="M14 50 h60 M18 35 h52 M18 65 h52"
					stroke="currentColor"
					stroke-width="0.8"
					opacity="0.6"
				/>
				<circle cx="54" cy="38" r="3.5" class="fill-primary" />
				<text x="44" y="100" text-anchor="middle" font-size="12" fill="currentColor">lat / lon</text
				>

				<text x="90" y="54" text-anchor="middle" font-size="14" fill="currentColor">+</text>

				<circle cx="120" cy="50" r="16" fill="none" stroke="currentColor" stroke-width="1.2" />
				<path
					d="M120 50 v-10 M120 50 l7 4"
					class="stroke-primary"
					stroke-width="1.6"
					stroke-linecap="round"
				/>
				<text x="120" y="100" text-anchor="middle" font-size="12" fill="currentColor">now</text>

				<path
					d="M148 50 h18 m-5 -4 l5 4 l-5 4"
					fill="none"
					stroke="currentColor"
					stroke-width="1.2"
				/>

				<path d="M178 80 h136" stroke="currentColor" stroke-width="1.2" />
				<path
					d="M184 80 a62 62 0 0 1 124 0"
					fill="none"
					stroke="currentColor"
					stroke-width="1"
					stroke-dasharray="3 3"
					opacity="0.6"
				/>
				<circle cx="220" cy="46" r="1.8" class="fill-foreground" />
				<circle cx="246" cy="30" r="2.4" class="fill-foreground" />
				<circle cx="270" cy="40" r="1.4" class="fill-foreground" />
				<circle cx="290" cy="62" r="2" class="fill-foreground" />
				<circle cx="204" cy="66" r="1.3" class="fill-foreground" />
				<circle cx="258" cy="58" r="1.2" class="fill-foreground" />
				<circle cx="214" cy="90" r="1.3" class="fill-foreground" opacity="0.25" />
				<circle cx="276" cy="94" r="1.6" class="fill-foreground" opacity="0.25" />
				<circle cx="246" cy="80" r="3" class="fill-primary" />
				<text x="246" y="108" text-anchor="middle" font-size="12" fill="currentColor"
					>above your horizon</text
				>
			</svg>
		</section>

		<section class="grid gap-2">
			<h3 class="font-medium">3. Onto your screen</h3>
			<p class="text-muted-foreground">
				The page is a window from a virtual camera facing due {compass}, tilted {lookAltitude}°
				above the horizon, with a {fov}° field of view. Each star is projected through it like a
				pinhole camera. The slight shift when you move the pointer is just for depth.
			</p>
			<svg
				viewBox="0 0 320 112"
				class="mx-auto w-full max-w-sm text-muted-foreground"
				role="img"
				aria-label="Diagram: a camera facing {compass}, tilted {lookAltitude} degrees up with a {fov} degree view, maps the sky onto your screen."
			>
				<path d="M70 92 L139.8 87.1 A70 70 0 0 0 57.8 23.1 Z" class="fill-primary" opacity="0.12" />
				<path d="M70 92 L139.8 87.1 M70 92 L57.8 23.1" class="stroke-primary" stroke-width="1" />
				<path d="M70 92 L119.3 29" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" />
				<path
					d="M94 92 A24 24 0 0 0 84.8 73.1"
					fill="none"
					stroke="currentColor"
					stroke-width="1"
				/>
				<text x="100" y="82" font-size="11" fill="currentColor">{lookAltitude}°</text>
				<text x="122" y="24" font-size="11" fill="currentColor">{fov}° view</text>
				<path d="M14 92 h150" stroke="currentColor" stroke-width="1.2" />
				<circle cx="70" cy="92" r="3" class="fill-primary" />
				<text x="16" y="106" font-size="11" fill="currentColor">N</text>
				<text x="156" y="106" font-size="11" fill="currentColor">S</text>

				<path
					d="M176 60 h18 m-5 -4 l5 4 l-5 4"
					fill="none"
					stroke="currentColor"
					stroke-width="1.2"
				/>

				<rect
					x="204"
					y="26"
					width="104"
					height="66"
					rx="4"
					fill="none"
					stroke="currentColor"
					stroke-width="1.2"
				/>
				<circle cx="222" cy="44" r="1.6" class="fill-foreground" />
				<circle cx="244" cy="38" r="1.1" class="fill-foreground" />
				<circle cx="262" cy="52" r="2.2" class="fill-foreground" />
				<circle cx="284" cy="42" r="1.3" class="fill-foreground" />
				<circle cx="236" cy="70" r="1.4" class="fill-foreground" />
				<circle cx="290" cy="74" r="1.8" class="fill-foreground" />
				<text x="256" y="106" text-anchor="middle" font-size="11" fill="currentColor"
					>your screen</text
				>
			</svg>
		</section>

		<section class="grid gap-2">
			<h3 class="font-medium">4. Your location</h3>
			<p class="text-muted-foreground">
				Nothing happens until you click the sky label. Your browser then asks for permission. If you
				say yes, it gives the page a low-accuracy position, which is used right here in your browser
				to redraw the sky. The coordinates are also sent to BigDataCloud's reverse-geocoding service
				(api.bigdatacloud.net) to get the city name for the label.
			</p>
			<p class="text-muted-foreground">
				We do not store your location: no cookies, no local storage, and nothing goes to our
				servers. Reload the page and the sky is back over {defaultPlace}. If you say no, nothing
				changes.
			</p>
		</section>
	</Dialog.Content>
</Dialog.Root>
