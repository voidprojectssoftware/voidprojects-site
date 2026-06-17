<script lang="ts">
	import * as Card from '$lib/components/shadcn/ui/card/index.js';

	let { title, desc } = $props();
</script>

<Card.Root class="w-1/2">
	<Card.Header>
		<Card.Title class="text-xl">{title}</Card.Title>
		<Card.Description class="text-lg">{desc}</Card.Description>
	</Card.Header>
</Card.Root>
