<script lang="ts">
	import { SiteHeader } from '$lib/components/site-header/index.js';
	import { Section } from '$lib/components/voidprojects/section/index.js';
	import { GlassCard } from '$lib/components/voidprojects/glass-card/index.js';
	import { ContactForm } from '$lib/components/contact-form/index.js';
	import { CONTACT_KIND_KEYS } from '$lib/content/websites.js';
	import { CONTACT_PAGE, SERVICES, SERVICES_HEADING } from '$lib/content/services.js';
	import { PageMeta } from '$lib/components/page-meta/index.js';
	import { PAGES } from '$lib/seo/site.js';

	let contactSent = $state(false);
</script>

<svelte:head>
	<PageMeta meta={PAGES.contact} />
</svelte:head>

<SiteHeader />

<main id="main-content" class="flex flex-col">
	<Section wide class="items-center pt-16 pb-28 sm:pt-24">
		<div class="w-full max-w-2xl">
			<GlassCard class="gap-6 bg-background/70 p-6 sm:p-10">
				{#if !contactSent}
					<div class="flex flex-col gap-3">
						<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">{CONTACT_PAGE.title}</h1>
						<p class="leading-relaxed text-foreground/75">{CONTACT_PAGE.body}</p>
						<p class="text-sm leading-relaxed text-foreground/65">{CONTACT_PAGE.unsure}</p>
					</div>
				{/if}
				<ContactForm bind:sent={contactSent} initialKind={CONTACT_KIND_KEYS.unsure} />
			</GlassCard>
		</div>
		<section aria-labelledby="services-heading" class="w-full max-w-2xl pt-12">
			<h2
				id="services-heading"
				class="pb-4 text-sm font-semibold tracking-[0.14em] text-primary uppercase"
			>
				{SERVICES_HEADING}
			</h2>
			<ul class="grid gap-3 sm:grid-cols-2">
				{#each SERVICES as service (service.key)}
					<li
						class="flex flex-col gap-1 rounded-2xl bg-background/60 p-4 ring-1 ring-foreground/10"
					>
						<span class="font-semibold">{service.title}</span>
						<span class="text-sm leading-relaxed text-foreground/70">{service.body}</span>
						{#if service.link}
							<a
								href={service.link.href}
								class="pt-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
								>{service.link.label}</a
							>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	</Section>
</main>
