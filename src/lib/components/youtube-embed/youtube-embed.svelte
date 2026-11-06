<script lang="ts">
	let {
		id,
		title,
		poster,
		srcset
	}: {
		id: string; // YouTube video id, e.g. the `v=` value of a watch URL
		title: string;
		poster: string; // self-hosted 16:9 image, so nothing is fetched from Google before play
		srcset?: string;
	} = $props();
</script>

<!--
	Blog posts are rendered to static HTML on the server and never hydrate, so this markup
	has no behaviour of its own. Without JS it is a plain link to the video on YouTube;
	`upgradeYoutubeEmbeds` (attached by the post page) turns the link into a play button
	that swaps in the player. The data attributes are its contract with that upgrade.
-->
<div
	class="not-prose relative aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black"
	data-youtube-id={id}
	data-youtube-title={title}
>
	<a
		href="https://www.youtube.com/watch?v={id}"
		aria-label="Play video: {title}"
		class="group absolute inset-0 block cursor-pointer focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-white/80"
	>
		<img
			src={poster}
			{srcset}
			sizes="(min-width: 1280px) 1280px, 100vw"
			width="1280"
			height="720"
			alt=""
			decoding="async"
			class="h-full w-full object-cover"
		/>
		<span
			class="absolute inset-x-0 top-0 bg-linear-to-b from-black/70 to-transparent px-4 pt-3 pb-10 text-left text-base font-medium text-white"
		>
			{title}
		</span>
		<span
			class="absolute top-1/2 left-1/2 flex size-16 -translate-1/2 items-center justify-center rounded-full bg-black/60 ring-1 ring-white/30 backdrop-blur-sm transition group-hover:scale-105 group-hover:bg-black/80 group-focus-visible:scale-105 group-focus-visible:bg-black/80 motion-reduce:transition-none"
			aria-hidden="true"
		>
			<svg viewBox="0 0 24 24" class="ml-1 size-7 fill-white"><path d="M8 5v14l11-7z" /></svg>
		</span>
	</a>
</div>
