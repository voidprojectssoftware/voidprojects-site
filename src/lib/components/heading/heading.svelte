<script lang="ts">
	let { title, desc } = $props();
</script>

<div class="flex flex-col gap-4 pt-5">
	<h1 class="text-6xl font-bold">{title}</h1>
	<h2 class="text-3xl">{desc}</h2>
</div>
