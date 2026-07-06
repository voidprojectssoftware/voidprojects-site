<script lang="ts">
	import type { ProjectCard as CardActor } from '$lib/physics/index.js';
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';

	// A project card rendered as a frosted glass panel floating in the scene: a
	// translucent, blurred body so the real starfield behind it shows through
	// softly, with the project name and blurb and a small GitHub icon tucked into
	// the bottom-right that links to the repo (or a low-key "Coming soon" in the
	// same spot when the project has no public repo yet).
	//
	// Layout contract for the physics: the outer positioner flex-centres the card at
	// its home and owns no transform of its own, so the actor is free to drive the
	// inner element's transform. The `use:bind` element is the one the actor moves
	// and measures (getBoundingClientRect). The inner element ships `opacity-0` so
	// it stays hidden on first paint (before the action sets opacity) and
	// `pointer-events-none` so a dormant card laid invisibly over the hero can't
	// swallow hovers/clicks meant for the title; the actor turns both on once tossed.
	let {
		actor,
		title,
		desc,
		repo = null,
		class: className = ''
	}: {
		actor: CardActor;
		title: string;
		desc: string;
		/** Public repo URL, or null to show a "Coming soon" note instead of a link. */
		repo?: string | null;
		class?: string;
	} = $props();

	const bind = (el: HTMLElement) => ({ destroy: actor.register(el) });

	// The GitHub octocat mark (same path the hero's "Warp to Github" button uses).
	const GITHUB_PATH =
		'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12';
</script>

<div class="pointer-events-none absolute inset-x-0 flex justify-center {className}">
	<div use:bind class="card pointer-events-none relative opacity-0">
		<!-- Bottom padding leaves room for the corner action. -->
		<GlassCard class="w-72 px-6 pt-5 pb-11">
			<h3 class="text-xl leading-tight font-semibold tracking-tight text-foreground">{title}</h3>
			<p class="text-sm leading-relaxed text-foreground/65">{desc}</p>

			{#if repo}
				<a
					href={repo}
					target="_blank"
					rel="noopener noreferrer"
					draggable="false"
					aria-label="{title} on GitHub"
					title="View on GitHub"
					class="absolute right-4 bottom-3 text-foreground/35 transition-colors duration-300 hover:text-primary"
				>
					<svg class="size-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path d={GITHUB_PATH} />
					</svg>
				</a>
			{:else}
				<span
					class="absolute right-4 bottom-3 text-[0.6875rem] tracking-[0.12em] text-foreground/25 uppercase select-none"
				>
					Coming soon
				</span>
			{/if}
		</GlassCard>
	</div>
</div>

<style>
	/* Glass body: a faint rim of light and a soft drop shadow give it just enough
	   edge to read as a solid pane over the stars, no gradient fill. */
	.panel {
		box-shadow:
			inset 0 1px 0 0 oklch(1 0 0 / 0.08),
			inset 0 0 0 1px oklch(1 0 0 / 0.07),
			0 16px 36px -20px oklch(0 0 0 / 0.65);
		transition:
			transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1),
			box-shadow 0.4s ease;
	}

	/* A gentle lift and a touch of violet on the rim when hovered. */
	.card:hover .panel {
		transform: translateY(-2px);
		box-shadow:
			inset 0 1px 0 0 oklch(1 0 0 / 0.12),
			inset 0 0 0 1px oklch(0.6534 0.1876 301.62 / 0.22),
			0 20px 44px -20px oklch(0 0 0 / 0.7);
	}

	@media (prefers-reduced-motion: reduce) {
		.panel,
		a {
			transition: none;
		}
	}
</style>
