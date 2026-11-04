> **AI-generated, not yet reviewed.** This document was written by an AI assistant and has not been reviewed by a human.

# Configure Stripe for offer sign-up

The sign-up button on an offer page posts the chosen plan, interval and add-on ids to `/api/offer-checkout`. The function prices them from the offer's own data (`offers/<id>/offer.ts`, bundled into the API), creates a Stripe Checkout Session and answers with its `url`. Nothing the browser sends sets an amount, currency or label.

After payment Stripe sends the customer to `/thanks?session_id=...`. That page is one generic SvelteKit page (no offer id in it). Its questions box posts the session id and message to `/api/offer-question`, which reads the session back from Stripe to get the offer id, the customer's name and email, and the Business name field, then sends the message through the contact form's email delivery.

## App setting

| Setting             | Value                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `STRIPE_SECRET_KEY` | Secret key (`sk_test_...` first, `sk_live_...` at launch), as a Static Web Apps application setting. Never in the repo or the build. |

Without it both endpoints answer 503 and the Functions log gets one warning per instance: `[stripe] STRIPE_SECRET_KEY not set; offer sign-up and questions answer 503`. Request bodies are never logged. The questions box also needs the contact email settings (`ACS_CONNECTION_STRING`, `CONTACT_FROM`, `CONTACT_TO`).

| Build variable             | Value                                                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PUBLIC_STRIPE_PORTAL_URL` | The Customer Portal login link that `npm run stripe-setup` prints (`https://billing.stripe.com/p/login/...`). Public, not a secret. Read when the site builds; test and live links differ. |

The thank-you page shows a **Manage billing** link to that URL. Unset or blank, it offers email for billing changes instead. A value that is not an `https` URL fails the build (`billingPortalUrl` in `src/lib/offers/stripe.ts`, read by `src/routes/thanks/+page.server.ts`). For the deployed site, set it the way `PUBLIC_CF_ANALYTICS_TOKEN` is set (see [configure web analytics](../../websites/how-to/configure-web-analytics.md)): a repository variable `STRIPE_PORTAL_URL` in `voidprojects-site-infra`, passed to the build step as `PUBLIC_STRIPE_PORTAL_URL: ${{ vars.STRIPE_PORTAL_URL }}`. To check a build locally: `PUBLIC_STRIPE_PORTAL_URL=https://billing.stripe.com/p/login/test_... npm run build`, then `grep -o 'billing.stripe.com[^"]*' build/thanks.html`.

## Set up the Stripe account from code

`scripts/stripe-setup.mjs` (`npm run stripe-setup`) brings the account to the state the checkout needs. The desired state is the `DESIRED` object at the top of the script:

- **Stripe Tax settings**: head office address 501 Union St Ste 545 PMB 834400, Nashville, TN 37219-1876, US, and default tax behavior `exclusive` (the checkout sends prices tax exclusive). Stripe does not let a set value be removed, only changed.
- **Customer Portal configuration**: headline, privacy policy URL `https://voidprojects.ai/privacy`, terms URL `https://voidprojects.ai/terms`; invoice history, payment method update and customer update (email, address, phone, name, tax id) on; cancellation on, at period end, with reasons collected; subscription update and pause off; the hosted login page on.

It reads what is there first and changes only what differs, so a second run changes nothing. The portal configuration it manages carries the metadata `managed_by: voidprojects-site/scripts/stripe-setup.mjs`; without one so tagged, it adopts the default configuration, and without any it creates one. The first configuration in an account becomes the default; the API cannot make an existing one the default (only the Dashboard can), and the login link works either way.

It never creates tax registrations (where to register is an accountant's decision); it prints the current ones. It ends with the login link to use as `PUBLIC_STRIPE_PORTAL_URL` and the list of dashboard-only steps below.

### Test mode

```sh
STRIPE_SECRET_KEY=sk_test_... npm run stripe-setup -- --dry-run   # show the plan only
STRIPE_SECRET_KEY=sk_test_... npm run stripe-setup
```

### Live mode

```sh
STRIPE_SECRET_KEY=sk_live_... npm run stripe-setup -- --live --dry-run
STRIPE_SECRET_KEY=sk_live_... npm run stripe-setup -- --live
```

Without `--live` the script refuses a live key, and with `--live` it refuses a test key. A live run prints its plan and asks you to type `yes` before changing anything (`--yes` skips the question, for a run without a terminal). Live mode has its own portal configuration and login link, so set the live link as `PUBLIC_STRIPE_PORTAL_URL` for the production build.

## Dashboard-only steps

Stripe's API cannot set these for a platform's own account. `POST /v1/accounts/{id}` updates connected accounts only; the reference says "To update your own account, use the Dashboard". Do each in test mode (sandbox) and again in live mode.

1. **Terms of service URL** (Checkout's `consent_collection.terms_of_service: 'required'` needs a valid one): **Settings > Business > Public details** (`https://dashboard.stripe.com/settings/public`), set the terms of service URL to `https://voidprojects.ai/terms`. Also review the public business name, support email and website there.
2. **Branding** (Checkout, the portal and Stripe's emails): **Settings > Business > Branding** (`https://dashboard.stripe.com/settings/branding`): icon, logo, brand and accent colors.
3. **Custom domain `pay.voidprojects.ai`** (Checkout, Payment Links and the portal; a paid feature, not available in sandboxes): **Settings > Business > Custom domains** (`https://dashboard.stripe.com/settings/custom-domains`) > **Add your domain**. Then add the DNS records it shows: a CNAME `pay` to `hosted-checkout.stripecdn.com` and a TXT `_acme-challenge.pay` with the value from **View instructions**. Once active, the portal login link changes host, so update `PUBLIC_STRIPE_PORTAL_URL` (rerun the script to print it).
4. **Smart Retries, cancel after 30 days**: **Billing > Revenue recovery > Retries** (`https://dashboard.stripe.com/revenue_recovery/retries`): Smart Retries on with a 1 month policy, and **Cancel the subscription** when all retries fail.
5. **Failed payment emails**: **Billing > Revenue recovery > Emails** (`https://dashboard.stripe.com/revenue_recovery/emails`): turn on **Send emails when card payments fail**, and **Send emails about expiring cards**.
6. **Renewal reminder emails**: **Settings > Billing > Subscriptions and emails** (`https://dashboard.stripe.com/settings/billing/automatic`), under **Email notifications and customer management**, turn on **Send emails about upcoming renewals**; the lead time is under **Prevent failed payments > Upcoming renewal events**. Set the emails' customer link to the Stripe-hosted Customer Portal on the same page.
7. **Default portal configuration**, only if the account already had a default before the script ran: **Settings > Billing > Customer portal** (`https://dashboard.stripe.com/settings/billing/portal`) edits the default. The script adopts an existing default rather than adding a second configuration, so this is normally not needed.

## Try it locally in test mode

```sh
npm run build
STRIPE_SECRET_KEY=sk_test_... npm run preview:offers
```

Open `http://localhost:5281/o/<id>/` and sign up with a Stripe test card. Checkout returns to `http://localhost:5281/thanks?session_id=...`, and a question sent from there is printed to the terminal instead of emailed. The preview refuses a key that is not a test key.

## What a session contains

The exact create parameters are pinned in `src/lib/offers/__snapshots__/checkout-http.test.ts.snap` (`npm test`). Metadata `offer_id`, `plan`, `interval` and `add_ons` is set on both the session and the subscription.
