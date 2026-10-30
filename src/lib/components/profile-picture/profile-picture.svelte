<script lang="ts">
	import type { Picture } from '@sveltejs/enhanced-img';

	let {
		src,
		alt,
		sizes,
		class: className = ''
	}: {
		src: Picture;
		alt: string;
		sizes: string; // rendered width of the circle at each breakpoint, matching `class`
		class?: string;
	} = $props();
</script>

<div class="shrink-0 overflow-hidden rounded-full ring-1 ring-foreground/15 {className}">
	<enhanced:img
		{src}
		{alt}
		{sizes}
		loading="lazy"
		decoding="async"
		class="h-full w-full object-cover"
	/>
</div>
