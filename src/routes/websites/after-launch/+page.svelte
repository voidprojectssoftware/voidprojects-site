<script lang="ts">
	// Temporary review page for the "Live doesn't mean done" treatments. Delete once
	// one is picked.
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import { Section } from '$lib/components/voidprojects/section/index.js';
	import { AfterLaunch } from '$lib/components/after-launch/index.js';

	const VARIANTS = [
		{ id: 'a', name: 'Change log' },
		{ id: 'b', name: 'Statement' },
		{ id: 'c', name: 'Live mockup' }
	] as const;
</script>

<svelte:head>
	<title>After launch: variants</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<SiteHeader wide />
<Section wide class="gap-28 pt-12 pb-28">
	<h1 class="text-3xl font-bold">“Live doesn’t mean done”: pick one</h1>
	{#each VARIANTS as v (v.id)}
		<div class="flex flex-col gap-8">
			<p class="text-sm font-semibold tracking-[0.14em] text-primary uppercase">
				{v.id} · {v.name}
			</p>
			<AfterLaunch variant={v.id} />
		</div>
	{/each}
</Section>
