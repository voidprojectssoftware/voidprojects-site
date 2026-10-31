<script lang="ts">
	import { page } from '$app/state';
	import OrbitMark from '$lib/brand/OrbitMark.svelte';
	import { NudgeChain } from '$lib/nudge/index.js';
	import { brandViolet } from '$lib/physics/colors.js';

	type NavLink = { href: string; label: string; children?: NavLink[] };

	const LINKS: NavLink[] = [
		{
			href: '/websites',
			label: 'Websites',
			children: [{ href: '/websites/causes', label: 'Causes' }]
		},
		{ href: '/blog', label: 'Blog' },
		{ href: '/about/brand', label: 'Our Brand' }
	];

	// The compact nav that fades in once the hero has scrolled past, showing the
	// site name and secondary links. Hidden (but kept in the layout, `aria-hidden`)
	// while at rest so it doesn't compete with the hero title.
	let { scrolled = true, transparent = true }: { scrolled?: boolean; transparent?: boolean } =
		$props();

	let path = $derived(page.url.pathname.replace(/\/$/, '') || '/');
	let scrollY = $state(0);
	let frosted = $derived(transparent && scrolled && scrollY > 8); // frost only once content can slide under it
	let branchOpen = $state(false); // touch screens have no hover, so the chevron toggles the branch
	let keyboardOpen = $state(false); // keyboard focus inside opens it; a tapped or clicked chevron keeping focus must not
	let branchEl: HTMLElement | undefined = $state();
	// A tap or focus landing outside the branch closes it; leaving with a mouse closes it too.
	const closeIfOutside = (target: EventTarget | null) => {
		if (target instanceof Node && branchEl?.contains(target)) return;
		branchOpen = false;
		keyboardOpen = false;
	};

	// Items float a few px and tug each other; a sub-page hangs off its parent on a string.
	const HOME = '/';
	const chain = new NudgeChain();
	chain.link(HOME, LINKS[0].href, 0.004); // the wordmark only feels the nav faintly
	LINKS.forEach((link, i) => {
		if (i > 0) chain.link(LINKS[i - 1].href, link.href);
		for (const child of link.children ?? []) chain.link(link.href, child.href, 0.03);
	});
	const float = (el: HTMLElement, key: string) => ({ destroy: chain.node(el, key) });
	const hang = (el: HTMLElement, key: string) => ({ destroy: chain.node(el, key, 0.006) }); // loose home: it follows its parent
	const string = (el: SVGPathElement, [a, b]: [string, string]) => ({
		destroy: chain.string(el, a, b)
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
		`rounded-full px-2 py-1.5 leading-none max-[379px]:px-1 sm:px-3 whitespace-nowrap transition-colors ${
			active ? 'text-primary' : 'text-foreground/75 hover:text-foreground'
		}`;
</script>

<svelte:window bind:scrollY onpointerdown={(e) => closeIfOutside(e.target)} />

<header
	class="sticky top-0 z-2 h-16 border-b transition-[background-color,border-color,backdrop-filter] duration-300 {!transparent
		? 'border-transparent bg-background'
		: frosted
			? 'border-foreground/8 bg-background/70 backdrop-blur-md'
			: 'border-transparent bg-transparent'} px-4 pt-4 max-[379px]:px-3 sm:px-8 lg:px-10"
>
	<div
		class="flex flex-row items-center gap-2 transition-opacity duration-300 sm:gap-5"
		class:opacity-0={!scrolled}
		class:pointer-events-none={!scrolled}
		aria-hidden={!scrolled}
	>
		<div class="flex items-center gap-2" use:float={HOME}>
			<OrbitMark class="size-6 sm:size-8" />
			<a
				href="/"
				class="text-base leading-none font-bold whitespace-nowrap hover:opacity-60 sm:text-2xl"
				>Void Projects</a
			>
		</div>
		<nav class="flex items-center gap-0 text-xs sm:gap-3 sm:text-sm">
			{#each LINKS as link (link.href)}
				{#if link.children}
					<div
						class="group relative flex items-center"
						role="presentation"
						bind:this={branchEl}
						onpointerleave={(e) => {
							if (e.pointerType === 'mouse') branchOpen = false;
						}}
						onfocusin={(e) => {
							if ((e.target as HTMLElement).matches(':focus-visible')) keyboardOpen = true;
						}}
						onfocusout={(e) => closeIfOutside(e.relatedTarget)}
					>
						<span class="flex items-center" use:float={link.href}>
							<a
								href={link.href}
								aria-current={isCurrent(link.href) ? 'page' : undefined}
								class="{linkClass(inSection(link))} pr-1 sm:pr-1">{link.label}</a
							>
							<button
								type="button"
								aria-label="Show pages under {link.label}"
								aria-expanded={branchOpen}
								onclick={() => (branchOpen = !branchOpen)}
								class="mr-1 grid size-6 place-items-center rounded-full text-foreground/50 hover:text-foreground"
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
						<!-- Sub-pages hang below on a string. Shown on demand: always-on would sit over page titles just under the header. -->
						<div
							class="absolute top-full left-0 flex-col pt-5 group-hover:flex {branchOpen ||
							keyboardOpen
								? 'flex'
								: 'hidden'}"
						>
							<svg
								class="pointer-events-none absolute top-0 left-0 overflow-visible"
								width="1"
								height="1"
								aria-hidden="true"
							>
								<path
									d="M38 -6 Q35 9 38 24"
									fill="none"
									stroke={brandViolet(0.85)}
									stroke-width="1.5"
									stroke-linecap="round"
									use:string={[link.href, link.children[0].href]}
								/>
							</svg>
							{#each link.children as child (child.href)}
								<a
									href={child.href}
									aria-current={isCurrent(child.href) ? 'page' : undefined}
									class="{linkClass(
										isCurrent(child.href)
									)} [text-shadow:0_0_2px_rgb(8_10_20/0.85),0_0_8px_rgb(8_10_20/0.85)]"
									use:hang={child.href}>{child.label}</a
								>
							{/each}
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
