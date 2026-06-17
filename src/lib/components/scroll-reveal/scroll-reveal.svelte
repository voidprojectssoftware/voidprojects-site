<script lang="ts">
	let { progress, threshold, children, ...rest } = $props();
</script>

<div
	class="pointer-events-none absolute inset-0 flex items-center justify-center {rest.class ?? ''}"
>
	<div
		class="pointer-events-auto flex w-full justify-center transition-transform duration-700 ease-out"
		style="transform: translateY({progress > threshold ? '0' : '100vh'})"
	>
		{@render children()}
	</div>
</div>
