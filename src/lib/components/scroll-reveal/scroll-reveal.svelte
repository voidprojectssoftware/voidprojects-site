<script lang="ts">
	let { progress, threshold, children, ...rest } = $props();
</script>

<div class="pointer-events-none absolute inset-0 flex items-center justify-center {rest.class ?? ''}">
	<div
		class="pointer-events-auto transition-transform duration-700 ease-out w-full flex justify-center"
		style="transform: translateY({progress > threshold ? '0' : '100vh'})"
	>
		{@render children()}
	</div>
</div>
