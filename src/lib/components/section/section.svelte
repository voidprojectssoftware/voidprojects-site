<script>
	let { children, ref = $bindable(null), ...rest } = $props();
</script>

<section bind:this={ref} class="flex flex-col px-35 backdrop-blur-lg border border-white bg-background/10 shadow-lg pt-4 {rest.class ?? ''}">
	{@render children()}
</section>
