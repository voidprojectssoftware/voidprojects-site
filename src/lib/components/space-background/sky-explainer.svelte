<!--
	The "?" beside the sky label and the dialog it opens. Every number shown comes in
	through props from space-background.svelte (its CONFIG and the loaded catalogue),
	so the copy cannot drift from what is actually drawn.
-->
<script lang="ts">
	import * as Dialog from '$lib/components/shadcn/ui/dialog/index.js';
	import SkyExplainerBody from './sky-explainer-body.svelte';
	import type { SkyFacts } from './sky-facts.svelte.js';

	let props: SkyFacts = $props();
</script>

<Dialog.Root>
	<Dialog.Trigger
		aria-label="What is this night sky?"
		title="What is this night sky?"
		class="cursor-pointer rounded-full px-1 text-xs tracking-wide text-foreground/25 transition-opacity hover:text-foreground/60 focus-visible:text-foreground/60 focus-visible:outline-1 focus-visible:outline-foreground/40"
	>
		?
	</Dialog.Trigger>
	<!-- No backdrop blur: over the animated sky canvas it forces a full-viewport re-blur every frame. -->
	<Dialog.Content
		overlayClass="bg-black/50 supports-backdrop-filter:backdrop-blur-none"
		class="max-h-[calc(100dvh-2rem)] [scrollbar-width:none] overflow-y-auto sm:max-w-lg [&::-webkit-scrollbar]:hidden"
	>
		<Dialog.Header class="pr-8">
			<Dialog.Title>The stars behind this page</Dialog.Title>
			<Dialog.Description>
				It is the real night sky, right now, as seen from {props.defaultPlace}, or from where you
				are if you share your location. It turns slowly with the Earth.
			</Dialog.Description>
		</Dialog.Header>

		<SkyExplainerBody {...props} />
	</Dialog.Content>
</Dialog.Root>
