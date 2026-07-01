<script>
	// `glass` adds the translucent blurred-panel look. Turn it off (e.g. the hero)
	// when you want the page background to show through crisply.
	let { children, ref = $bindable(null), ...rest } = $props();
</script>

<section
	bind:this={ref}
	class="flex flex-col px-6 pt-4 sm:px-page-sm lg:px-page-lg xl:px-page-xl {rest.class ?? ''}"
>
	{@render children()}
</section>
