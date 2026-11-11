<script lang="ts">
	import type { Snippet } from 'svelte';
	import {
		ANNUAL_MONTHS_CHARGED,
		formatAmount,
		priceFor,
		type AddOn,
		type Interval,
		type Plan,
		type Price,
		type PublicOffer
	} from '../offer.js';
	import type { Selection } from './selection.js';

	interface GroupCopy {
		note?: string; // a line under the group's heading, before its choices
		none?: { label: string; summary?: string }; // replaces the plain "None" choice
	}

	let {
		offer,
		selection = $bindable(),
		title = 'Choose your plan',
		renewalNote = true,
		details,
		groups = {},
		class: className = ''
	}: {
		offer: PublicOffer;
		selection: Selection; // bind it and hand the same object to SignUpButton
		title?: string;
		renewalNote?: boolean; // the line under the toggle saying annual plans renew; Checkout states renewal too
		details?: Snippet<[Plan, Interval]>; // extra content in each plan card, after the summary, for the chosen interval
		groups?: Record<string, GroupCopy>; // per add-on group, keyed by its `group` name
		class?: string;
	} = $props();

	const PER: Record<Interval, string> = { month: '/month', year: '/year' };
	const ADVERB: Record<Interval, string> = { month: 'monthly', year: 'annually' };

	let chosen = $derived(offer.plans.find((p) => p.id === selection.planId));
	let total = $derived(
		offer.addOns
			.filter((a) => selection.addOnIds.includes(a.id))
			.reduce(
				(sum, a) => sum + (priceFor(a, selection.interval)?.amount ?? 0) * seatCount(a),
				chosen ? (priceFor(chosen, selection.interval)?.amount ?? 0) : 0
			)
	);

	function seatCount(addOn: AddOn): number {
		return addOn.seats ? (selection.seats[addOn.id] ?? addOn.seats.default) : 1;
	}

	// Sets the chosen add-ons and keeps a seat count for each per-seat one among them only,
	// since checkout refuses a count for an add-on that is not chosen.
	function withAddOns(addOnIds: string[]): Pick<Selection, 'addOnIds' | 'seats'> {
		const seats: Record<string, number> = {};
		for (const addOn of offer.addOns) {
			if (addOn.seats && addOnIds.includes(addOn.id)) seats[addOn.id] = seatCount(addOn);
		}
		return { addOnIds, seats };
	}

	function setSeats(addOn: AddOn, count: number) {
		if (!addOn.seats || !Number.isInteger(count)) return;
		const n = Math.min(addOn.seats.max, Math.max(addOn.seats.min, count));
		selection = { ...selection, seats: { ...selection.seats, [addOn.id]: n } };
	}

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
		selection = { planId, interval, ...withAddOns(addOnIds) };
	}

	function toggleAddOn(id: string, on: boolean) {
		const rest = selection.addOnIds.filter((a) => a !== id);
		selection = { ...selection, ...withAddOns(on ? [...rest, id] : rest) };
	}

	// Add-ons that share a `group` are alternatives: shown together, where the first of
	// them sits, as radios with a "None" choice. Checkout refuses two from one group.
	type Entry = { addOn: AddOn } | { group: string; addOns: AddOn[] };
	let entries = $derived(
		offer.addOns.reduce<Entry[]>((list, addOn) => {
			if (addOn.group === undefined) return [...list, { addOn }];
			const entry = list.find((e) => 'group' in e && e.group === addOn.group);
			if (entry && 'group' in entry) entry.addOns.push(addOn);
			else list.push({ group: addOn.group, addOns: [addOn] });
			return list;
		}, [])
	);

	function chooseInGroup(members: AddOn[], id: string | null) {
		const rest = selection.addOnIds.filter((a) => !members.some((m) => m.id === a));
		selection = { ...selection, ...withAddOns(id ? [...rest, id] : rest) };
	}
</script>

