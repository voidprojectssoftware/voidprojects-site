// Aunt Mimi's Cake Pops & More (Bartlett, TN): a first website, hosted and looked after,
// at auntmimiscakepops-website.pages.dev. A `_` draft (auntmimiscakepops-website issue
// #10), never built. A greenfield build: the business has no website and no domain, only
// a Facebook page, an Instagram profile and an unclaimed Google Maps listing (client
// docs/discovery/business-profile.md, "Contact"). Facts are from that repo at main
// `1838d12`: docs/discovery/ and the before side of client ADR 0012 in
// docs/discovery/aeo/2026-11-09-baseline/ (the key now 40 facts, 36 scored for
// assistants), cited per concern below. No
// concern scores a site, because there is none (ADR 0012, "No site score is recorded for
// the before side").
import { defineOffer, type OfferInput } from '$lib/offers/offer.js';

// `sent` is left out on purpose: it is the day the owner sends the link. OfferInput on
// main still requires it, so this folder types itself as OfferInput without `sent` and
// casts once, as PRs #107 and #108 do. When the owner sets `sent`, drop the Omit and the
// cast.
const draft = {
	prospect: 'Aunt Mimi’s Cake Pops & More', // business-profile.md, "Name in the Facebook intro" and "Name on Google" (FB, GMAPS), evidenced
	// sent: not set (see above).
	previewUrl: 'https://auntmimiscakepops-website.pages.dev', // client astro.config.mjs `site`. No Pages project exists yet (client #8, an owner gate), so this does not resolve until it does
	concerns: [
		{
			// docs/discovery/aeo/2026-11-09-baseline/search-observed.md, "In short" and "The
			// results": four searches, 73 results, the business in none of them, including its
			// own name in two spellings; other Bartlett bakeries and wedding directories rank
			// instead. business-profile.md, "Contact": no website, no domain.
			title: 'Someone searching for cake pops in Bartlett does not find you',
			detail:
				'You have no website, so a search has nothing of yours to show. We tried four searches a customer might type, including “cake pops Bartlett TN” and your own name. You were in none of the 73 results. Other Bartlett bakeries came up instead.',
			impact:
				'A customer who has not already met you at the shop or the truck has no way to find you, and the ones who search for you by name land on someone else.'
		},
		{
			// docs/discovery/aeo/2026-11-09-baseline/assistants/result.json and summary.md (run
			// at 62840a2): memory-opus, memory-sonnet, memory-haiku each recalled 0 of 36 facts
			// in 3 runs; search-sonnet recalled 8.3 of 36 (address, ZIP, one phone number, custom
			// cakes, banana pudding, strawberry shortcake, the truck once, Facebook, Instagram)
			// and no flavor, price or way to order (no flavors.*, price.* or order.message).
			// docs/discovery/baseline-2026-11-09.md, "In short".
			title: 'AI assistants cannot tell anyone about you',
			detail:
				'More people now ask an AI assistant where to get a custom cake. We asked three of Anthropic’s Claude assistants about Aunt Mimi’s by name and town. From what they already knew, they could not answer a single question about you. One allowed to search the web found your address and your Facebook page, but not one flavor, not one price, and not how to order.',
			impact:
				'When someone asks an assistant for cake pops near Bartlett, it has nothing about you to tell them.'
		},
		{
			// docs/discovery/aeo/2026-11-09-baseline/presence/result.json: anywhere.photoOnly
			// is 13 of 40 (all 8 flavors, price.each, price.dozen, products.ice-cream,
			// products.banana-pudding, products.strawberry-shortcake); sources.FB.text is 10 of
			// 40 with 18 photo-only. The detail names the first eleven, a true subset. menu.md: the flavor card and
			// the prices are read off photos. baseline-2026-11-09.md, "Where each fact can be
			// read today".
			title: 'Your flavors and prices are only in photos',
			detail:
				'Every cake pop flavor, both cake pop prices and your ice cream appear only inside pictures: the printed flavor card, the menu screen, the price stickers. A person looking at the photo can read them. A search engine or an assistant cannot.',
			impact:
				'The things a customer most wants to know before they come in are the ones no search can find.'
		},
		{
			// business-profile.md, "Two phone numbers are in public use. Pick none.": Phone A
			// (901) 832-5356 on Facebook, the truck and the truck post; Phone B (901) 236-7897
			// on Google, the storefront sign and the Halloween flyer. baseline-2026-11-09.md:
			// the search assistant only ever found 832-5356, never the shop sign's number.
			title: 'Two phone numbers, and nothing says which is which',
			detail:
				'Your Facebook page and the truck show one number, and your shop sign, your Google listing and your flyer show another. Nowhere online says which one is the shop and which one books the truck.',
			impact:
				'A customer may call the truck line about a cake order, or the shop about booking the truck, and the assistant that searched the web only ever found one of them.'
		},
		{
			// business-profile.md, "Hours (none current and complete)": Google showed only
			// "Closed · Opens 11 AM Tue", Facebook "Closed now" with no times; no post states
			// weekly hours. baseline-2026-11-09.md: regular weekly hours are among the facts no
			// public source states; open-questions.md asks.
			title: 'Nobody can find out when you are open',
			detail:
				'Your weekly hours are not written anywhere online. Google shows only the next time you open, and Facebook shows “Closed now” with no times.',
			impact:
				'A customer who cannot tell whether you are open may not make the trip. A website is where your hours, and where the truck will be, can live.'
		}
	],
	plans: [
		{
			id: 'website',
			label: 'Your first website, hosted and looked after',
			summary: 'Hosting, security and upkeep for the new Aunt Mimi’s Cake Pops & More website.', // also Stripe Checkout's line description
			// Each from the published terms, src/routes/terms/+page.svelte (/terms), by section
			// anchor, the same lines as #107 and #108: #what-you-get (first three lines),
			// #who-owns-what (domain, files, portfolio), #cancelling-and-refunds (two lines),
			// #late-or-failed-payments and #billing (late fees, renewal reminder).
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
			// OWNER: price not set. PLACEHOLDER $25/month: the static tier on the owner's
			// prospect sheet (website-prospects-sales-list.xlsx, Aunt Mimi's row, "$25/mo") and
			// PRICING in src/lib/content/websites.ts ("$25/m ... for a static site"). Annual
			// defaults to ANNUAL_MONTHS_CHARGED (10) x monthly: $250 a year. No setup fee: the
			// offer model has none and /terms #what-you-get says "no build fee". An online
			// store is the sheet's $100+ tier upgrade; the offer model has no upgrade slot, so
			// it is not here (see the PR body).
			monthly: 2500
		}
	],
	// Optional add-ons, each priced here and only here (the checkout reads this file, never
	// the browser). The three the prospect sheet lists for this row: domain registration,
	// business email on the new domain, Google Business Profile.
	addOns: [
		{
			id: 'domain',
			label: 'A domain of your own, registered for you',
			summary:
				'You have no web address of your own yet. We register one in your name, point it at your new site and renew it for you. It stays yours.',
			// OWNER: price not set. PLACEHOLDER $1/month ($10/year by the 10x default), a guess
			// at a .com at cost, not a sourced figure. /terms #who-owns-what: "If you don't
			// already have a domain, we register one in your name ... We charge you for it at
			// the registrar's price, unless your plan says the domain is included". Discovery:
			// auntmimiscakepops.com and auntmimiscakepopsandmore.com are unregistered (RDAP
			// 404), auntmimis.com belongs to someone else (business-profile.md, "Domain"). Which
			// name is the business's choice. The site cannot launch on its own address without
			// one, so the owner may prefer to fold this into the plan.
			monthly: 100
		},
		{
			id: 'email-mailbox-or-forwarding',
			group: 'Email at your own domain',
			label: 'One mailbox, or forwarding',
			summary:
				'One mailbox at your own domain, or addresses at your domain that forward to an inbox you already use. We set it up and keep it working.',
			// OWNER: price not set; PLACEHOLDER $10/month, Howard's (offers/orebabrmoseow8vsknfk,
			// with its cost basis). No email address for the business is known at all
			// (baseline-2026-11-09.md: "an email address" is among the facts no source states).
			monthly: 1000
		},
		{
			id: 'email-microsoft-365',
			group: 'Email at your own domain',
			label: 'Microsoft 365 Business Standard',
			summary:
				'A Microsoft 365 business subscription for each person you choose, each with email at your own domain. Priced per person. We set it up and manage the subscription for you.',
			// OWNER: price not set; PLACEHOLDER $25 per person per month, Howard's, cap 25
			// unchanged: no ledger source gives a headcount (business-profile.md, "Staff": not
			// named, no names recorded).
			monthly: 2500,
			seats: { min: 1, max: 25, default: 1, unit: 'person', units: 'people' }
		},
		{
			id: 'google-business-profile',
			label: 'Your Google Business Profile, looked after',
			summary:
				'Your Google listing is there, but not yet claimed by you. Once you claim it (Google asks the business itself to verify) and add us as a manager, we keep its hours, phone numbers, website and photos matching your site, and make the changes you ask for.',
			// OWNER: price not set; PLACEHOLDER $20/month, Howard's. The listing exists and
			// shows "Claim this business" (business-profile.md, "Name on Google", GMAPS), so
			// this says "looked after", not "set up", and names the one step only they can take.
			monthly: 2000
		}
	],
	// Figures: figures.json beside this file, copied by figures.mjs from the client's
	// docs/discovery/site-comparison/figures.json (client main 1838d12), which the code its
	// /site-comparison/ page runs writes.
	contact: {
		name: 'Aunt Mimi’s Cake Pops & More (owner known publicly only as “Mimi”)', // client docs/discovery/aeo/2026-11-09-baseline/method.md: the business publishes "Mimi" only
		phone: '(901) 236-7897', // business-profile.md Phone B: the storefront sign, Google, the Halloween flyer; evidenced
		note: 'Nothing has been confirmed with the business, and it has not been contacted. Two numbers are in public use and nothing says which is which (business-profile.md): (901) 236-7897 on the shop sign, Google and the flyer, and (901) 832-5356 on Facebook (labelled Mobile), the truck and the truck post (truck bookings). No email address is known. The shop is at 2746 Bartlett Blvd, Bartlett, TN. Confirm the best number and an email on first contact.'
	}
} satisfies Omit<OfferInput, 'sent'>;

export default defineOffer(draft as OfferInput);
