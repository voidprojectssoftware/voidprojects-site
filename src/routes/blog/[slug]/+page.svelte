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

<SiteHeader />
<Section class="min-h-[calc(100dvh-4rem)]">
	<a
		href="/blog"
		class="inline-flex items-center gap-1.5 pb-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
	>
		<ArrowLeft size={16} /> Back to blog
	</a>
	<Content />
</Section>
