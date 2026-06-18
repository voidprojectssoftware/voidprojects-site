<script lang="ts">
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';
	import { ArrowRight } from '@lucide/svelte';
	import type { PostMeta } from '$lib/content/types';

	// A blog post summary card for the index list: title, blurb, date, and a
	// "Read more" link through to the full post. The glass-panel look is inherited
	// from GlassCard so it matches the floating project cards on the homepage.
	let {
		slug,
		meta,
		class: className = ''
	}: { slug: string; meta: PostMeta; class?: string } = $props();

	// UTC so a date-only string ('2026-06-18') isn't shifted a day by the local zone.
	const formattedDate = $derived(
		new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(
			new Date(meta.date)
		)
	);
</script>

<GlassCard class="w-full gap-3 px-6 py-5 {className}">
	<div class="flex flex-col gap-1">
		<h3 class="text-xl leading-tight font-semibold tracking-tight text-foreground">{meta.title}</h3>
		<div class="flex flex-row items-center gap-3">
			<span class="text-[16px] text-muted-foreground">{meta.author}</span>
			<time datetime={meta.date} class="text-xs text-muted-foreground">{formattedDate}</time>
		</div>
	</div>
	<p class="text-sm leading-relaxed text-foreground/65">{meta.description}</p>
	<a
		href="/blog/{slug}"
		class="inline-flex items-center gap-1 self-start text-sm font-medium text-primary transition-opacity hover:opacity-80"
	>
		Read more <ArrowRight size={15} />
	</a>
</GlassCard>
