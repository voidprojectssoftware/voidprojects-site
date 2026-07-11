<script lang="ts">
	let {
		src,
		alt,
		class: className = ''
	}: {
		src: string;
		alt: string;
		class?: string;
	} = $props();
</script>

<div class="shrink-0 overflow-hidden rounded-full ring-1 ring-foreground/15 {className}">
	<img {src} {alt} class="h-full w-full object-cover" />
</div>
