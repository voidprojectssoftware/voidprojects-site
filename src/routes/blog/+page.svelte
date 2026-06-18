<script lang="ts">
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import { Section } from '$lib/components/voidprojects/section/index.js';
	import { Post } from '$lib/components/post/index.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>From The Void — Blog</title>
	<meta name="description" content="Engineering write-ups from the Void Projects collective." />
</svelte:head>

<SiteHeader />
<Section class="min-h-[calc(100dvh-4rem)]">
	<h1 class="pb-6 text-5xl font-bold">From The Void</h1>
	{#if data.posts.length}
		<div class="flex flex-col gap-4">
			{#each data.posts as post (post.slug)}
				<Post slug={post.slug} meta={post.meta} />
			{/each}
		</div>
	{:else}
		<p class="text-foreground/65">No posts yet — check back soon.</p>
	{/if}
</Section>
