<script lang="ts">
	// The compact nav that fades in once the hero has scrolled past, showing the
	// site name and secondary links. Hidden (but kept in the layout, `aria-hidden`)
	// while at rest so it doesn't compete with the hero title.
	// `wide` matches a `wide` Section's gutters.
	let {
		scrolled = true,
		transparent = true,
		wide = false
	}: { scrolled?: boolean; transparent?: boolean; wide?: boolean } = $props();
</script>

<header
	class="sticky top-0 z-2 h-16 {transparent
		? 'bg-transparent'
		: 'bg-background'} px-6 pt-4 sm:px-page-sm {wide
		? 'lg:px-16 xl:px-28 2xl:px-60'
		: 'lg:px-page-lg xl:px-page-xl 2xl:px-page-2xl'}"
>
	<div class="flex flex-row items-center justify-between">
		<div
			class="flex flex-row items-center justify-center gap-3 transition-opacity duration-300 sm:gap-6"
			class:opacity-0={!scrolled}
			class:pointer-events-none={!scrolled}
			aria-hidden={!scrolled}
		>
			<a
				href="/"
				class="text-base font-bold whitespace-nowrap hover:opacity-60 sm:text-xl xl:text-3xl"
				>Void Projects</a
			>
			<a href="/blog" class="text-base whitespace-nowrap hover:opacity-60 sm:text-lg xl:text-2xl"
				>Blog</a
			>
		</div>
	</div>
</header>
