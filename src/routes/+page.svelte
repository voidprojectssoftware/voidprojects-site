<script>
	import { Header } from '$lib/components/header/index.js';
	import { Button } from '$lib/components/shadcn/ui/button/index.js';
	import { Section } from '$lib/components/section/index.js';
</script>

<Header />
<main class="flex flex-col">
	<Section class="items-center justify-center gap-3">
		<div class="flex flex-col items-center gap-4">
			<h1 class="text-8xl font-bold">Void Projects</h1>
			<p class="text-2xl">Software for accelerating the use of agentic systems.</p>
			<Button
				class="text-2xl"
				onclick={() => window.open('https://github.com/voidprojectssoftware')}
				>Visit Our Github</Button
			>
		</div>
	</Section>
	<Section>
		<div class="flex flex-col gap-4">
			<h1 class="text-6xl">Constellation</h1>
			<h2 class="text-3xl">
				Transform disjointed, amorphic systems into accessible graphs of knowledge.
			</h2>
		</div>
		<p></p>
	</Section>
</main>
