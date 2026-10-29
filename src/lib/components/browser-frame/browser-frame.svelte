<script lang="ts">
	// A screenshot dressed in minimal browser chrome, so a showcase reads as a live
	// site rather than a flat image. Width comes from the consumer via `class`;
	// the image keeps the 16:10 desktop capture ratio.
	let {
		src,
		host,
		alt,
		eager = false,
		class: className = ''
	}: { src: string; host: string; alt: string; eager?: boolean; class?: string } = $props();
</script>

<div
	class="overflow-hidden rounded-xl border border-foreground/10 bg-[oklch(0.21_0.015_285)] shadow-[0_24px_60px_-30px_oklch(0_0_0/0.8)] {className}"
>
	<div class="flex items-center gap-3 border-b border-foreground/8 px-3.5 py-2.5">
		<div class="flex gap-1.5" aria-hidden="true">
			<span class="size-2.5 rounded-full bg-foreground/15"></span>
			<span class="size-2.5 rounded-full bg-foreground/15"></span>
			<span class="size-2.5 rounded-full bg-foreground/15"></span>
		</div>
		<span class="mx-auto truncate rounded-md bg-foreground/6 px-3 py-0.5 text-xs text-foreground/50"
			>{host}</span
		>
		<span class="w-[2.625rem]" aria-hidden="true"></span>
	</div>
	<img
		{src}
		{alt}
		width="1280"
		height="800"
		loading={eager ? 'eager' : 'lazy'}
		decoding="async"
		class="block aspect-[16/10] w-full object-cover object-top"
	/>
</div>
