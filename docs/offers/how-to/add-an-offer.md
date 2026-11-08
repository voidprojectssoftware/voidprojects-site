> **AI-generated, not yet reviewed.** This document was written by an AI assistant and has not been reviewed by a human.

# Add a prospect offer page

An offer is a private, unlisted page at `voidprojects.ai/o/<id>/`. Each one is a folder under `offers/`, built into `build/o/<id>/` by `scripts/build-offers.mjs` when `npm run build` runs. `offers/9p2by3s8x3x1l4jd60ci/` (First Touch Payment Solutions) is a working example. It uses `ConcernsList`, `PlanPicker`, `SignUpButton`, `QrCode`, `OfferGate`, and since it was accepted `AcceptedState` and `AcceptedPlan`, but not `AuditComparison` or add-ons; every block and the custom properties it reads are listed in `src/lib/offers/blocks/index.ts`.

## Why offers are not SvelteKit routes

SvelteKit lists every route path in `_app/immutable/entry/app.*.js`, which every visitor downloads, so an offer as a route would reveal every offer id. Instead each offer is its own small Svelte app: a server build renders its HTML, a client build hydrates it, and both are written only under `build/o/<id>/`. The main site's Tailwind skips `offers/` (`@source not` in `src/routes/layout.css`). The one other place an id appears is the API bundle (`build-api/`), which needs the offer data to price a sign-up.

Check it after a build: `grep -rl <id> build build-api` should list only `build/o/<id>/index.html` and `build-api/index.js`.

## Create the folder

1. Make a random id of at least 16 lowercase letters and digits:

   ```sh
   node -e "const c='abcdefghijklmnopqrstuvwxyz0123456789';console.log([...crypto.getRandomValues(new Uint8Array(20))].map(x=>c[x%36]).join(''))"
   ```

2. Create `offers/<id>/` with `offer.ts`, `page.svelte` and `theme.css`. The First Touch folder shows how they fit together; take its structure, not its content, which is that prospect's. A folder whose name starts with `_` is skipped, which suits a draft.
3. Edit `offer.ts`. The type is `OfferInput` in `src/lib/offers/offer.ts`:
   - `sent`: the date you send the link. `expires` defaults to 30 days later; set it to override.
   - Amounts are whole cents (`2500` is 25.00). `annual` defaults to 10 times `monthly`; set `annual: false` to sell monthly only, or omit `monthly` to sell annually only.
   - `addOns` are optional extras priced the same way. Add-ons that share a `group` (for example `group: 'Business email'`) are alternatives: `PlanPicker` shows them under the group's name as radio choices with a "None" choice, and `/api/offer-checkout` answers 400 to a sign-up that picks two from one group. Ungrouped add-ons stay checkboxes.
   - `contact` stays server side; it never reaches the page.
4. Run the SEO/AEO audit into the folder: `npm run audit:offer -- <their-site> <our-preview> --out offers/<id>/audit.json` (see [Run an offer audit](run-an-offer-audit.md)). The comparison block renders that file; without it the block says the measurements are on their way. Re-run it when the preview changes and commit the new file.
5. Theme the page in `theme.css` and `page.svelte`. The shared blocks in `src/lib/offers/blocks/` read the `--offer-*` custom properties listed in their `index.ts`, so set those to the prospect's colors. Tailwind is available and scans only the offer's own folder. The page title defaults to "Your new website, <prospect>"; a `<title>` in the page's `<svelte:head>` replaces it. Files in `offers/<id>/public/` are copied as they are into `build/o/<id>/`; reference them by a path built from `context.url` (for example `new URL('shots/home.webp', context.url).pathname`) so the id stays out of the page script.

## Build and preview

```sh
npm run build              # site, then every offer; prints expired offers
npm run preview:offers     # serves build/ on port 5281; sign-up needs STRIPE_SECRET_KEY (see configure-stripe.md)
```

Open `http://localhost:5281/o/<id>/`. `npm run preview` does not show offers: it serves only SvelteKit's output.

## When an offer is accepted

Once the prospect has subscribed, mark the offer accepted in its `offer.ts`, for example:

```ts
accepted: { on: '2026-11-06', planId: 'both-sites', interval: 'month' },
```

`on` is the date they subscribed, `planId` one of the offer's plans and `interval` one that plan is sold on; the build fails otherwise. Put no customer details or Stripe ids here: Stripe holds those.

Then rebuild and deploy. On an accepted offer:

- The page never shows the expired notice, and the build stops listing it as expired.
- `/api/offer-checkout` answers 409 for any new checkout, so a stale tab cannot start a second subscription.
- The `AcceptedState` block shows the accepted date, plan and price and a **Manage billing** button to the Customer Portal (`context.billingPortalUrl`, from `PUBLIC_STRIPE_PORTAL_URL`; without it, a billing email link). The `AcceptedPlan` block shows the plan's included items, the renewal line and a link to `/terms`.

The page decides what else changes. Check it with `acceptedPlan(offer)` (or `offer.accepted`): drop the `PlanPicker`, `SignUpButton` and `QrCode`, any prepay or expiry wording, and reword sentences that ask them to accept. The First Touch page shows both states in one file. Give it a `<title>` that says it is their plan, not a proposal.

## Expiry and clean-up

The page checks expiry in the visitor's browser, so a deployed page turns into the expired notice on time without a rebuild. Every build prints each expired offer with the date its prospect data must be gone by (90 days after `sent`). Delete the folder to remove the offer; the next deploy drops the page and its data from the API.

## Search engines

Offer pages carry `<meta name="robots" content="noindex, nofollow, noarchive">`, and `static/staticwebapp.config.json` adds the same `X-Robots-Tag` header on `/o/*`, with `Referrer-Policy: no-referrer` so following the preview link does not hand the offer URL to another site. Offers are never linked and are not in the sitemap, which lists only `PAGES` and blog posts.
