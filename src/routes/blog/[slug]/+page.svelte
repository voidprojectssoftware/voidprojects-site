<script lang="ts">
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import { Section } from '$lib/components/voidprojects/section/index.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.meta.title} — Void Projects</title>
	<meta name="description" content={data.meta.description} />
</svelte:head>

<SiteHeader transparent={false} />
<Section class="min-h-[calc(100dvh-4rem)] bg-transparent">
	<!-- Post markup rendered server-side from our own .md files by +page.server.ts. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html data.html}
</Section>
