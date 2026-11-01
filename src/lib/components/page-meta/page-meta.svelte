<script lang="ts">
	import { SITE_NAME, absoluteUrl, type PageMeta } from '$lib/seo/site.js';

	let { meta }: { meta: PageMeta } = $props();

	const url = $derived(absoluteUrl(meta.path));
</script>

<!-- Rendered inside the page's <svelte:head>. -->
<title>{meta.title}</title>
<meta name="description" content={meta.description} />
<link rel="canonical" href={url} />
<meta property="og:type" content="website" />
<meta property="og:site_name" content={SITE_NAME} />
<meta property="og:title" content={meta.title} />
<meta property="og:description" content={meta.description} />
<meta property="og:url" content={url} />
{#if meta.image}
	<meta property="og:image" content={absoluteUrl(meta.image.path)} />
	<meta property="og:image:width" content={String(meta.image.width)} />
	<meta property="og:image:height" content={String(meta.image.height)} />
	<meta property="og:image:alt" content={meta.image.alt} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content={absoluteUrl(meta.image.path)} />
	<meta name="twitter:image:alt" content={meta.image.alt} />
{:else}
	<meta name="twitter:card" content="summary" />
{/if}
<meta name="twitter:title" content={meta.title} />
<meta name="twitter:description" content={meta.description} />
