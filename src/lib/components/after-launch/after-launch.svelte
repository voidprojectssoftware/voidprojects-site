<script lang="ts">
	import { AFTER_LAUNCH } from '$lib/content/websites.js';
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
		<ol class="relative flex flex-col gap-6 border-l border-dashed border-primary/40 pl-7">
			{#each AFTER_LAUNCH.requests as req (req)}
				<li class="relative">
					<span
						class="absolute top-1.5 -left-[33px] size-3 rounded-full bg-primary ring-4 ring-background"
					></span>
					<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
						<span class="text-lg">“{req}”</span>
						<span class="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary"
							>Live same day</span
						>
					</div>
				</li>
			{/each}
		</ol>
	</div>
</div>
