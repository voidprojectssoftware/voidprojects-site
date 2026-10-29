<script lang="ts">
	import { CONTACT_EMAIL, CONTACT_KINDS, type ContactKind } from '$lib/content/websites.js';

	let {
		class: className = '',
		compact = false,
		initialKind = CONTACT_KINDS[0],
		// eslint-disable-next-line no-useless-assignment -- read by the parent through bind:sent
		sent = $bindable(false) // true while the thank-you shows, so the surrounding card can drop its heading
	}: { class?: string; compact?: boolean; initialKind?: ContactKind; sent?: boolean } = $props();

	let name = $state('');
	let email = $state('');
	// svelte-ignore state_referenced_locally
	let kind = $state(initialKind); // seeded once; the visitor can change it
	let message = $state('');
	let website = $state(''); // honeypot; people never see it
	let status = $state<'idle' | 'sent' | 'error'>('idle');
	let error = $state('');

	// The browser has already enforced the required fields, so the thank-you shows at once
	// while delivery finishes; a failure brings the form back with its values intact.
	async function submit(event: SubmitEvent) {
		event.preventDefault();
		status = 'sent';
		sent = true;
		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email, kind, message, website })
			});
			if (res.ok) return;
			const data = await res.json().catch(() => null);
			error = data?.error ?? 'Something went wrong sending your message.';
		} catch {
			error = 'Your message could not be sent. Check your connection and try again.';
		}
		status = 'error';
		sent = false;
	}

	const field =
		'w-full rounded-lg border border-foreground/12 bg-foreground/4 px-3.5 py-2.5 text-base text-foreground placeholder:text-foreground/35 focus:border-primary focus:ring-1 focus:ring-primary';
	const label = 'text-sm font-medium text-foreground/80';
</script>

{#if status === 'sent'}
	<div class="flex flex-col items-center gap-3 py-6 text-center {className}" role="status">
		<svg viewBox="0 0 52 52" class="check size-16 text-primary" aria-hidden="true">
			<circle
				class="ring"
				cx="26"
				cy="26"
				r="24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
			/>
			<path
				class="tick"
				d="M15 27l7 7 15-16"
				fill="none"
				stroke="currentColor"
				stroke-width="3.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
		<p class="pt-1 text-2xl font-bold tracking-tight text-foreground">Message sent</p>
		<p class="text-lg text-foreground/80">Thanks, {name}. We got your message.</p>
		<p class="max-w-md text-sm text-foreground/65">
			We will reply to {email} soon. Anything else in the meantime, write us at
			<a class="text-foreground/80 underline underline-offset-4" href="mailto:{CONTACT_EMAIL}"
				>{CONTACT_EMAIL}</a
			>.
		</p>
	</div>
{:else}
	<form onsubmit={submit} class="flex flex-col gap-4 {className}">
		<div class="grid gap-4 {compact ? '' : 'sm:grid-cols-2'}">
			<label class="flex flex-col gap-1.5">
				<span class={label}>Your name</span>
				<input class={field} bind:value={name} required autocomplete="name" />
			</label>
			<label class="flex flex-col gap-1.5">
				<span class={label}>Email</span>
				<input class={field} type="email" bind:value={email} required autocomplete="email" />
			</label>
		</div>
		<fieldset class="flex flex-col gap-2">
			<legend class="{label} pb-1.5">The site is for</legend>
			<div class="flex flex-wrap gap-2">
				{#each CONTACT_KINDS as k (k)}
					<label
						class="cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors has-checked:border-primary has-checked:bg-primary/15 has-checked:text-foreground has-focus-visible:ring-2 has-focus-visible:ring-primary {kind ===
						k
							? ''
							: 'border-foreground/12 text-foreground/65 hover:border-foreground/30'}"
					>
						<input type="radio" class="sr-only" name="kind" value={k} bind:group={kind} />
						{k}
					</label>
				{/each}
			</div>
		</fieldset>
		<label class="flex flex-col gap-1.5">
			<span class={label}>Tell us about it</span>
			<textarea
				class="{field} min-h-28 resize-y"
				bind:value={message}
				required
				placeholder="Who it's for, what it needs to do, any site you have today."
			></textarea>
		</label>
		<div class="sr-only" aria-hidden="true">
			<label>
				Website
				<input name="website" tabindex="-1" autocomplete="off" bind:value={website} />
			</label>
		</div>
		<div class="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
			<button
				type="submit"
				class="h-11 rounded-full bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary/85 focus-visible:ring-3 focus-visible:ring-primary/40 focus-visible:outline-none"
			>
				Start the conversation
			</button>
			<p class="text-sm text-foreground/50">
				Goes straight to us, or write us at
				<a class="text-foreground/80 underline underline-offset-4" href="mailto:{CONTACT_EMAIL}"
					>{CONTACT_EMAIL}</a
				>.
			</p>
		</div>
		{#if status === 'error'}
			<p class="text-sm text-red-400" role="alert">
				{error} You can also email us directly at
				<a class="underline underline-offset-4" href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>.
			</p>
		{/if}
	</form>
{/if}

<style>
	/* Ring draws, then the tick; both start fully drawn under reduced motion. */
	.check .ring {
		stroke-dasharray: 151;
		stroke-dashoffset: 151;
		animation: draw 0.5s ease-out forwards;
	}
	.check .tick {
		stroke-dasharray: 36;
		stroke-dashoffset: 36;
		animation: draw 0.35s 0.4s ease-out forwards;
	}
	.check {
		animation: pop 0.4s 0.7s ease-out;
	}
	@keyframes draw {
		to {
			stroke-dashoffset: 0;
		}
	}
	@keyframes pop {
		50% {
			scale: 1.12;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.check,
		.check .ring,
		.check .tick {
			animation: none;
			stroke-dashoffset: 0;
		}
	}
</style>
