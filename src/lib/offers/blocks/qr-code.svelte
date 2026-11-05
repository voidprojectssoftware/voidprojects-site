<script lang="ts">
	import type { QrMatrix } from '../page.js';

	let {
		qr,
		url,
		title = 'Sign up on your phone',
		fg = '#000',
		bg = '#fff',
		class: className = ''
	}: {
		qr: QrMatrix;
		url: string;
		title?: string;
		fg?: string; // module colour: keep it dark, on a light `bg`, or phones will not read it
		bg?: string;
		class?: string;
	} = $props();

	const QUIET = 4; // modules of light margin the QR spec asks for around the code
	let side = $derived(qr.size + QUIET * 2);
</script>

<figure class={className}>
	<svg
		viewBox="{-QUIET} {-QUIET} {side} {side}"
		role="img"
		aria-label="QR code for {url}"
		shape-rendering="crispEdges"
	>
		<rect x={-QUIET} y={-QUIET} width={side} height={side} fill={bg} />
		<path d={qr.path} fill={fg} />
	</svg>
	<figcaption>
		<strong>{title}</strong>
		<span>Scan with your camera to open this page and pay from your phone.</span>
	</figcaption>
</figure>

<style>
	/* The code stays dark on light whatever the theme: scanners need the contrast. */
	figure {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 0;
	}
	svg {
		flex: none;
		width: 8.5rem;
		height: 8.5rem;
		border-radius: calc(var(--offer-radius, 0.75rem) / 2);
	}
	figcaption {
		display: grid;
		gap: 0.25rem;
	}
	span {
		font-size: 0.875rem;
		color: var(--offer-muted, #555);
	}
</style>
