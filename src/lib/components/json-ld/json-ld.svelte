<script lang="ts">
	let { data }: { data: Record<string, unknown> } = $props();

	// `<` is escaped so no string value can close the script element early.
	const json = $derived(JSON.stringify(data).replace(/</g, '\\u003c'));
	const open = '<script type="application/ld+json">';
	const close = '</' + 'script>';
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- serialized JSON with `<` escaped above -->
{@html open + json + close}
