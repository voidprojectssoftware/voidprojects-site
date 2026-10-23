<script lang="ts">
	import OrbitMark from '$lib/brand/OrbitMark.svelte';

	// The compact nav that fades in once the hero has scrolled past, showing the
	// site name and secondary links. Hidden (but kept in the layout, `aria-hidden`)
	// while at rest so it doesn't compete with the hero title.
	// `wide` pins the nav near the viewport edge instead of aligning it with the
	// page's content gutters.
	let {
		scrolled = true,
		transparent = true,
		wide = false
	}: { scrolled?: boolean; transparent?: boolean; wide?: boolean } = $props();
</script>

<header
	class="sticky top-0 z-2 h-16 {transparent ? 'bg-transparent' : 'bg-background'} px-6 pt-4 {wide
		? 'sm:px-8 lg:px-10'
		: 'sm:px-page-sm lg:px-page-lg xl:px-page-xl 2xl:px-page-2xl'}"
>
	<div class="flex flex-row items-center justify-between">
		<div
			class="flex flex-row items-center justify-center gap-3 transition-opacity duration-300 sm:gap-6"
			class:opacity-0={!scrolled}
			class:pointer-events-none={!scrolled}
			aria-hidden={!scrolled}
		>
			<!-- leading-none so each item's box is just its glyphs; items-center then
			     lines the mark and both links up on one center line. -->
			<div class="flex items-center gap-2 xl:gap-3">
				<OrbitMark class="size-6 sm:size-7 xl:size-9" />
				<a
					href="/"
					class="text-base leading-none font-bold whitespace-nowrap hover:opacity-60 sm:text-xl xl:text-3xl"
					>Void Projects</a
				>
			</div>
			<a
				href="/blog"
				class="text-base leading-none whitespace-nowrap hover:opacity-60 sm:text-lg xl:text-2xl"
				>Blog</a
			>
		</div>
	</div>
</header>
