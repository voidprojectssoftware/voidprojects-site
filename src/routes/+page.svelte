<script>
	import { Header } from '$lib/components/header/index.js';
	import * as Card from '$lib/components/shadcn/ui/card/index.js';
	import { Button } from '$lib/components/shadcn/ui/button/index.js';
</script>

<Header></Header>
<main class="flex h-screen flex-col">
	<section class="flex flex-1 flex-col items-center justify-center gap-3">
		<div class="flex flex-col items-center gap-4 pb-30">
			<h1 class="text-6xl font-bold">Void Projects</h1>
			<p class="text-2xl">Software for accelerating the use of agentic systems.</p>
			<Button
				class="text-2xl"
				onclick={() => window.open('https://github.com/voidprojectssoftware')}
				>Visit Our Github</Button
			>
		</div>
	</section>
</main>
