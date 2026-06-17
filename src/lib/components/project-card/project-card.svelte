<script lang="ts">
	import * as Card from '$lib/components/shadcn/ui/card/index.js';
	import type { ProjectCard as CardActor } from '$lib/physics/index.js';

	// Temp card: styling is a placeholder, we're dialing in the physics first. The
	// outer positioner flex-centres the card at its home (no transform of its own,
	// so the actor is free to own the inner element's transform); `class` sets the
	// vertical home. The actor toggles opacity — dormant cards sit invisible at home.
	// The inner element ships with `opacity-0` so it stays hidden on the first paint
	// (before the action hydrates and sets opacity), otherwise the cards flash over
	// the hero at their homes on load until the actor parks them. It also ships
	// `pointer-events-none`: a dormant card is laid out (invisibly) over the hero, so
	// without this it would swallow hovers/clicks meant for the title and the GitHub
	// button. The actor turns pointer events back on only while the card is tossed in.
	let {
		actor,
		title,
		desc,
		class: className = ''
	}: { actor: CardActor; title: string; desc: string; class?: string } = $props();

	const bind = (el: HTMLElement) => ({ destroy: actor.register(el) });
</script>

<div class="pointer-events-none absolute inset-x-0 flex justify-center {className}">
	<div use:bind class="pointer-events-none opacity-0">
		<Card.Root class="w-72">
			<Card.Header>
				<Card.Title class="text-xl">{title}</Card.Title>
				<Card.Description class="text-base">{desc}</Card.Description>
			</Card.Header>
		</Card.Root>
	</div>
</div>
