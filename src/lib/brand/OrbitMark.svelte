<script lang="ts">
	import { onMount } from 'svelte';

	// A freshly rolled orbit mark, drawn client-side after mount: it's random per
	// visit, so prerendering one would mismatch on hydration. The box is sized up
	// front so the page doesn't shift when the mark arrives. Shares the lazily
	// loaded generator chunk with the favicon.
	let { size = 56, class: className = '' }: { size?: number; class?: string } = $props();

	let svg = $state('');
	onMount(async () => {
		const { generateFaviconSvg } = await import('./favicon.js');
		svg = generateFaviconSvg();
	});
</script>

<span
	role="img"
	aria-label="Void Projects"
	class="inline-block [&>svg]:size-full {className}"
	style:width="{size}px"
	style:height="{size}px"
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html svg}
</span>
