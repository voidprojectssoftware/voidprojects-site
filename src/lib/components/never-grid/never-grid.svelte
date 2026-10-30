<script lang="ts">
	import { Hand, TriangleAlert, X } from '@lucide/svelte';
	import { NEVER } from '$lib/content/websites.js';

	const TILT = ['-rotate-3', 'rotate-2', 'rotate-[1.5deg]', '-rotate-2']; // parallel to NEVER
</script>

<!-- @container so the scenes pair up by the column's width, not the viewport's. -->
<div class="@container flex flex-col gap-6">
	<p class="text-sm font-semibold tracking-[0.14em] text-foreground/50 uppercase">
		You’ll never have to
	</p>
	<ul class="grid items-start gap-6 @md:grid-cols-2 @md:gap-x-8">
		{#each NEVER as item, i (item.scene)}
			<li
				class="float flex flex-col gap-3 rounded-2xl bg-background/70 p-3 shadow-[0_24px_50px_-24px_oklch(0_0_0/0.9)] ring-1 ring-red-400/30 backdrop-blur-sm {TILT[
					i
				]} {i % 2 ? '@md:mt-8' : ''}"
				style:animation-delay="{i * -1.3}s"
			>
				<div
					class="relative h-32 overflow-hidden rounded-xl bg-foreground/[0.04] p-3 text-[11px] leading-snug text-foreground/60 select-none"
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
							<span class="text-foreground/50">Type</span><span class="text-foreground/50"
								>Name</span
							><span class="text-foreground/50">Value</span>
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
				<span class="px-1 pb-1 text-foreground/55 line-through decoration-foreground/30"
					>{item.text}</span
				>
			</li>
		{/each}
	</ul>
</div>

<style>
	/* Each scene bobs on its own phase (negative animation-delay), so the set reads
	   as loose floating examples. `translate` composes with the Tailwind rotate. */
	.float {
		animation: float 5.2s ease-in-out infinite alternate;
	}
	@keyframes float {
		from {
			translate: 0 0;
		}
		to {
			translate: 0 -8px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.float {
			animation: none;
		}
	}
</style>
