<script lang="ts">
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import { Section } from '$lib/components/voidprojects/section/index.js';
	import { upgradeYoutubeEmbeds } from '$lib/components/youtube-embed/index.js';
	import { PageMeta } from '$lib/components/page-meta/index.js';
	import { page } from '$app/state';

	let { data } = $props();

	const meta = $derived({
		path: `/blog/${page.params.slug}`,
		title: `${data.meta.title} | Void Projects`,
		description: data.meta.description
	});
</script>

<svelte:head>
	<PageMeta {meta} />
</svelte:head>

<SiteHeader transparent={false} />

<main id="main-content" class="flex flex-col">
	<Section class="min-h-[calc(100dvh-4rem)] bg-transparent">
		<!-- Keyed so client navigation between posts upgrades the new post's markup. -->
		{#key data.html}
			<div class="contents" {@attach upgradeYoutubeEmbeds}>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- post HTML is rendered at build time from our own markdown in src/lib/content/blog, never user input -->
				{@html data.html}
			</div>
		{/key}
	</Section>
</main>
