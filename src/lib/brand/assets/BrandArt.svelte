<script lang="ts">
	// Renders the right artwork for an asset at its exact pixel size. The root
	// element of each artwork carries data-brand-asset={id}, which is what both the
	// in-page download and the Playwright exporter target.
	import BannerArt from './BannerArt.svelte';
	import LogoArt from './LogoArt.svelte';
	import { type BrandAssetSpec } from '../manifest.js';

	let { spec }: { spec: BrandAssetSpec } = $props();
</script>

{#if spec.kind === 'banner'}
	<BannerArt {spec} />
{:else}
	<LogoArt {spec} />
{/if}
