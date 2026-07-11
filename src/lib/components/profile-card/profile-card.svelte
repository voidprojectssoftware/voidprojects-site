<script lang="ts">
	import type { Snippet } from 'svelte';
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
		desc
	}: {
		src: string;
		alt: string;
		name: string;
		role: string;
		subrole: string;
		skills: string[];
		email: string;
		linkedin?: string;
		desc?: Snippet;
	} = $props();
</script>

<div
	class="flex flex-row items-center gap-6 max-[600px]:flex-col md:max-w-2xl lg:max-w-3xl xl:max-w-4xl"
>
	<ProfilePicture {src} {alt} class="size-48" />
	<div class="flex flex-col items-start gap-3 text-left text-sm sm:text-base">
		<div class="flex flex-col items-start gap-0 max-[600px]:items-center">
			<div class="flex flex-row items-center gap-3">
				<span class="text-2xl font-bold max-[600px]:text-xl">{name}</span>
				{#if linkedin}
					<a
						href={linkedin}
						target="_blank"
						rel="noopener noreferrer"
						aria-label="{name} on LinkedIn"
						class="text-foreground/50 transition-colors hover:text-[#0A66C2]"
					>
						<svg
							role="img"
							viewBox="0 0 24 24"
							fill="currentColor"
							class="size-5"
							aria-hidden="true"
						>
							<path
								d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
							/>
						</svg>
					</a>
				{/if}
			</div>
			<div
				class="flex flex-row items-end gap-2 max-[600px]:flex-col max-[600px]:items-center max-[600px]:gap-0"
			>
				<span class="text-xl opacity-70">{role}</span>
				<span class="mb-0.5 text-sm opacity-70">{subrole}</span>
			</div>
			<div class="mt-1 flex flex-row flex-wrap items-center gap-2 max-[600px]:justify-center">
				{#each skills as skill}
					<Badge variant="default" class="text-sm max-[600px]:text-xs">{skill}</Badge>
				{/each}
			</div>
		</div>
		{#if desc}{@render desc()}{/if}
	</div>
</div>
