<script lang="ts">
	import { onMount } from 'svelte';

	// A Minecraft-style splash: tilted yellow text that pulses on the corner of
	// whatever it's placed in (the parent must be `relative`). Picked client-side
	// after mount, since a prerendered pick would be the same for every visitor.
	let { lines }: { lines: string[] } = $props();

	let text = $state('');
	onMount(() => {
		text = lines[Math.floor(Math.random() * lines.length)];
	});
</script>

{#if text}
	<span
		class="splash pointer-events-none absolute -top-12 right-0 origin-right rotate-[9deg] text-sm font-bold tracking-normal whitespace-nowrap text-[#ffe14d] [text-shadow:2px_2px_0_#3f3a00] sm:-top-16 sm:text-base lg:-top-16 lg:right-auto lg:left-[78%] lg:origin-left lg:rotate-[12deg] lg:text-xl xl:text-2xl"
		aria-hidden="true">{text}</span
	>
{/if}

<style>
	/* Minecraft's splash breathes in and out. Scale is a separate property so it
	   composes with the Tailwind rotate/translate instead of replacing them. */
	.splash {
		animation: splash-pulse 0.9s ease-in-out infinite alternate;
	}
	@keyframes splash-pulse {
		from {
			scale: 1;
		}
		to {
			scale: 1.08;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.splash {
			animation: none;
		}
	}
</style>
