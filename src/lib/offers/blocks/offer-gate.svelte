<script lang="ts">
	// Static pages outlive their build, so expiry is judged again in the browser:
	// the first render uses the build time (matching the prerendered HTML, so
	// hydration agrees), then the visitor's clock takes over.
	import { onMount, type Snippet } from 'svelte';
	import { isExpired, type PublicOffer } from '../offer.js';
	import ExpiredState from './expired-state.svelte';

	let {
		offer,
		builtAt,
		children,
		expired: expiredView
	}: {
		offer: PublicOffer;
		builtAt: string;
		children: Snippet;
		expired?: Snippet; // replaces the default ExpiredState
	} = $props();

	// svelte-ignore state_referenced_locally
	let expired = $state(isExpired(offer, new Date(builtAt)));
	onMount(() => {
		expired = isExpired(offer, new Date());
	});
</script>

{#if expired}
	{#if expiredView}{@render expiredView()}{:else}<ExpiredState {offer} />{/if}
{:else}
	{@render children()}
{/if}
