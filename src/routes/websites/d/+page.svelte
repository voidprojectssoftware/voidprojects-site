<script lang="ts">
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import { Section } from '$lib/components/voidprojects/section/index.js';
	import { BrowserFrame } from '$lib/components/browser-frame/index.js';
	import { ContactForm } from '$lib/components/contact-form/index.js';
	import { SHOWCASE, PRINCIPLES } from '$lib/content/websites.js';
</script>

<svelte:head>
	<title>Websites by Void Projects</title>
	<meta
		name="description"
		content="Websites built by people, sped up by AI. Openly billed at cost plus 30%, $0 for our work, and free for causes."
	/>
</svelte:head>

<SiteHeader />

<Section class="pt-10 pb-24 sm:pt-16">
	<div class="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
		<div class="flex flex-col gap-10">
			<div>
				<h1 class="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
					Your website, by people, at cost.
				</h1>
				<p class="pt-4 text-lg leading-relaxed text-foreground/70">
					Void Projects builds sites with AI in the loop and a human on every message.
				</p>
			</div>
			<ul class="flex flex-col gap-4">
				{#each PRINCIPLES as p (p.title)}
					<li class="flex gap-3">
						<span class="mt-2 size-1.5 shrink-0 rounded-full bg-primary"></span>
						<p class="leading-relaxed text-foreground/70">
							<span class="font-semibold text-foreground">{p.title}.</span>
							{p.body}
						</p>
					</li>
				{/each}
			</ul>
			<div
				id="contact"
				class="scroll-mt-24 rounded-2xl border border-foreground/10 bg-background/70 p-5 backdrop-blur-sm sm:p-6"
			>
				<h2 class="pb-4 text-lg font-semibold">Start a site</h2>
				<ContactForm compact />
			</div>
		</div>

		<div class="flex flex-col gap-12">
			{#each SHOWCASE as site, i (site.url)}
				<a href={site.url} target="_blank" rel="noopener" class="group flex flex-col gap-4">
					<BrowserFrame
						src={site.desktop}
						host={site.host}
						alt="The {site.name} homepage"
						eager={i === 0}
						class="transition-transform duration-300 group-hover:-translate-y-1"
					/>
					<div class="flex flex-col gap-1.5">
						<div class="flex flex-wrap items-baseline gap-x-3">
							<h2 class="text-xl font-semibold group-hover:text-primary">{site.name}</h2>
							<span class="text-sm text-foreground/45"
								>{site.kind}{site.free ? ' · built free' : ''}</span
							>
						</div>
						<p class="text-sm leading-relaxed text-foreground/65">{site.blurb}</p>
					</div>
				</a>
			{/each}
		</div>
	</div>
</Section>
