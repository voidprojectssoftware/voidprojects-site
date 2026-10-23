<script lang="ts">
	// Temporary review index for the landing-page variants. Replaced by the chosen
	// variant once one is picked.
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import { Section } from '$lib/components/voidprojects/section/index.js';

	const VARIANTS = [
		{
			id: 'a',
			name: 'Glass',
			note: 'Closest to the current site: centered hero, frosted glass cards over the starfield.'
		},
		{
			id: 'b',
			name: 'Ledger',
			note: 'Editorial and left-aligned; pricing shown as an open receipt; desktop + phone screenshots.'
		},
		{
			id: 'c',
			name: 'Story',
			note: 'Warmest: leads with the conversation, features Rally4Hallie as the cause story, then the process.'
		},
		{
			id: 'd',
			name: 'Compact',
			note: 'Two columns: pitch, principles, and form on the left, the work on the right. Shortest page.'
		}
	];

	const SNIPPET = `<a href="https://voidprojects.ai/websites"
   style="display:inline-flex;align-items:center;gap:6px">
  <img src="https://voidprojects.ai/api/mark.svg" width="20" height="20" alt="">
  <span>Made by <strong>Void Projects</strong></span>
</a>`;
</script>

<svelte:head>
	<title>Websites landing: variants</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<SiteHeader />
<Section class="pt-12 pb-24">
	<h1 class="text-4xl font-bold">Landing page variants</h1>
	<p class="pt-3 text-foreground/65">Pick one; the others get deleted.</p>
	<div class="grid gap-4 pt-10 sm:grid-cols-2">
		{#each VARIANTS as v (v.id)}
			<a
				href="/websites/{v.id}"
				class="rounded-2xl border border-foreground/10 bg-background/60 p-6 transition-colors hover:border-primary/50"
			>
				<span class="text-sm font-semibold text-primary uppercase">{v.id}</span>
				<h2 class="pt-1 text-2xl font-semibold">{v.name}</h2>
				<p class="pt-2 text-sm text-foreground/65">{v.note}</p>
			</a>
		{/each}
	</div>

	<h2 class="pt-16 text-2xl font-semibold">Footer badge for client sites</h2>
	<p class="pt-2 text-sm text-foreground/65">
		A plain link with a freshly rolled orbit mark from <code>/api/mark.svg</code>: a new one on
		every visit (refresh to see it change). No script, and the text inherits the client site's
		colors.
	</p>
	<div class="mt-6 grid gap-4 sm:grid-cols-2">
		<!-- Distinct query strings so the browser doesn't reuse one image for both previews. -->
		<div class="rounded-xl bg-[#fff5f7] p-6 text-center text-sm text-[#5b4650]">
			<a href="/websites" class="inline-flex items-center gap-1.5 hover:underline">
				<img src="/api/mark.svg?light" width="20" height="20" alt="" />
				<span>Made by <strong>Void Projects</strong></span>
			</a>
		</div>
		<div class="rounded-xl bg-[#111] p-6 text-center text-sm text-white/60">
			<a href="/websites" class="inline-flex items-center gap-1.5 hover:underline">
				<img src="/api/mark.svg?dark" width="20" height="20" alt="" />
				<span>Made by <strong>Void Projects</strong></span>
			</a>
		</div>
	</div>
	<pre
		class="mt-4 overflow-x-auto rounded-xl bg-foreground/5 p-4 text-xs text-foreground/75">{SNIPPET}</pre>
</Section>
