<script lang="ts">
	import { PAGES } from '$lib/seo/site.js';
	import { CONTACT_EMAIL } from '$lib/content/websites.js';
	import { LOCATION } from '$lib/content/services.js';

	const SITE_LINKS = [
		{ href: PAGES.contact.path, label: 'Contact' },
		{ href: PAGES.websites.path, label: 'Websites' },
		{ href: PAGES.causes.path, label: 'Causes' },
		{ href: PAGES.blog.path, label: 'Blog' },
		{ href: PAGES.brand.path, label: 'Our Brand' }
	];
	const link =
		'inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline';
</script>

<!-- Right-aligned from sm up: the sky label is fixed at the bottom left there. -->
<footer
	class="relative z-1 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-foreground/8 bg-background/70 px-6 py-4 text-sm text-foreground/70 backdrop-blur-md sm:justify-end sm:px-8 lg:px-10"
>
	<p>Void Projects LLC, {LOCATION}</p>
	<a class={link} href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>
	<nav aria-label="Site" class="flex flex-wrap gap-x-5">
		{#each SITE_LINKS as item (item.href)}
			<a class={link} href={item.href}>{item.label}</a>
		{/each}
	</nav>
	<nav aria-label="Legal" class="flex gap-5">
		<a class={link} href={PAGES.terms.path}>Terms</a>
		<a class={link} href={PAGES.privacy.path}>Privacy</a>
	</nav>
</footer>
