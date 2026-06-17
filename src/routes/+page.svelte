<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/shadcn/ui/button/index.js';
	import { Section } from '$lib/components/section/index.js';
	import { Switch } from '$lib/components/shadcn/ui/switch/index.js';
	import { Sun, Moon } from '@lucide/svelte';
	import { Feature } from '$lib/components/feature/index.js';
	import { Heading } from '$lib/components/heading/index.js';

	let heroRef = $state<HTMLElement | null>(null);
	let secondRef = $state<HTMLElement | null>(null);
	let headerLogoInvisible = $state(true);

	let dark = $state(false);

	function toggleDark(checked: boolean) {
		dark = checked;
		document.documentElement.classList.toggle('dark', dark);
	}

	onMount(() => {
		const onScroll = () => {
			if (!heroRef || !secondRef) return;
			const progress = Math.max(
				0,
				Math.min(
					1,
					(window.innerHeight - secondRef.getBoundingClientRect().top) / window.innerHeight
				)
			);
			heroRef.style.filter = `blur(${progress * 8}px)`;

			headerLogoInvisible = progress <= 0.7;
		};

		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<header class="sticky top-0 z-2 h-16 bg-background pt-4 px-35">
	<div class="flex flex-row items-center justify-between">
		<div class="flex flex-row items-center justify-center gap-6">
			<span class="text-xl font-bold" hidden={headerLogoInvisible}>Void Projects</span>
			<a href="/blog" class="text-lg hover:opacity-60">Blog</a>
			<a href="/team" class="text-lg hover:opacity-60">Meet The Team</a>
		</div>
		<div class="flex flex-row items-center justify-center gap-2">
			<Moon size={16} />
			<Switch checked={dark} onCheckedChange={toggleDark} />
			<Sun size={16} />
		</div>
	</div>
</header>
<main class="flex flex-col">
	<Section bind:ref={heroRef} class="sticky top-16 items-center justify-center gap-3 h-[calc(100dvh-4rem)]">
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
	<Section bind:ref={secondRef} class="relative z-1 gap-15">
		<Heading
			title="Constellation"
			desc="Transform disjointed, amorphic systems into accessible graphs of knowledge."
		/>
		<div class="flex flex-row gap-5">
			<Feature
				title="Understand anything"
				desc="Connect APIs, SQL Server schemas, repositories, all together, in a single, cohesive
			system, readable by an agent."
			/>
			<Feature
				title="Understand anything"
				desc="Connect APIs, SQL Server schemas, repositories, all together, in a single, cohesive
			system, readable by an agent."
			/>
			<Feature
				title="Understand anything"
				desc="Connect APIs, SQL Server schemas, repositories, all together, in a single, cohesive
			system, readable by an agent."
			/>
		</div>
		<Heading
			title="Protostar"
			desc="Shareable, private, and internal agent skills that get better as you use them."
		/>
		<div class="flex flex-row gap-5">
			<Feature title="Shareable" desc="Sync your skills across your enterprise, team, or group." />
			<Feature
				title="Private"
				desc="Host them locally inside of a private network, or federate access with roles."
			/>
			<Feature
				title="Dynamic"
				desc="Agents create stronger skills by taking learnings from every individual's unique use of a common skill."
			/>
		</div>
		<Heading
			title="Wormhole"
			desc="Query a teammate's local notes in your favorite agent harness."
		/>
		<div class="flex flex-row gap-5 pb-25">
			<Feature
				title="Knowledge transfer for agents"
				desc="Read from a teammate's local notes in your favorite agent harness."
			/>
			<Feature
				title="Knowledge transfer for agents"
				desc="Read from a teammate's local notes in your favorite agent harness."
			/>
			<Feature
				title="Knowledge transfer for agents"
				desc="Read from a teammate's local notes in your favorite agent harness."
			/>
		</div>
	</Section>
</main>
