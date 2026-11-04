<script lang="ts">
	import type { Snippet } from 'svelte';
	import {
		ANNUAL_MONTHS_CHARGED,
		formatAmount,
		priceFor,
		type Interval,
		type Plan,
		type Price,
		type PublicOffer
	} from '../offer.js';
	import type { Selection } from './selection.js';

	let {
		offer,
		selection = $bindable(),
		title = 'Choose your plan',
		renewalNote = true,
		details,
		class: className = ''
	}: {
		offer: PublicOffer;
		selection: Selection; // bind it and hand the same object to SignUpButton
		title?: string;
		renewalNote?: boolean; // the line under the toggle saying annual plans renew; Checkout states renewal too
		details?: Snippet<[Plan, Interval]>; // extra content in each plan card, after the summary, for the chosen interval
		class?: string;
	} = $props();

	const PER: Record<Interval, string> = { month: '/month', year: '/year' };
	const ADVERB: Record<Interval, string> = { month: 'monthly', year: 'annually' };

	let chosen = $derived(offer.plans.find((p) => p.id === selection.planId));
	let total = $derived(
		[chosen, ...offer.addOns.filter((a) => selection.addOnIds.includes(a.id))].reduce(
			(sum, item) => sum + (item ? (priceFor(item, selection.interval)?.amount ?? 0) : 0),
			0
		)
	);

	// The annual saving against twelve monthly payments, when a plan sells both.
	function saving(prices: Price[]): string | undefined {
		const month = prices.find((p) => p.interval === 'month')?.amount;
		const year = prices.find((p) => p.interval === 'year')?.amount;
		if (!month || !year || year >= month * 12) return undefined;
		const saved = `Save ${formatAmount(month * 12 - year, offer.currency)} a year`;
		const free = 12 - ANNUAL_MONTHS_CHARGED;
		return year === month * ANNUAL_MONTHS_CHARGED ? `${saved}, ${free} months free` : saved;
	}

	function setInterval(interval: Interval) {
		const planId =
			chosen && priceFor(chosen, interval)
				? chosen.id
				: (offer.plans.find((p) => priceFor(p, interval))?.id ?? selection.planId);
		const addOnIds = selection.addOnIds.filter((id) => {
			const addOn = offer.addOns.find((a) => a.id === id);
			return addOn && priceFor(addOn, interval);
		});
		selection = { planId, interval, addOnIds };
	}

	function toggleAddOn(id: string, on: boolean) {
		const rest = selection.addOnIds.filter((a) => a !== id);
		selection = { ...selection, addOnIds: on ? [...rest, id] : rest };
	}
</script>

