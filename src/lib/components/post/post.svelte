<script lang="ts">
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';
	import type { PostMeta } from '$lib/content/types';
	import { goto } from '$app/navigation';

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

	const goToPost = () => goto(`/blog/${slug}`);
</script>

<GlassCard onclick={goToPost} class="w-full cursor-pointer gap-3 px-6 py-5 {className}">
	<div class="flex flex-col gap-1">
		<h3 class="text-xl leading-tight font-semibold tracking-tight text-foreground">{meta.title}</h3>
		<div class="flex flex-row items-center gap-3">
			<span class="text-[16px] text-muted-foreground">{meta.author}</span>
			<time datetime={meta.date} class="text-xs text-muted-foreground">{formattedDate}</time>
		</div>
	</div>
	<p class="text-sm leading-relaxed text-foreground/65">{meta.description}</p>
</GlassCard>
