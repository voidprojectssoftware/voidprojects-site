<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Card } from '$lib/components/shadcn/ui/card';

	// The site's "frosted glass" card look, shared by anything that should read as
	// a pane of glass over whatever's behind it (the floating ProjectCard, the
	// blog Post card): a translucent, blurred body with a faint rim of light and a
	// soft drop shadow, lifting and picking up a touch of brand violet on hover.
	// Layout (width, padding, position) is left to the consumer via `class`.
	let { class: className = '', children }: { class?: string; children?: Snippet } = $props();
</script>

<Card
	class="glass-panel relative gap-2 bg-background/8 shadow-none ring-0 backdrop-blur-[2px] backdrop-brightness-[2.1] backdrop-contrast-[1.3] {className}"
>
	{@render children?.()}
</Card>

<style>
	/* Lensing glass: the backdrop-filter doesn't just blur what's behind it, it
	   amplifies it — brightness + contrast concentrate light into brighter blooms
	   (black stays black, so only bright detail pops) so the card looks like it's
	   gathering the light it sits on. We deliberately don't saturate: that washes
	   the panel in color and clashes with the site's neutral dark.
	   `.glass-panel` ends up on the <div> rendered inside Card (a different
	   component file), so Svelte's scoping hash never lands on it — these
	   selectors are :global() so they match on class name alone instead of
	   silently becoming dead CSS. */
	:global(.glass-panel) {
		box-shadow:
			inset 0 1px 0 0 oklch(1 0 0 / 0.08),
			inset 0 0 0 1px oklch(1 0 0 / 0.07),
			0 16px 36px -20px oklch(0 0 0 / 0.65);
		transition:
			transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1),
			box-shadow 0.4s ease;
	}

	/* A gentle lift and a touch of violet on the rim when hovered. Pointer-events
	   are inherited, so a dormant card (e.g. ProjectCard before it's tossed in,
	   `pointer-events-none` on an ancestor) correctly never triggers this. */
	:global(.glass-panel:hover) {
		transform: translateY(-2px);
		box-shadow:
			inset 0 1px 0 0 oklch(1 0 0 / 0.12),
			inset 0 0 0 1px oklch(from var(--color-primary) l c h / 0.22),
			0 20px 44px -20px oklch(0 0 0 / 0.7);
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.glass-panel) {
			transition: none;
		}
	}
</style>
