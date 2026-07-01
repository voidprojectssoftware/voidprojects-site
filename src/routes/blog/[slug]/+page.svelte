<script lang="ts">
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import { Section } from '$lib/components/voidprojects/section/index.js';
	import { ArrowLeft } from '@lucide/svelte';

	let { data } = $props();

	// The rendered post component (already wrapped in post-layout.svelte by mdsvex).
	const Content = $derived(data.content);
</script>

<svelte:head>
	<title>{data.meta.title} — Void Projects</title>
	<meta name="description" content={data.meta.description} />
</svelte:head>

<SiteHeader transparent={false} />
<Section class="min-h-[calc(100dvh-4rem)] bg-transparent">
	<Content />
</Section>
