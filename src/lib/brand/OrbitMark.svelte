<script lang="ts">
	import { onMount } from 'svelte';

	// This visit's orbit mark (shared with the favicon via VISIT_SEED), drawn
	// client-side after mount: it's random per visit, so prerendering one would
	// mismatch on hydration. The box is sized up front so nothing shifts when the
	// mark arrives: pass `size` in px, or omit it and size the box with `class`.
	let { size, class: className = '' }: { size?: number; class?: string } = $props();

	let svg = $state('');
	onMount(async () => {
		const [{ generateFaviconSvg }, { VISIT_SEED }] = await Promise.all([
			import('./favicon.js'),
			import('./visit-seed.js')
		]);
		svg = generateFaviconSvg(VISIT_SEED);
	});
</script>

<span
	role="img"
	aria-label="Void Projects"
	class="inline-block shrink-0 [&>svg]:size-full {className}"
	style:width={size ? `${size}px` : undefined}
	style:height={size ? `${size}px` : undefined}
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html svg}
</span>
