<script lang="ts">
	import { CONTACT_EMAIL } from '$lib/content/websites.js';

	// No backend yet: submitting composes an email in the visitor's mail client.
	// Swap `submit` for a POST once a form endpoint exists.
	const KINDS = ['A business', 'A cause', 'Something personal', 'Not sure yet'];

	let {
		class: className = '',
		compact = false,
		initialKind = KINDS[0]
	}: { class?: string; compact?: boolean; initialKind?: (typeof KINDS)[number] } = $props();

	let name = $state('');
	let email = $state('');
	// svelte-ignore state_referenced_locally
	let kind = $state(initialKind); // seeded once; the visitor can change it
	let message = $state('');
	let sent = $state(false);

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const subject = `Website request from ${name}`;
		const body = `Name: ${name}\nEmail: ${email}\nThe site is for: ${kind}\n\n${message}`;
		window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
		sent = true;
	}

	const field =
		'w-full rounded-lg border border-foreground/12 bg-foreground/4 px-3.5 py-2.5 text-base text-foreground placeholder:text-foreground/35 focus:border-primary focus:ring-1 focus:ring-primary';
	const label = 'text-sm font-medium text-foreground/80';
</script>

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
			{#each KINDS as k (k)}
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
	<div class="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
		<button
			type="submit"
			class="h-11 rounded-full bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary/85 focus-visible:ring-3 focus-visible:ring-primary/40 focus-visible:outline-none"
		>
			Start the conversation
		</button>
		<p class="text-sm text-foreground/50">
			{#if sent}
				Your mail app should open. If not, write us at
			{:else}
				Opens your email app, or write us at
			{/if}
			<a class="text-foreground/80 underline underline-offset-4" href="mailto:{CONTACT_EMAIL}"
				>{CONTACT_EMAIL}</a
			>.
		</p>
	</div>
</form>
