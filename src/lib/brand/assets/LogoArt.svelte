<script lang="ts">
	// The orbit mark (a scatter of stars derived from real spacecraft trajectories),
	// exported verbatim from the trajectory logo lab. It's self-contained — its own
	// dark field + violet stars — so it just scales to fill the asset.
	import orbitmark from '../orbitmark.svg';
	import { type BrandAssetSpec } from '../manifest.js';

	let { spec }: { spec: BrandAssetSpec } = $props();
</script>

<div
	class="logo"
	data-brand-asset={spec.id}
	style="width:{spec.width}px;height:{spec.height}px;background:{spec.background}"
>
	<img src={orbitmark} alt="Void Projects" />
</div>

<style>
	.logo {
		line-height: 0;
	}
	.logo img {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
