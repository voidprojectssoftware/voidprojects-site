<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Picture } from '@sveltejs/enhanced-img';
	import { ProfilePicture } from '$lib/components/profile-picture/index.js';
	import { Badge } from '$lib/components/shadcn/ui/badge/index.js';

	let {
		src,
		alt,
		name,
		role,
		subrole,
		skills,
		email,
		linkedin,
		desc,
		layout = 'horizontal'
	}: {
		src: Picture;
		alt: string;
		name: string;
		role: string;
		subrole: string;
		skills: string[];
		email: string;
		linkedin?: string;
		desc?: Snippet;
		layout?: 'horizontal' | 'vertical'; // vertical: photo on top, for side-by-side columns
	} = $props();

	let bioDialog = $state<HTMLDialogElement | null>(null);
</script>

{#snippet linkedinLink()}
	{#if linkedin}
		<a
			href={linkedin}
			target="_blank"
			rel="noopener noreferrer"
			aria-label="{name} on LinkedIn"
			class="text-foreground/50 transition-colors hover:text-[#0A66C2]"
		>
			<svg role="img" viewBox="0 0 24 24" fill="currentColor" class="size-5" aria-hidden="true">
				<path
					d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
				/>
			</svg>
		</a>
	{/if}
{/snippet}

{#if layout === 'vertical'}
	<!-- Below lg the columns stack, so the card goes compact: photo beside the name
	     and the bio clamped, keeping all three inside one viewport. -->
	<div class="flex flex-col gap-2 text-left lg:items-center lg:gap-3 lg:text-center">
		<div class="flex flex-row items-center gap-3 lg:flex-col lg:gap-3">
			<ProfilePicture
				{src}
				{alt}
				sizes="(min-width: 1280px) 112px, (min-width: 1024px) 96px, 56px"
				class="size-14 lg:size-24 xl:size-28"
			/>
			<div class="flex flex-col gap-0 lg:items-center">
				<div class="flex flex-row items-center gap-2">
					<span class="text-lg font-bold lg:text-xl">{name}</span>
					{@render linkedinLink()}
				</div>
				<span class="text-sm opacity-70"
					>{role}<span class="opacity-80">{` · ${subrole}`}</span></span
				>
			</div>
		</div>
		<div class="flex flex-row flex-wrap items-center gap-1.5 lg:justify-center">
			{#each skills as skill (skill)}
				<Badge variant="default" class="text-[11px] lg:text-xs">{skill}</Badge>
			{/each}
		</div>
		{#if desc}
			<div
				class="text-xs leading-snug text-foreground/80 max-lg:line-clamp-3 lg:flex lg:flex-col lg:gap-2 lg:text-sm lg:leading-relaxed"
			>
				{@render desc()}
			</div>
			<!-- The compact card lives in a viewport-height overlay on the homepage, so the
			     full bio opens in a dialog rather than growing the card past the fold. -->
			<button
				type="button"
				onclick={() => bioDialog?.showModal()}
				class="self-start text-xs font-medium text-primary underline-offset-4 hover:underline lg:hidden"
				>Read more</button
			>
			<dialog
				bind:this={bioDialog}
				onclick={(e) => e.target === bioDialog && bioDialog?.close()}
				aria-label="About {name}"
				class="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-foreground/10 bg-background p-6 text-foreground shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
			>
				<div class="flex flex-col gap-4">
					<div class="flex items-center gap-3">
						<ProfilePicture {src} {alt} sizes="48px" class="size-12" />
						<div class="flex flex-col">
							<span class="text-lg font-bold">{name}</span>
							<span class="text-sm opacity-70">{role} · {subrole}</span>
						</div>
					</div>
					<div class="flex flex-col gap-3 text-sm leading-relaxed text-foreground/85">
						{@render desc()}
					</div>
					<button
						type="button"
						onclick={() => bioDialog?.close()}
						class="self-end rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/85"
						>Close</button
					>
				</div>
			</dialog>
		{/if}
	</div>
{:else}
	<div
		class="flex flex-row items-center gap-6 max-[600px]:flex-col md:max-w-2xl lg:max-w-3xl xl:max-w-4xl"
	>
		<ProfilePicture {src} {alt} sizes="192px" class="size-48" />
		<div class="flex flex-col items-start gap-3 text-left text-sm sm:text-base">
			<div class="flex flex-col items-start gap-0 max-[600px]:items-center">
				<div class="flex flex-row items-center gap-3">
					<span class="text-2xl font-bold max-[600px]:text-xl">{name}</span>
					{@render linkedinLink()}
				</div>
				<div
					class="flex flex-row items-end gap-2 max-[600px]:flex-col max-[600px]:items-center max-[600px]:gap-0"
				>
					<span class="text-xl opacity-70">{role}</span>
					<span class="mb-0.5 text-sm opacity-70">{subrole}</span>
				</div>
				<div class="mt-1 flex flex-row flex-wrap items-center gap-2 max-[600px]:justify-center">
					{#each skills as skill (skill)}
						<Badge variant="default" class="text-sm max-[600px]:text-xs">{skill}</Badge>
					{/each}
				</div>
			</div>
			{#if desc}{@render desc()}{/if}
		</div>
	</div>
{/if}
