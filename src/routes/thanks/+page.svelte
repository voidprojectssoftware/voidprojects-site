<script lang="ts">
	// Stripe Checkout's success_url for every offer. One generic page, so no offer id
	// enters the main site's build: the only per-customer input is ?session_id=, which
	// the questions box hands to /api/offer-question, and the server reads the offer
	// and business from that session at Stripe.
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import { Section } from '$lib/components/voidprojects/section/index.js';
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';
	import { CONTACT_EMAIL } from '$lib/content/websites.js';

	let { data } = $props();

	// Client only: the page is prerendered, and SvelteKit forbids reading
	// url.searchParams while prerendering.
	const sessionId = $derived(browser ? (page.url.searchParams.get('session_id') ?? '') : '');

	let message = $state('');
	let website = $state(''); // honeypot; people never see it
	let status = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let error = $state('');

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		status = 'sending';
		try {
			const res = await fetch('/api/offer-question', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId, message, website })
			});
			if (res.ok) {
				status = 'sent';
				return;
			}
			const data = await res.json().catch(() => null);
			error = data?.error ?? 'Something went wrong sending your question.';
		} catch {
			error = 'Your question could not be sent. Check your connection and try again.';
		}
		status = 'error';
	}

	const field =
		'w-full rounded-lg border border-foreground/12 bg-foreground/4 px-3.5 py-2.5 text-base text-foreground placeholder:text-foreground/35 focus:border-primary focus:ring-1 focus:ring-primary';
	const link = 'text-foreground/80 underline underline-offset-4 hover:text-primary';
</script>

<svelte:head>
	<title>Thank you | Void Projects</title>
	<meta name="robots" content="noindex, nofollow, noarchive" />
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<SiteHeader />

<main id="main-content" class="flex flex-col">
	<Section wide class="items-center pt-20 pb-28 text-center sm:pt-28">
		<h1 class="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
			Thanks, we'll follow up within 24 hours
		</h1>
		<p class="max-w-2xl pt-6 text-lg leading-relaxed text-balance text-foreground/70">
			Your sign-up went through. A person from Void Projects will be in touch about next steps.
		</p>

		<div class="w-full max-w-2xl pt-12 text-left">
			<GlassCard class="gap-5 p-6 sm:p-10">
				{#if status === 'sent'}
					<div role="status" class="flex flex-col gap-2">
						<p class="text-2xl font-bold tracking-tight">Question sent</p>
						<p class="text-foreground/70">
							We have it, and we will answer at the email you used at checkout.
						</p>
					</div>
				{:else if sessionId}
					<div class="flex flex-col gap-2">
						<h2 class="text-2xl font-bold tracking-tight">Questions in the meantime?</h2>
						<p class="text-foreground/65">
							Ask here and we will reply to the email you used at checkout.
						</p>
					</div>
					<form onsubmit={submit} class="flex flex-col gap-4">
						<label class="flex flex-col gap-1.5">
							<span class="text-sm font-medium text-foreground/80">Your question</span>
							<textarea
								class="{field} min-h-28 resize-y"
								bind:value={message}
								required
								maxlength="5000"
							></textarea>
						</label>
						<div class="sr-only" aria-hidden="true">
							<label>
								Website
								<input name="website" tabindex="-1" autocomplete="off" bind:value={website} />
							</label>
						</div>
						<button
							type="submit"
							disabled={status === 'sending'}
							class="h-11 w-fit rounded-full bg-primary-strong px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-strong/85 focus-visible:ring-3 focus-visible:ring-primary/40 focus-visible:outline-none disabled:opacity-70"
						>
							{status === 'sending' ? 'Sending...' : 'Send question'}
						</button>
						{#if status === 'error'}
							<p class="text-sm text-red-400" role="alert">
								{error} You can also email us at
								<a class="underline underline-offset-4" href="mailto:{CONTACT_EMAIL}"
									>{CONTACT_EMAIL}</a
								>.
							</p>
						{/if}
					</form>
				{:else}
					<h2 class="text-2xl font-bold tracking-tight">Questions in the meantime?</h2>
					<p class="text-foreground/65">
						Write us at <a class={link} href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>.
					</p>
				{/if}
			</GlassCard>
		</div>

		<p class="pt-10 text-sm text-foreground/55">
			{#if data.portalUrl}
				<a class={link} href={data.portalUrl} rel="noreferrer">Manage billing</a>: update your card,
				see invoices or cancel, any time.
			{:else}
				To manage billing, write us at
				<a class={link} href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>.
			{/if}
		</p>
	</Section>
</main>
