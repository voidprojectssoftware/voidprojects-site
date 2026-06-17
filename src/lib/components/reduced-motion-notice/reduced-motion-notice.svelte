<script lang="ts">
	import { onMount } from 'svelte';
	import { TriangleAlert, X } from '@lucide/svelte';

	let {
		docsUrl = 'https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion'
	}: { docsUrl?: string } = $props();

	let reduced = $state(false);
	let dismissed = $state(false);

	const show = $derived(reduced && !dismissed);

	onMount(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		reduced = mq.matches;
		const onChange = (e: MediaQueryListEvent) => (reduced = e.matches);
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});
</script>

{#if show}
	<div
		role="status"
		class="fixed right-4 bottom-4 z-2 flex max-w-sm items-start gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-lg"
	>
		<TriangleAlert size={20} class="mt-0.5 shrink-0 text-primary" />
		<div class="flex flex-col gap-1 text-sm">
			<p class="font-medium">Animations are turned off</p>
			<p class="text-muted-foreground">
				Your system has reduced motion enabled, so our cool animations won't be visible :(
				<a
					href={docsUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="font-medium text-primary underline underline-offset-2 hover:opacity-80"
					>Learn more</a
				>.
			</p>
		</div>
		<button
			type="button"
			onclick={() => (dismissed = true)}
			aria-label="Dismiss notice"
			class="-mt-1 -mr-1 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
		>
			<X size={16} />
		</button>
	</div>
{/if}
