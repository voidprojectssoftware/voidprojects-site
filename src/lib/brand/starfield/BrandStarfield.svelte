<script lang="ts">
	// The real generated sky (the site's HYG catalogue, same projection) drawn once
	// into a contained canvas sized to exactly width×height CSS px. The bitmap is
	// rendered at devicePixelRatio so it stays crisp when the banner is exported at
	// 2× (deviceScaleFactor 2) to beat platform upscaling blur.
	import { onMount } from 'svelte';
	import { drawRealSky } from './sky.js';

	let {
		width,
		height,
		class: className = ''
	}: { width: number; height: number; class?: string } = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);

	function render() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		const dpr = Math.min(window.devicePixelRatio || 1, 3);
		canvas.width = Math.round(width * dpr);
		canvas.height = Math.round(height * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, width, height);
		void drawRealSky(ctx, width, height);
	}

	onMount(render);
	$effect(() => {
		void width;
		void height;
		render();
	});
</script>

<canvas bind:this={canvas} class={className} style="width:{width}px;height:{height}px;display:block"
></canvas>
