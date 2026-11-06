<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Concern } from '../offer.js';

	let {
		concerns,
		title = 'What we noticed on your current site',
		extra,
		class: className = ''
	}: {
		concerns: Concern[];
		title?: string;
		extra?: Snippet<[Concern]>; // more content in a concern's item, after its text, e.g. evidence
		class?: string;
	} = $props();
</script>

<section class={className} aria-labelledby="offer-concerns">
	<h2 id="offer-concerns">{title}</h2>
	<ol>
		{#each concerns as concern (concern.title)}
			<li>
				<h3>{concern.title}</h3>
				<p>
					{concern.detail}
					{#if concern.impact}
						<strong class="impact">{concern.impact}</strong>{/if}
				</p>
				{#if extra}{@render extra(concern)}{/if}
			</li>
		{/each}
	</ol>
</section>

<style>
	ol {
		display: grid;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
		counter-reset: concern;
	}
	li {
		position: relative;
		padding: 1rem 1.25rem 1rem 3.25rem;
		border: 1px solid var(--offer-border, rgb(0 0 0 / 0.12));
		border-radius: var(--offer-radius, 0.75rem);
		background: var(--offer-surface, #fff);
		counter-increment: concern;
	}
	li::before {
		content: counter(concern);
		position: absolute;
		top: 1rem;
		left: 1.25rem;
		font-weight: 700;
		color: var(--offer-accent, currentColor);
	}
	h3 {
		margin: 0 0 0.25rem;
		font-size: 1rem;
	}
	p {
		margin: 0;
		color: var(--offer-muted, #555);
	}
	.impact {
		font-weight: 600;
		color: var(--offer-callout, inherit);
	}
</style>
