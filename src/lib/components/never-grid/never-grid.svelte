<script lang="ts">
	import { Check, Hand, TriangleAlert, UserRound, X } from '@lucide/svelte';
	import { NEVER, INSTEAD } from '$lib/content/websites.js';
</script>

<!-- @container so the scenes pair up by the card's width, not the viewport's:
     the card sits in a half-width column from md. -->
<div class="@container flex flex-col gap-5">
	<p class="text-sm font-semibold tracking-[0.14em] text-foreground/50 uppercase">
		You’ll never have to
	</p>
	<ul class="grid gap-4 @md:grid-cols-2">
		{#each NEVER as item (item.scene)}
			<li class="flex flex-col gap-2">
				<div
					class="relative h-32 overflow-hidden rounded-xl bg-foreground/[0.04] p-3 text-[11px] leading-snug text-foreground/60 ring-1 ring-red-400/25 select-none"
					aria-hidden="true"
				>
					{#if item.scene === 'chat'}
						<div class="flex flex-col gap-1.5 pr-8">
							<span class="self-end rounded-lg rounded-br-sm bg-foreground/12 px-2 py-1"
								>Make the logo bigger</span
							>
							<span
								class="max-w-[85%] self-start rounded-lg rounded-bl-sm bg-foreground/6 px-2 py-1"
								>You’re absolutely right! I made it smaller.</span
							>
							<span class="self-end rounded-lg rounded-br-sm bg-foreground/12 px-2 py-1"
								>BIGGER.</span
							>
						</div>
					{:else if item.scene === 'builder'}
						<div class="absolute top-3 left-3 h-4 w-3/5 rounded bg-foreground/15"></div>
						<div class="absolute top-10 left-12 h-12 w-2/5 rounded bg-foreground/10"></div>
						<div
							class="absolute top-8 left-5 h-12 w-2/5 -rotate-6 rounded border border-dashed border-sky-400/70 bg-sky-400/10"
						></div>
						<Hand class="absolute top-14 left-1/3 size-5 text-foreground/80" />
						<span
							class="absolute bottom-2.5 left-3 inline-flex items-center gap-1 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] text-amber-300"
							><TriangleAlert class="size-3" />Element overlaps footer</span
						>
					{:else if item.scene === 'code'}
						<pre class="font-mono text-[10px] leading-relaxed"><span class="text-violet-300"
								>&lt;div</span
							> class=<span class="text-emerald-300">"hero flex"</span>&gt;
  <span class="text-violet-300">&lt;img</span> src=<span class="text-emerald-300">"logo.png"</span
							>&gt;
<span class="text-violet-300">&lt;/dvi&gt;</span>
<span class="text-red-400">npm ERR! code ERESOLVE</span></pre>
					{:else}
						<div class="grid grid-cols-[auto_auto_1fr] gap-x-3 gap-y-1 font-mono text-[10px]">
							<span class="text-foreground/40">Type</span><span class="text-foreground/40"
								>Name</span
							><span class="text-foreground/40">Value</span>
							<span>CNAME</span><span>www</span><span class="truncate">???.azurestaticapps…</span>
							<span>A</span><span>@</span><span>???</span>
							<span>TXT</span><span>_dnsauth</span><span class="truncate">k8f2-x91q…</span>
						</div>
						<span
							class="absolute bottom-2.5 left-3 inline-flex items-center gap-1 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] text-amber-300"
							><TriangleAlert class="size-3" />SSL: pending validation</span
						>
					{/if}
					<span
						class="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-red-500/90 text-white shadow"
						><X class="size-3.5" strokeWidth={3} /></span
					>
				</div>
				<span class="text-foreground/55 line-through decoration-foreground/30">{item.text}</span>
			</li>
		{/each}
	</ul>
	<div class="flex items-center gap-3 rounded-xl bg-primary/12 p-4 ring-1 ring-primary/40">
		<span class="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-white"
			><UserRound class="size-5" aria-hidden="true" /></span
		>
		<div class="flex flex-col">
			<span class="text-xs font-semibold tracking-[0.14em] text-primary uppercase">Instead</span>
			<span class="text-base font-medium">{INSTEAD}</span>
		</div>
		<Check class="ml-auto size-5 shrink-0 text-primary" aria-hidden="true" />
	</div>
</div>
