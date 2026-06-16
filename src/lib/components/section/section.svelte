<script>
	let { children } = $props();
</script>

<section class="flex flex-1 flex-col items-center justify-center gap-3">
	{@render children()}
</section>
