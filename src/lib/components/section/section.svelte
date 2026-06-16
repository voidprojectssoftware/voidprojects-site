<script>
	let { children, ...rest } = $props();
</script>

<section class="flex h-[calc(100dvh-4rem)] flex-col {rest.class ?? ''}">
	{@render children()}
</section>
