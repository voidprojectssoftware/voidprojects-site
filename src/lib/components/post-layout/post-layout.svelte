<script lang="ts">
	import type { Snippet } from 'svelte';

	// The mdsvex layout wrapped around every blog post (.md). mdsvex passes each
	// frontmatter field through as a prop and the rendered Markdown as `children`.
	// This owns the article rendering — the title/date header and the `prose`
	// typography; the route page (`blog/[slug]/+page.svelte`) owns the surrounding
	// page chrome (SiteHeader, Section, back link). Referenced by path from
	// svelte.config.js, so it has no index.ts barrel.
	let {
		title,
		author,
		description,
		date,
		children
	}: {
		title?: string;
		author?: string;
		description?: string;
		date?: string;
		children: Snippet;
	} = $props();

	// UTC so a date-only string ('2026-06-18') isn't shifted a day by the local zone.
	const formattedDate = $derived(
		date
			? new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(
					new Date(date)
				)
			: ''
	);
</script>

<article class="mx-auto prose max-w-2xl py-8 prose-invert">
	<header class="not-prose mb-8 flex flex-col gap-2">
		<h1 class="text-4xl font-bold tracking-tight text-foreground">{title}</h1>
		{#if description}
			<p class="text-lg text-foreground/65">{description}</p>
		{/if}
		{#if formattedDate}
			<div class="flex flex-row items-center gap-3">
				{#if author}<span class="text-[16px] text-muted-foreground">{author}</span>{/if}
				<time datetime={date} class="text-sm text-muted-foreground">{formattedDate}</time>
			</div>
		{/if}
	</header>

	{@render children()}
</article>
