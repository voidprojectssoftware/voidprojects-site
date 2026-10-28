<script lang="ts">
	import { Mail, MessageSquare, Phone } from '@lucide/svelte';
	import { AFTER_LAUNCH, ENGINEER } from '$lib/content/websites.js';

	const engineer = ENGINEER.name.split(' ')[0];
	const CHANNELS = {
		text: { icon: MessageSquare, label: `Texted ${engineer}` },
		email: { icon: Mail, label: `Emailed ${engineer}` },
		call: { icon: Phone, label: `Called ${engineer}` }
	};
</script>

<div class="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
	<div class="flex flex-col gap-4">
		<h3 class="text-3xl font-bold tracking-tight">{AFTER_LAUNCH.title}</h3>
		<p class="text-lg leading-relaxed text-foreground/65">{AFTER_LAUNCH.body}</p>
	</div>
	<div>
		<p class="pb-4 text-sm font-semibold tracking-[0.14em] text-foreground/50 uppercase">
			After launch, for example
		</p>
		<ol class="relative flex flex-col gap-6 border-l border-dashed border-primary/40 pl-8">
			{#each AFTER_LAUNCH.requests as req (req.text)}
				{@const channel = CHANNELS[req.via]}
				<li class="relative">
					<!-- Opaque base so the dashed rail doesn't show through the tinted chip. -->
					<span
						class="absolute top-0 -left-[45px] size-7 rounded-full bg-background ring-4 ring-background"
					>
						<span class="grid size-full place-items-center rounded-full bg-primary/20 text-primary">
							<channel.icon class="size-3.5" aria-hidden="true" />
						</span>
					</span>
					<p class="pb-1 text-xs font-medium tracking-wide text-foreground/50">{channel.label}</p>
					<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
						<span class="text-lg">“{req.text}”</span>
						<span class="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary"
							>Live same day</span
						>
					</div>
				</li>
			{/each}
		</ol>
	</div>
</div>
