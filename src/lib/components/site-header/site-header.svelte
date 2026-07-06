<script lang="ts">
	// The compact nav that fades in once the hero has scrolled past, showing the
	// site name and secondary links. Hidden (but kept in the layout, `aria-hidden`)
	// while at rest so it doesn't compete with the hero title.
	let { scrolled = true, transparent = true }: { scrolled?: boolean; transparent?: boolean } =
		$props();
</script>

<header
	class="sticky top-0 z-2 h-16 {transparent
		? 'bg-transparent'
		: 'bg-background'} px-6 pt-4 sm:px-page-sm lg:px-page-lg xl:px-page-xl"
>
	<div class="flex flex-row items-center justify-between">
		<div
			class="flex flex-row items-center justify-center gap-3 transition-opacity duration-300 sm:gap-6"
			class:opacity-0={!scrolled}
			class:pointer-events-none={!scrolled}
			aria-hidden={!scrolled}
		>
			<span class="text-base font-bold whitespace-nowrap sm:text-xl">Void Projects</span>
			<a href="/blog" class="text-base whitespace-nowrap hover:opacity-60 sm:text-lg">Blog</a>
		</div>
	</div>
</header>
