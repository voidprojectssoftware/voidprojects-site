<script lang="ts">
	import type { Snippet } from 'svelte';
	import { acceptedPlan, formatAmount, formatDate, type PublicOffer } from '../offer.js';

	let {
		offer,
		portalUrl,
		contactEmail = 'hello@voidprojects.ai',
		planLabel,
		heading = 'h2',
		children,
		actions,
		class: className = ''
	}: {
		offer: Pick<PublicOffer, 'plans' | 'accepted' | 'currency'>;
		portalUrl: string | null; // context.billingPortalUrl; null offers email for billing changes instead
		contactEmail?: string;
		planLabel?: string; // shorter name for the plan than its label, e.g. "Both sites"
		heading?: 'h1' | 'h2';
		children?: Snippet; // after the plan line, e.g. a thank-you
		actions?: Snippet; // beside the billing button, e.g. a questions link
		class?: string;
	} = $props();

	const PER = { month: 'a month', year: 'a year' } as const;
	let taken = $derived(acceptedPlan(offer));
</script>

{#if taken}
	<section class="accepted {className}" aria-labelledby="offer-accepted">
		<svelte:element this={heading} id="offer-accepted">
			<svg viewBox="0 0 20 20" width="22" height="22" aria-hidden="true">
				<circle cx="10" cy="10" r="10" />
				<path d="M5.5 10.5l3 3 6-7" />
			</svg>
			Accepted {formatDate(taken.on)}
		</svelte:element>
		<p class="plan">
			<strong>{planLabel ?? taken.plan.label}</strong>, {formatAmount(
				taken.price.amount,
				offer.currency
			)}
			{PER[taken.price.interval]}<span class="tax">, plus any sales tax</span>
		</p>
		{#if children}{@render children()}{/if}
		<div class="actions">
			{#if portalUrl}
				<a class="manage" href={portalUrl} rel="noreferrer">Manage billing</a>
			{:else}
				<a class="manage" href="mailto:{contactEmail}">Email about billing</a>
			{/if}
			{#if actions}{@render actions()}{/if}
		</div>
		<p class="note">
			{#if portalUrl}
				Update your card or details, see invoices, or cancel. The billing page asks for your billing
				email and sends you a sign-in link.
			{:else}
				To update your card or details, see invoices or cancel, write to
				<a href="mailto:{contactEmail}">{contactEmail}</a>.
			{/if}
		</p>
	</section>
{/if}

<style>
	.accepted {
		display: grid;
		gap: 0.75rem;
		padding: 1.25rem 1.5rem;
		border: 1px solid var(--offer-accent, #111);
		border-radius: var(--offer-radius, 0.75rem);
		background: var(--offer-surface, #fff);
	}
	#offer-accepted {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		font-size: 1.375rem;
		font-weight: 700;
		line-height: 1.2;
	}
	svg {
		flex: none;
	}
	svg circle {
		fill: var(--offer-accent, #111);
	}
	svg path {
		fill: none;
		stroke: var(--offer-accent-fg, #fff);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	p {
		margin: 0;
	}
	.plan {
		font-size: 1.125rem;
	}
	.tax,
	.note {
		color: var(--offer-muted, #555);
	}
	.tax {
		font-size: 0.875rem;
	}
	.note {
		font-size: 0.875rem;
	}
	.note a {
		font-weight: 600;
		color: var(--offer-link, var(--offer-accent, currentColor));
		overflow-wrap: anywhere;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1.5rem;
	}
	.manage {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		padding: 0 1.5rem;
		border-radius: 999px;
		background: var(--offer-accent, #111);
		color: var(--offer-accent-fg, #fff);
		font-weight: 600;
		text-decoration: none;
	}
	.manage:hover {
		filter: brightness(1.08);
		text-decoration: none;
	}
	.manage:focus-visible {
		outline: 2px solid var(--offer-accent, #111);
		outline-offset: 2px;
	}
</style>
