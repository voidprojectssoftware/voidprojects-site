<script lang="ts">
	import { formatDate, type PublicOffer } from '../offer.js';

	let {
		offer,
		contactHref = 'mailto:hello@voidprojects.ai',
		heading = 'h1',
		class: className = ''
	}: {
		offer: Pick<PublicOffer, 'prospect' | 'expires'>;
		contactHref?: string;
		heading?: 'h1' | 'h2'; // h1 by default: OfferGate shows this in place of the whole offer
		class?: string;
	} = $props();
</script>

<section class={className} aria-labelledby="offer-expired">
	<svelte:element this={heading} id="offer-expired">This offer has expired</svelte:element>
	<p>
		The offer for {offer.prospect} ran through {formatDate(offer.expires)}. If you would still like
		the site, <a href={contactHref}>get in touch</a> and we will put together a fresh one.
	</p>
</section>

<style>
	section {
		padding: 1.5rem;
		border: 1px solid var(--offer-border, rgb(0 0 0 / 0.12));
		border-radius: var(--offer-radius, 0.75rem);
		background: var(--offer-surface, #fff);
	}
	#offer-expired {
		margin: 0 0 0.5rem;
		font-size: 1.75rem;
		font-weight: 700;
		line-height: 1.2;
	}
	p {
		margin: 0;
		color: var(--offer-muted, #555);
	}
	a {
		font-weight: 600;
		color: var(--offer-accent, currentColor);
	}
</style>
