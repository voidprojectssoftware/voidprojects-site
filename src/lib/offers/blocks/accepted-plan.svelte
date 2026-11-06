<script lang="ts">
	import type { Snippet } from 'svelte';
	import {
		acceptedPlan,
		formatAmount,
		type Interval,
		type Plan,
		type PublicOffer
	} from '../offer.js';

	let {
		offer,
		title = 'Your plan',
		termsHref = '/terms',
		renewal,
		details,
		class: className = ''
	}: {
		offer: Pick<PublicOffer, 'plans' | 'accepted' | 'currency'>;
		title?: string;
		termsHref?: string;
		renewal?: string; // replaces the default renewal line for the accepted interval
		details?: Snippet<[Plan, Interval]>; // as PlanPicker's: extra content after the summary
		class?: string;
	} = $props();

	const PER: Record<Interval, string> = { month: '/month', year: '/year' };
	const RENEWAL: Record<Interval, string> = {
		month:
			'Your plan renews monthly until you cancel. Cancel any time from billing; the service runs to the end of the month you paid for.',
		year: 'Your plan renews each year until you cancel, and we email you a reminder before each renewal. Cancel any time from billing; the service runs to the end of the paid year.'
	};

	let taken = $derived(acceptedPlan(offer));
</script>

{#if taken}
	<section class={className} aria-labelledby="offer-plan-accepted">
		<h2 id="offer-plan-accepted">{title}</h2>
		<div class="plan">
			<p class="head">
				<span class="label">{taken.plan.label}</span>
				<span class="price"
					>{formatAmount(taken.price.amount, offer.currency)}<small
						>{PER[taken.price.interval]}</small
					></span
				>
			</p>
			{#if taken.plan.summary}<p class="summary">{taken.plan.summary}</p>{/if}
			{#if details}{@render details(taken.plan, taken.price.interval)}{/if}
			{#if taken.plan.features.length}
				<ul>
					{#each taken.plan.features as feature (feature)}<li>{feature}</li>{/each}
				</ul>
			{/if}
		</div>
		<p class="renewal">
			{renewal ?? RENEWAL[taken.price.interval]} Your plan is under our
			<a href={termsHref}>Terms of Service</a>.
		</p>
	</section>
{/if}

<style>
	section {
		display: grid;
		gap: 1rem;
	}
	h2 {
		margin: 0;
	}
	p {
		margin: 0;
	}
	.plan {
		display: grid;
		gap: 0.5rem;
		padding: 1.25rem;
		border: 1px solid var(--offer-border, rgb(0 0 0 / 0.12));
		border-radius: var(--offer-radius, 0.75rem);
		background: var(--offer-surface, #fff);
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.25rem 1rem;
		align-items: baseline;
	}
	.label {
		font-weight: 700;
	}
	.price {
		font-size: 1.25rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	small {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--offer-muted, #555);
	}
	.summary,
	ul,
	.renewal {
		font-size: 0.875rem;
		color: var(--offer-muted, #555);
	}
	ul {
		margin: 0;
		padding-left: 1.1rem;
		list-style: disc;
	}
	.renewal {
		max-width: 42rem;
	}
	.renewal a {
		font-weight: 600;
		color: var(--offer-link, var(--offer-accent, currentColor));
	}
</style>
