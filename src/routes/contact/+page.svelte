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
			<GlassCard class="gap-6 p-6 sm:p-10">
				{#if !contactSent}
					<div class="flex flex-col gap-2">
						<h1 class="text-3xl font-bold tracking-tight">{CONTACT_PAGE.title}</h1>
						<p class="text-foreground/65">{CONTACT_PAGE.body}</p>
						<p class="text-foreground/65">{CONTACT_PAGE.unsure}</p>
					</div>
				{/if}
				<ContactForm bind:sent={contactSent} initialKind={CONTACT_KIND_KEYS.unsure} />
			</GlassCard>
		</div>
		<div class="w-full max-w-2xl pt-16">
			<h2 class="pb-6 text-center text-3xl font-bold tracking-tight">{SERVICES_HEADING}</h2>
			<div class="grid gap-5 sm:grid-cols-2">
				{#each SERVICES as service (service.key)}
					<GlassCard class="gap-3 p-6">
						<h3 class="text-lg font-semibold">{service.title}</h3>
						<p class="text-sm leading-relaxed text-foreground/65">{service.body}</p>
						{#if service.link}
							<a
								href={service.link.href}
								class="mt-auto inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
								>{service.link.label}</a
							>
						{/if}
					</GlassCard>
				{/each}
			</div>
		</div>
	</Section>
</main>
