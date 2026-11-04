<script lang="ts">
	import './theme.css';
	import {
		AuditComparison,
		ConcernsList,
		OfferGate,
		PlanPicker,
		QrCode,
		SignUpButton,
		initialSelection
	} from '$lib/offers/blocks/index.js';
	import { formatDate } from '$lib/offers/offer.js';
	import type { OfferPageProps } from '$lib/offers/page.js';

	let { offer, audit, context }: OfferPageProps = $props();

	// svelte-ignore state_referenced_locally
	let selection = $state(initialSelection(offer));
</script>

<main class="mx-auto grid max-w-4xl gap-14 px-4 py-12 sm:px-8 sm:py-16">
	<OfferGate {offer} builtAt={context.builtAt}>
		<header class="grid gap-4">
			<p class="text-sm font-semibold tracking-wide text-(--offer-accent) uppercase">
				Prepared for {offer.prospect}
			</p>
			<h1 class="text-4xl leading-tight font-bold sm:text-5xl">Your new website is ready to see</h1>
			<p class="max-w-2xl text-lg text-(--offer-muted)">
				We rebuilt your site so it loads fast, shows up in search and AI answers, and takes
				bookings. Have a look, then pick the plan that suits you.
			</p>
			<a
				class="w-fit rounded-(--offer-radius) border border-(--offer-border) bg-(--offer-surface) px-5 py-3 font-semibold text-(--offer-accent) underline-offset-4 hover:underline"
				href={offer.previewUrl}
				rel="noreferrer">Open the preview</a
			>
		</header>

		<ConcernsList concerns={offer.concerns} />
		<AuditComparison {audit} />

		<section class="grid gap-8" aria-label="Sign up">
			<PlanPicker {offer} bind:selection />
			<div class="grid items-center gap-8 sm:grid-cols-[1fr_auto]">
				<SignUpButton offerId={offer.id} {selection} endpoint={context.checkoutEndpoint}
					>Sign up securely</SignUpButton
				>
				<QrCode qr={context.qr} url={context.url} />
			</div>
		</section>
	</OfferGate>

	<footer class="border-t border-(--offer-border) pt-6 text-sm text-(--offer-muted)">
		Offer open through {formatDate(offer.expires)}. Made by Void Projects.
	</footer>
</main>
