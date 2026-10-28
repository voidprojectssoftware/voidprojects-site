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
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content={meta.title} />
<meta name="twitter:description" content={meta.description} />
