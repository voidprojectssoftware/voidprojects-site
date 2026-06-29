<script>
	// `glass` adds the translucent blurred-panel look. Turn it off (e.g. the hero)
	// when you want the page background to show through crisply.
	let { children, ref = $bindable(null), glass = true, ...rest } = $props();
</script>

<section
	bind:this={ref}
	class="flex flex-col px-6 pt-4 sm:px-12 lg:px-35 {glass
		? 'bg-background/10 shadow-lg backdrop-blur-lg'
		: ''} {rest.class ?? ''}"
>
	{@render children()}
</section>
