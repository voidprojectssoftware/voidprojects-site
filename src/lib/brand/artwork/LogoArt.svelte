<script lang="ts">
	import VoidMark from '../VoidMark.svelte';
	import { type BrandAssetSpec } from '../manifest.js';

	let { spec }: { spec: BrandAssetSpec } = $props();

	const dim = $derived(Math.min(spec.width, spec.height));
	const markSize = $derived(dim);
</script>

<!-- A flat logo: solid backdrop, flat monochromatic mark, nothing else. -->
<div
	class="logo"
	data-brand-asset={spec.id}
	style="width:{spec.width}px;height:{spec.height}px;background:{spec.background}"
>
	<VoidMark size={markSize} />
</div>

<style>
	.logo {
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>