{#snippet addOnRow(addOn: AddOn, radioName?: string, choose?: () => void)}
	{@const price = priceFor(addOn, selection.interval)}
	<label class="addon" class:unavailable={!price}>
		{#if radioName && choose}
			<input
				type="radio"
				name={radioName}
				disabled={!price}
				checked={selection.addOnIds.includes(addOn.id)}
				onchange={choose}
			/>
		{:else}
			<input
				type="checkbox"
				disabled={!price}
				checked={selection.addOnIds.includes(addOn.id)}
				onchange={(e) => toggleAddOn(addOn.id, e.currentTarget.checked)}
			/>
		{/if}
		<span class="label">{addOn.label}</span>
		{#if price}
			<span class="price"
				>+{formatAmount(price.amount, offer.currency)}<small
					>{addOn.seats ? `/${addOn.seats.unit}` : ''}{PER[price.interval]}</small
				></span
			>
		{/if}
		{#if addOn.summary}<span class="summary">{addOn.summary}</span>{/if}
	</label>
	{#if addOn.seats && price && selection.addOnIds.includes(addOn.id)}
		{@const count = seatCount(addOn)}
		{@const { min, max, unit, units } = addOn.seats}
		<div class="seats" role="group" aria-labelledby="offer-seats-{addOn.id}">
			<span class="seats-label" id="offer-seats-{addOn.id}">How many {units}?</span>
			<span class="stepper">
				<button
					type="button"
					aria-label="One fewer {unit}"
					disabled={count <= min}
					onclick={() => setSeats(addOn, count - 1)}>&minus;</button
				>
				<input
					type="number"
					inputmode="numeric"
					{min}
					{max}
					step="1"
					value={count}
					aria-label="Number of {units}, {min} to {max}"
					oninput={(e) => {
						const n = e.currentTarget.valueAsNumber;
						if (Number.isInteger(n) && n >= min && n <= max) setSeats(addOn, n);
					}}
					onchange={(e) => {
						const n = Math.round(e.currentTarget.valueAsNumber);
						setSeats(addOn, Number.isNaN(n) ? count : n);
						e.currentTarget.value = String(seatCount(addOn));
					}}
				/>
				<button
					type="button"
					aria-label="One more {unit}"
					disabled={count >= max}
					onclick={() => setSeats(addOn, count + 1)}>+</button
				>
			</span>
			<span class="seats-total"
				>{count}
				{count === 1 ? unit : units} &times; {formatAmount(price.amount, offer.currency)} =
				<strong>{formatAmount(price.amount * count, offer.currency)}</strong>{PER[
					price.interval
				]}</span
			>
		</div>
	{/if}
{/snippet}

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
			{#each entries as entry, i ('group' in entry ? `group:${entry.group}` : entry.addOn.id)}
				{#if 'group' in entry}
					{@const members = entry.addOns}
					{@const copy = groups[entry.group]}
					<fieldset class="group">
						<legend>{entry.group}</legend>
						{#if copy?.note}<p class="group-note">{copy.note}</p>{/if}
						<label class="addon">
							<input
								type="radio"
								name="offer-addon-group-{i}"
								checked={!members.some((m) => selection.addOnIds.includes(m.id))}
								onchange={() => chooseInGroup(members, null)}
							/>
							<span class="label">{copy?.none?.label ?? 'None'}</span>
							{#if copy?.none?.summary}<span class="summary">{copy.none.summary}</span>{/if}
						</label>
						{#each members as addOn (addOn.id)}
							{@render addOnRow(addOn, `offer-addon-group-${i}`, () =>
								chooseInGroup(members, addOn.id)
							)}
						{/each}
					</fieldset>
				{:else}
					{@render addOnRow(entry.addOn)}
				{/if}
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
	.plan input {
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
	.addons,
	.group {
		display: grid;
		gap: 0.5rem;
	}
	.group {
		margin: 0.5rem 0;
	}
	.group legend {
		margin-bottom: 0.5rem;
		font-weight: 600;
	}
	.group-note {
		margin: 0;
		font-size: 0.875rem;
		color: var(--offer-muted, #555);
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
	.seats {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1rem;
		margin-top: -0.5rem;
		padding: 0.75rem 1.25rem 1rem;
		border: 1px solid var(--offer-accent, #111);
		border-top: 0;
		border-radius: 0 0 var(--offer-radius, 0.75rem) var(--offer-radius, 0.75rem);
		background: var(--offer-surface, #fff);
		box-shadow: 0 0 0 1px var(--offer-accent, #111);
		clip-path: inset(0 -2px -2px -2px);
	}
	.seats-label {
		font-weight: 600;
	}
	.stepper {
		display: inline-flex;
		align-items: stretch;
	}
	.stepper button,
	.stepper input {
		min-width: 2.75rem;
		height: 2.75rem;
		border: 1px solid var(--offer-border, rgb(0 0 0 / 0.2));
		background: var(--offer-surface, #fff);
		color: inherit;
		font: inherit;
		font-weight: 700;
		text-align: center;
	}
	.stepper button {
		font-size: 1.25rem;
		cursor: pointer;
	}
	.stepper button:first-child {
		border-radius: var(--offer-radius, 0.75rem) 0 0 var(--offer-radius, 0.75rem);
	}
	.stepper button:last-child {
		border-radius: 0 var(--offer-radius, 0.75rem) var(--offer-radius, 0.75rem) 0;
	}
	.stepper input {
		width: 3.5rem;
		border-inline: 0;
		font-variant-numeric: tabular-nums;
		-moz-appearance: textfield;
		appearance: textfield;
	}
	.stepper input::-webkit-inner-spin-button,
	.stepper input::-webkit-outer-spin-button {
		margin: 0;
		-webkit-appearance: none;
	}
	.stepper button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.stepper button:focus-visible,
	.stepper input:focus-visible {
		position: relative;
		outline: 2px solid var(--offer-accent, #111);
		outline-offset: 1px;
	}
	.seats-total {
		font-size: 0.9375rem;
		color: var(--offer-muted, #555);
		font-variant-numeric: tabular-nums;
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
