<script>
	let { children, ref = $bindable(null), ...rest } = $props();
</script>

<section bind:this={ref} class="flex h-[calc(100dvh-4rem)] flex-col {rest.class ?? ''}">
	{@render children()}
</section>