<section class={className} aria-labelledby="offer-plans">
	<h2 id="offer-plans">{title}</h2>

	{#if offer.intervals.length > 1}
		<div class="toggle" role="radiogroup" aria-label="Billing">
			{#each offer.intervals as interval (interval)}
				<button
					type="button"
					role="radio"
					aria-checked={selection.interval === interval}
					onclick={() => setInterval(interval)}
				>
					{interval === 'month' ? 'Monthly' : 'Annual'}
				</button>
			{/each}
		</div>
		{#if renewalNote && selection.interval === 'year'}
			<p class="note">
				Annual plans renew each year and can be cancelled any time; they run to the end of the paid
				year.
			</p>
		{/if}
	{/if}

	<fieldset class="plans">
		<legend class="sr-only">Plan</legend>
		{#each offer.plans as plan (plan.id)}
			{@const price = priceFor(plan, selection.interval)}
			{@const saved = selection.interval === 'year' ? saving(plan.prices) : undefined}
			<label class="plan" class:unavailable={!price}>
				<input
					type="radio"
					name="offer-plan"
					value={plan.id}
					disabled={!price}
					checked={selection.planId === plan.id}
					aria-labelledby="offer-plan-{plan.id}"
					onchange={() => (selection = { ...selection, planId: plan.id })}
				/>
				<!-- The radio is named by its label and price alone; the rest of the card stays readable content. -->
				<span class="head" id="offer-plan-{plan.id}">
					<span class="label">{plan.label}</span>
					{#if price}
						<span class="price"
							>{formatAmount(price.amount, offer.currency)}<small>{PER[price.interval]}</small
							></span
						>
					{:else}
						<span class="price"><small>Not sold {ADVERB[selection.interval]}</small></span>
					{/if}
				</span>
				{#if saved}<span class="saving">{saved}</span>{/if}
				{#if plan.summary}<span class="summary">{plan.summary}</span>{/if}
				{#if details}{@render details(plan, selection.interval)}{/if}
				{#if plan.features.length}
					<ul>
						{#each plan.features as feature (feature)}<li>{feature}</li>{/each}
					</ul>
				{/if}
			</label>
		{/each}
	</fieldset>

	{#if offer.addOns.length}
		<fieldset class="addons">
			<legend>Add-ons</legend>
			{#each offer.addOns as addOn (addOn.id)}
				{@const price = priceFor(addOn, selection.interval)}
				<label class="addon" class:unavailable={!price}>
					<input
						type="checkbox"
						disabled={!price}
						checked={selection.addOnIds.includes(addOn.id)}
						onchange={(e) => toggleAddOn(addOn.id, e.currentTarget.checked)}
					/>
					<span class="label">{addOn.label}</span>
					{#if price}
						<span class="price"
							>+{formatAmount(price.amount, offer.currency)}<small>{PER[price.interval]}</small
							></span
						>
					{/if}
					{#if addOn.summary}<span class="summary">{addOn.summary}</span>{/if}
				</label>
			{/each}
		</fieldset>
	{/if}

	<p class="total" aria-live="polite">
		Total <strong>{formatAmount(total, offer.currency)}</strong>{PER[selection.interval]}, plus any
		sales tax
	</p>
</section>

<style>
	.toggle {
		display: inline-flex;
		padding: 0.25rem;
		border: 1px solid var(--offer-border, rgb(0 0 0 / 0.12));
		border-radius: 999px;
		background: var(--offer-surface, #fff);
	}
	.toggle button {
		padding: 0.5rem 1.25rem;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: inherit;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.toggle button[aria-checked='true'] {
		background: var(--offer-accent, #111);
		color: var(--offer-accent-fg, #fff);
	}
	fieldset {
		margin: 1rem 0 0;
		padding: 0;
		border: 0;
		min-width: 0;
	}
	.plans {
		display: grid;
		gap: 0.75rem;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
	}
	.plan,
	.addon {
		position: relative;
		display: grid;
		gap: 0.5rem;
		padding: 1.25rem;
		border: 1px solid var(--offer-border, rgb(0 0 0 / 0.12));
		border-radius: var(--offer-radius, 0.75rem);
		background: var(--offer-surface, #fff);
		cursor: pointer;
	}
	.plan:has(input:checked),
	.addon:has(input:checked) {
		border-color: var(--offer-accent, #111);
		box-shadow: 0 0 0 1px var(--offer-accent, #111);
	}
	.plan:has(input:focus-visible),
	.addon:has(input:focus-visible) {
		outline: 2px solid var(--offer-accent, #111);
		outline-offset: 2px;
	}
	.unavailable {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.plan input,
	.addon input[type='radio'] {
		position: absolute;
		opacity: 0;
		pointer-events: none;
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
	.saving {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--offer-good, #17803d);
	}
	.summary,
	.note,
	ul {
		font-size: 0.875rem;
		color: var(--offer-muted, #555);
	}
	ul {
		margin: 0;
		padding-left: 1.1rem;
		list-style: disc;
	}
	.note {
		margin: 0.5rem 0 0;
	}
	.addons legend {
		margin-bottom: 0.5rem;
		font-weight: 700;
	}
	.addons {
		display: grid;
		gap: 0.5rem;
	}
	.addon {
		grid-template-columns: auto 1fr auto;
		align-items: center;
		column-gap: 0.75rem;
	}
	.addon input {
		accent-color: var(--offer-accent, #111);
	}
	.addon .summary {
		grid-column: 2 / -1;
	}
	.addon .price {
		font-size: 1rem;
	}
	.total {
		margin: 1rem 0 0;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
