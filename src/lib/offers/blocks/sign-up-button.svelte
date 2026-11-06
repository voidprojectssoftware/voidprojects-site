<script lang="ts">
	// Posts only ids; the endpoint prices the selection from server-side offer data.
	import type { Snippet } from 'svelte';
	import type { CheckoutReply } from '../checkout-http.js';
	import type { Selection } from './selection.js';

	let {
		offerId,
		selection,
		endpoint,
		children,
		class: className = ''
	}: {
		offerId: string;
		selection: Selection;
		endpoint: string;
		children?: Snippet; // button label; defaults to "Sign up"
		class?: string;
	} = $props();

	let busy = $state(false);
	let message = $state('');
	let failed = $state(false);

	async function signUp() {
		busy = true;
		message = '';
		failed = false;
		try {
			const res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ offerId, ...selection })
			});
			const reply = (await res.json()) as CheckoutReply;
			if (reply.ok && reply.url) {
				window.location.assign(reply.url);
				return;
			}
			failed = !reply.ok;
			message = reply.message;
		} catch {
			failed = true;
			message =
				'Something went wrong. Please try again, or reply to the message that brought you here.';
		} finally {
			busy = false;
		}
	}
</script>

<div class={className}>
	<button type="button" onclick={signUp} disabled={busy} aria-describedby="offer-signup-status">
		{#if busy}Opening checkout...{:else if children}{@render children()}{:else}Sign up{/if}
	</button>
	<p id="offer-signup-status" class:failed role="status">{message}</p>
</div>

<style>
	button {
		width: 100%;
		padding: 0.9rem 1.5rem;
		border: 0;
		border-radius: var(--offer-radius, 0.75rem);
		background: var(--offer-accent, #111);
		color: var(--offer-accent-fg, #fff);
		font: inherit;
		font-size: 1.0625rem;
		font-weight: 700;
		cursor: pointer;
	}
	button:hover:not(:disabled) {
		filter: brightness(1.08);
	}
	button:focus-visible {
		outline: 2px solid var(--offer-accent, #111);
		outline-offset: 3px;
	}
	button:disabled {
		cursor: progress;
		opacity: 0.7;
	}
	p {
		margin: 0.75rem 0 0;
		font-size: 0.9375rem;
		color: var(--offer-muted, #555);
	}
	p:empty {
		display: none;
	}
	.failed {
		color: var(--offer-bad, #b42318);
	}
</style>
