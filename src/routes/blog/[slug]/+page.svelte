<script lang="ts">
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import { Section } from '$lib/components/voidprojects/section/index.js';
	import { upgradeYoutubeEmbeds } from '$lib/components/youtube-embed/index.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.meta.title} — Void Projects</title>
	<meta name="description" content={data.meta.description} />
</svelte:head>

<SiteHeader transparent={false} />
<Section class="min-h-[calc(100dvh-4rem)] bg-transparent">
	<!-- Keyed so client navigation between posts upgrades the new post's markup. -->
	{#key data.html}
		<div class="contents" {@attach upgradeYoutubeEmbeds}>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- post HTML is rendered at build time from our own markdown in src/lib/content/blog, never user input -->
			{@html data.html}
		</div>
	{/key}
</Section>
