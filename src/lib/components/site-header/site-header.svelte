<script lang="ts">
	import { page } from '$app/state';
	import OrbitMark from '$lib/brand/OrbitMark.svelte';
	import { NudgeChain } from '$lib/nudge/index.js';

	type NavLink = { href: string; label: string; children?: NavLink[] };

	const LINKS: NavLink[] = [
		{
			href: '/websites',
			label: 'Websites',
			children: [{ href: '/websites/causes', label: 'Causes' }]
		},
		{ href: '/blog', label: 'Blog' }
	];

	// The compact nav that fades in once the hero has scrolled past, showing the
	// site name and secondary links. Hidden (but kept in the layout, `aria-hidden`)
	// while at rest so it doesn't compete with the hero title.
	let { scrolled = true, transparent = true }: { scrolled?: boolean; transparent?: boolean } =
		$props();

	let path = $derived(page.url.pathname.replace(/\/$/, '') || '/');
	let branchOpen = $state(false); // touch screens have no hover, so the chevron toggles the branch

	// Items float a few px and tug each other; the hairlines between them are the links.
	const HOME = '/';
	const chain = new NudgeChain();
	chain.link(HOME, LINKS[0].href, 0.004); // invisible and loose: the wordmark only feels the nav faintly
	LINKS.forEach((link, i) => {
		if (i > 0) chain.link(LINKS[i - 1].href, link.href);
		for (const child of link.children ?? []) chain.link(link.href, child.href);
	});
	const float = (el: HTMLElement, key: string) => ({ destroy: chain.node(el, key) });
	const tether = (el: HTMLElement, [a, b, mode]: [string, string, 'along' | 'across']) => ({
		destroy: chain.line(el, a, b, mode)
	});

	// Not while the homepage hides the nav (and never under reduced motion; the chain no-ops).
	$effect(() => {
		if (scrolled) chain.enable();
		else chain.disable();
	});
	$effect(() => () => chain.destroy());

	const isCurrent = (href: string) => path === href;
	const inSection = (link: NavLink) =>
		isCurrent(link.href) || (link.children ?? []).some((c) => isCurrent(c.href));
	const linkClass = (active: boolean) =>
		`rounded-full px-3 py-1.5 leading-none whitespace-nowrap transition-colors ${
			active ? 'text-primary' : 'text-foreground/75 hover:text-foreground'
		}`;
</script>

<header
	class="sticky top-0 z-2 h-16 {transparent
		? 'bg-transparent'
		: 'bg-background'} px-6 pt-4 sm:px-8 lg:px-10"
>
	<div
		class="flex flex-row items-center gap-3 transition-opacity duration-300 sm:gap-5"
		class:opacity-0={!scrolled}
		class:pointer-events-none={!scrolled}
		aria-hidden={!scrolled}
	>
		<div class="flex items-center gap-2" use:float={HOME}>
			<OrbitMark class="size-7 sm:size-8" />
			<a
				href="/"
				class="text-lg leading-none font-bold whitespace-nowrap hover:opacity-60 sm:text-2xl"
				>Void Projects</a
			>
		</div>
		<!-- Hairline dividers echo the homepage scroll rail (ScrollTimeline). -->
		<nav
			class="flex items-center rounded-full border border-foreground/10 bg-background/40 p-1 text-sm shadow-lg shadow-black/30 backdrop-blur-md"
		>
			{#each LINKS as link, i (link.href)}
				{#if i > 0}
					<span
						class="h-4 w-px bg-foreground/15"
						aria-hidden="true"
						use:tether={[LINKS[i - 1].href, link.href, 'across']}
					></span>
				{/if}
				{#if link.children}
					<div
						class="group relative flex items-center"
						role="presentation"
						onmouseleave={() => (branchOpen = false)}
					>
						<span class="flex items-center" use:float={link.href}>
							<a
								href={link.href}
								aria-current={isCurrent(link.href) ? 'page' : undefined}
								class="{linkClass(inSection(link))} pr-1">{link.label}</a
							>
							<button
								type="button"
								aria-label="Show pages under {link.label}"
								aria-expanded={branchOpen}
								onclick={() => (branchOpen = !branchOpen)}
								class="mr-1 grid size-5 place-items-center rounded-full text-foreground/50 hover:text-foreground"
							>
								<svg
									viewBox="0 0 10 10"
									class="size-2.5 transition-transform group-hover:rotate-180 {branchOpen
										? 'rotate-180'
										: ''}"
									aria-hidden="true"
									><path
										d="M2 3.5 5 6.5 8 3.5"
										fill="none"
										stroke="currentColor"
										stroke-width="1.4"
									/></svg
								>
							</button>
						</span>
						<!-- The branch: a hairline drops from the parent to its child pages. -->
						<div
							class="absolute top-full left-5 pt-1 group-focus-within:flex group-hover:flex {branchOpen
								? 'flex'
								: 'hidden'}"
						>
							<span
								class="mt-0 h-6 w-px bg-foreground/20"
								aria-hidden="true"
								use:tether={[link.href, link.children[0].href, 'along']}
							></span>
							<div class="flex flex-col pt-3">
								{#each link.children as child (child.href)}
									<div class="flex items-center" use:float={child.href}>
										<span class="h-px w-3 bg-foreground/20" aria-hidden="true"></span>
										<a
											href={child.href}
											aria-current={isCurrent(child.href) ? 'page' : undefined}
											class="{linkClass(
												isCurrent(child.href)
											)} border border-foreground/10 bg-background/60 shadow-lg shadow-black/30 backdrop-blur-md"
											>{child.label}</a
										>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{:else}
					<a
						href={link.href}
						aria-current={isCurrent(link.href) ? 'page' : undefined}
						class={linkClass(isCurrent(link.href))}
						use:float={link.href}>{link.label}</a
					>
				{/if}
			{/each}
		</nav>
	</div>
</header>
