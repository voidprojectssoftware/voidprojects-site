<script lang="ts">
	import type { Snippet } from 'svelte';
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import { Section } from '$lib/components/voidprojects/section/index.js';
	import { PageMeta } from '$lib/components/page-meta/index.js';
	import type { PageMeta as Meta } from '$lib/seo/site.js';

	let {
		meta,
		title,
		updated,
		dateLabel = 'Last updated',
		sections,
		children
	}: {
		meta: Meta;
		title: string;
		updated: string; // ISO date
		dateLabel?: string;
		sections: { id: string; title: string }[]; // the contents list; each id matches an h2 in children
		children: Snippet;
	} = $props();

	const formatted = $derived(
		new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(
			new Date(updated)
		)
	);
</script>

<svelte:head>
	<PageMeta {meta} />
</svelte:head>

<SiteHeader transparent={false} />

<main id="main-content" class="flex flex-col">
	<Section class="pb-16">
		<article class="legal mx-auto prose w-full max-w-[70ch] py-8 prose-invert">
			<header class="not-prose mb-8 flex flex-col gap-2">
				<h1 class="text-4xl font-bold tracking-tight text-foreground">{title}</h1>
				<p class="text-sm text-foreground/70">
					{dateLabel}: <time datetime={updated}>{formatted}</time>
				</p>
			</header>

			<nav aria-labelledby="legal-contents" class="not-prose mb-10">
				<h2 id="legal-contents" class="text-sm font-semibold text-foreground/80">Contents</h2>
				<ol class="mt-2 gap-8 text-sm sm:columns-2 [&>li]:mb-1">
					{#each sections as section (section.id)}
						<li>
							<a
								href="#{section.id}"
								class="text-foreground/75 underline-offset-4 hover:text-primary hover:underline"
								>{section.title}</a
							>
						</li>
					{/each}
				</ol>
			</nav>

			{@render children()}
		</article>
	</Section>
</main>

<style>
	/* Anchored headings land below the sticky 4rem header. */
	.legal :global(h2[id]) {
		scroll-margin-top: 5rem;
	}
	.legal :global(address) {
		font-style: normal;
	}
</style>
