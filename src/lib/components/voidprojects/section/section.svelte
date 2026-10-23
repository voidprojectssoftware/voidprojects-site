<script>
	// `wide` trades the site's deep gutters for a broader content area on large
	// screens; pair it with a `wide` SiteHeader so the two stay aligned.
	let { children, ref = $bindable(null), wide = false, ...rest } = $props();
</script>

<section
	bind:this={ref}
	class="flex flex-col px-6 pt-4 sm:px-page-sm {wide
		? 'lg:px-16 xl:px-28 2xl:px-60'
		: 'lg:px-page-lg xl:px-page-xl 2xl:px-page-2xl'} {rest.class ?? ''}"
>
	{@render children()}
</section>
