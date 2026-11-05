<script lang="ts">
	import { PAGES } from '$lib/seo/site.js';
</script>

<!-- Right-aligned from sm up: the sky label is fixed at the bottom left there. -->
<footer
	class="relative z-1 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-foreground/8 bg-background/70 px-6 py-6 text-sm text-foreground/70 backdrop-blur-md sm:justify-end sm:px-8 lg:px-10"
>
	<p>Void Projects LLC</p>
	<nav aria-label="Legal" class="flex gap-5">
		<a class="underline-offset-4 hover:text-foreground hover:underline" href={PAGES.terms.path}
			>Terms</a
		>
		<a class="underline-offset-4 hover:text-foreground hover:underline" href={PAGES.privacy.path}
			>Privacy</a
		>
	</nav>
</footer>
