<script lang="ts">
	import BrandStarfield from '../starfield/BrandStarfield.svelte';
	import { BRAND, type BrandAssetSpec } from '../manifest.js';

	let { spec }: { spec: BrandAssetSpec } = $props();

	// Size the content off the guaranteed-visible band (the safe zone) when there is
	// one, so nothing important lands in the crop-away margins. Falls back to the
	// full height for banners with no safe zone (LinkedIn).
	const contentH = $derived(spec.safe?.height ?? spec.height);
	const wordSize = $derived(contentH * 0.26);
	const tagSize = $derived(contentH * 0.078);
	const gap = $derived(contentH * 0.04);
	const ctaFont = $derived(contentH * 0.055);
	const iconSize = $derived(ctaFont * 1.3);

	// Wide, short banners (LinkedIn) stack the CTAs off to the right; the tall
	// YouTube banner puts them in a row under the tagline.
	const wide = $derived(spec.width / spec.height >= 3);

	// Cross-promotion: each banner points to the *other* social platform plus
	// GitHub (GitHub on both).
	type Platform = 'github' | 'youtube' | 'linkedin';
	const ctas = $derived<{ platform: Platform; label: string }[]>(
		spec.platform === 'youtube'
			? [
					{ platform: 'linkedin', label: BRAND.linkedin },
					{ platform: 'github', label: BRAND.github }
				]
			: [
					{ platform: 'youtube', label: BRAND.youtube },
					{ platform: 'github', label: BRAND.github }
				]
	);

	const ICONS: Record<Platform, string> = {
		github:
			'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
		youtube:
			'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
		linkedin:
			'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'
	};
</script>

{#snippet ctaPill(platform: Platform, label: string)}
	<div class="cta" style="font-size:{ctaFont}px">
		<svg viewBox="0 0 24 24" fill="currentColor" style="width:{iconSize}px;height:{iconSize}px">
			<path d={ICONS[platform]} />
		</svg>
		<span>{label}</span>
	</div>
{/snippet}

<div
	class="banner"
	data-brand-asset={spec.id}
	style="width:{spec.width}px;height:{spec.height}px;background:{spec.background}"
>
	<BrandStarfield width={spec.width} height={spec.height} class="layer" />
	<div class="grain"></div>

	<div class="content" style="gap:{gap}px">
		<div class="wordmark" style="font-size:{wordSize}px;letter-spacing:{-wordSize * 0.02}px">
			{BRAND.name}
		</div>
		<div class="tagline" style="font-size:{tagSize}px;letter-spacing:{tagSize * 0.02}px">
			{BRAND.tagline}
		</div>
		{#if !wide}
			<div class="cta-row" style="margin-top:{contentH * 0.03}px;gap:{gap}px">
				{#each ctas as c (c.platform)}{@render ctaPill(c.platform, c.label)}{/each}
			</div>
		{/if}
	</div>

	{#if wide}
		<div class="cta-stack" style="right:{spec.width * 0.04}px;gap:{contentH * 0.06}px">
			{#each ctas as c (c.platform)}{@render ctaPill(c.platform, c.label)}{/each}
		</div>
	{/if}
</div>

<style>
	.banner {
		position: relative;
		overflow: hidden;
		font-family: 'Inter Variable', sans-serif;
		color: oklch(0.985 0 0);
		isolation: isolate;
	}

	:global(.banner .layer) {
		position: absolute;
		inset: 0;
	}

	.grain {
		position: absolute;
		inset: 0;
		opacity: 0.03;
		mix-blend-mode: overlay;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
	}

	.content {
		position: absolute;
		inset: 0;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.wordmark {
		font-weight: 700;
		line-height: 1;
	}

	.tagline {
		font-weight: 400;
		line-height: 1.2;
		color: oklch(0.985 0 0 / 0.72);
	}

	.cta-row {
		display: flex;
		flex-direction: row;
	}
	.cta-stack {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		z-index: 2;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	/* Social call-to-action pill. */
	.cta {
		display: inline-flex;
		align-items: center;
		gap: 0.5em;
		padding: 0.5em 0.9em;
		border: 1px solid color-mix(in oklch, var(--color-primary) 55%, transparent);
		border-radius: 999px;
		background: color-mix(in oklch, var(--color-primary) 12%, transparent);
		font-weight: 600;
		line-height: 1;
		white-space: nowrap;
	}
	.cta svg {
		color: oklch(0.8 0.14 300);
		flex: none;
	}
</style>
