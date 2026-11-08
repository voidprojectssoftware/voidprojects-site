// Howard's Tinting (Atoka, TN): hosting and upkeep for the rebuilt site at
// howards-tinting-website.pages.dev. A draft: the leading "_" on this folder keeps it
// out of the build until the owner sets the price and `sent` (howards-tinting-website
// issue #8). Facts are from that repo at commit 1b6e233: docs/discovery/ and its
// 2026-11-06 baseline runs, cited per concern below.
import { defineOffer } from '$lib/offers/offer.js';

export default defineOffer({
	prospect: 'Howard’s Tinting', // the storefront sign's name, src/config/site.ts `site.name`
	// OWNER: set on the day the link is sent. `sent` is a required ISO date in OfferInput
	// (src/lib/offers/offer.ts), so this is a placeholder (the day the draft was written),
	// not a send date. Expiry (sent + 30 days) and the 90-day purge count from it.
	sent: '2026-11-06',
	previewUrl: 'https://howards-tinting-website.pages.dev',
	concerns: [
		{
			// docs/discovery/web-presence.md, "The old website: howardstinting.com (dead)": HTTP
			// 409 "error code: 1001", last working Wayback capture 2025-04-24, and Google,
			// Instagram, BBB, Birdeye and both Nextdoor pages still link to it.
			// docs/discovery/seo-audit/2026-11-06-baseline/notes.md, "What a visitor and a
			// crawler get": every address answers Cloudflare's "DNS resolution error" or fails TLS.
			title: 'Your website no longer opens',
			detail:
				'howardstinting.com shows an error page instead of your shop, and has since some time after April 24, 2025, the last day an archive recorded it working. Google, Instagram, BBB, Birdeye and Nextdoor all still send people there.',
			impact: 'Someone who taps “Website” on your Google listing finds an error, not your shop.'
		},
		{
			// docs/discovery/business-profile.md, "Hours (list every version, pick none)", and
			// open-questions.md item 6: seven versions (Google, Birdeye, eTrailer, two Nextdoor
			// pages, GrayTV Local, the old site's last footer). Saturday is closed (eTrailer,
			// Nextdoor 2, old site 2024 to 2025), 8 to 1 (Nextdoor 1, GrayTV) or 8 to 5 (Birdeye).
			title: 'Your hours say different things in different places',
			detail:
				'Seven places list your hours, your old website among them, and they do not agree. Saturday shows as closed, 8 to 1, or 8 to 5, depending on where someone looks.',
			impact: 'A customer cannot tell whether you are open on a Saturday.'
		},
		{
			// docs/discovery/aeo/2026-11-06-baseline/assistants/summary.md, "search-sonnet":
			// hours.saturday runs 1 to 3 each answer "Closed per the official site" (or
			// "Official site: closed"), citing https://www.howardstinting.com/.
			title: 'AI assistants repeat your old website’s hours',
			detail:
				'Asked about your shop, an assistant that searches the web gave Saturday as closed “per the official site” all three times, quoting the website that no longer opens.',
			impact: 'Whatever your old site last said is what people are told, right or wrong.'
		},
		{
			// docs/discovery/web-presence.md (DNS: nameservers at GoDaddy, www still pointing
			// at Net Driven) with open-questions.md item 2: "email for the domain is live on
			// Microsoft 365 behind Proofpoint, so any DNS change must keep the MX and TXT
			// records"; business-profile.md, "Email host".
			title: 'Your email depends on the same domain',
			detail:
				'Your howardstinting.com email is still live. It runs on the same domain settings as the website, so pointing the domain at a new site carelessly would stop your email.',
			impact: 'Mail sent to you could stop arriving.'
		}
	],
	plans: [
		{
			id: 'website',
			label: 'Your new website, hosted and looked after',
			summary: 'Hosting, security and upkeep for the new Howard’s Tinting website.', // also Stripe Checkout's line description
			// Each from the published terms, src/routes/terms/+page.svelte (/terms), by section
			// anchor: #what-you-get (first three lines), #who-owns-what (domain, files,
			// portfolio), #cancelling-and-refunds (two lines), #late-or-failed-payments and
			// #billing (late fees, renewal reminder).
			features: [
				'No build fee and no minimum term',
				'Hosting, security updates and routine upkeep for as long as you subscribe',
				'Small changes (text, photos, hours, prices) at no extra charge, within reason',
				'Your domain stays yours, and you can move it away from us any time',
				'Monthly: cancel any time, no cancellation fee',
				'Annual: full refund within 15 days of the first payment, less the domain’s registration fee',
				'Your site’s files are yours to take, free, for a year after you leave, to host anywhere',
				'No late fees, and a reminder about 14 days before each annual renewal',
				'In our portfolio only if you say yes'
			],
			// The owner, 2026-11-07: "lets put it at $50/month base". Annual defaults to
			// ANNUAL_MONTHS_CHARGED (10) x monthly: $500 a year.
			monthly: 5000
		}
	],
	// Optional add-ons, each priced here and only here (the checkout reads this file, never
	// the browser). Add-ons sharing a `group` are alternatives: the picker shows them as
	// radios with "None", and /api/offer-checkout refuses two from one group. No /terms
	// section covers email or a Google Business Profile, so no summary cites one.
	addOns: [
		{
			id: 'email-microsoft-365',
			group: 'Business email',
			label: 'Microsoft 365 Business Standard, one person',
			summary:
				'A Microsoft 365 business subscription for one person, with email at your own domain. We set it up and manage the subscription for you.',
			// OWNER: confirm price. Recommended $25/month (annual default 10 x: $250).
			// Cost basis: Microsoft 365 Business Standard per user per month, which could not be
			// checked on 2026-11-07 because microsoft.com refused the request ("Your request has
			// been blocked"), so it is unverified here: from memory, $12.50 on an annual
			// commitment, announced to rise to $14.00 on 2026-07-01, a few percent more when an
			// annual commitment is paid monthly, and more again on a monthly commitment.
			// The rest covers setup (MX, SPF, DKIM, DMARC on the domain) and looking after it.
			monthly: 2500
		},
		{
			id: 'email-mailbox-or-forwarding',
			group: 'Business email',
			label: 'One mailbox, or forwarding',
			summary:
				'One mailbox at your own domain, or addresses at your domain that forward to an inbox you already use. We set it up and keep it working.',
			// OWNER: confirm price. Recommended $10/month (annual default 10 x: $100).
			// Cost basis, each from the provider's own pricing page on 2026-11-07:
			// forwarding through Cloudflare Email Routing costs nothing (developers.cloudflare.com/
			// email-service/platform/pricing/, updated 2026-06-09: inbound "Unlimited" on Workers
			// Free and Paid; sending to verified destination addresses "free on all plans").
			// A mailbox: Zoho Mail Lite US$1 (5 GB) or US$1.25 (10 GB) per user per month, yearly
			// only, Mail Premium US$4 (zoho.com/mail/zohomail-pricing.html); Fastmail Standard
			// $5 per user per month billed annually, $6 monthly, own domain included
			// (fastmail.com/pricing/). Priced on the dearest of these, $6, plus setup and upkeep.
			monthly: 1000
		},
		{
			id: 'google-business-profile',
			label: 'Your Google Business Profile, looked after',
			summary:
				'We keep your Google listing’s hours, phone, website and photos up to date and matching your site, and make the changes you ask for.',
			// OWNER: confirm price. Recommended $20/month (annual default 10 x: $200).
			// Cost basis: the profile itself is free ("Yes, creating a Business Profile and
			// listing your business on Google is free", business.google.com/us/business-profile/,
			// 2026-11-07), so this is our time alone: an estimate, not a sourced figure, of
			// under an hour a month for routine edits once the profile is claimed and we are a
			// manager on it.
			monthly: 2000
		}
	],
	// Figures: figures.json beside this file, computed by figures.mjs from
	// howards-tinting-website's committed runs with that repo's own comparison code, so the
	// page shows what its /site-comparison/ page shows (issue #8, part 2).
	contact: {
		name: 'Chris Howard',
		email: 'chris@howardstinting.com', // howards-tinting-website src/config/site.ts `site.email`, labelled Supplied
		phone: '(901) 406-8259', // src/config/site.ts `site.phone.display`, confirmed
		note: 'Chris Howard is the name on Instagram, the old site and the email address; BBB names Phillip Howard as owner. Who approves the site is open question 3 in docs/discovery/open-questions.md. The email is from the old site (2014 to 2025) and Nextdoor; no 2025-or-later first-party source shows it (open question 7), so confirm the best address on first contact.'
	}
});
