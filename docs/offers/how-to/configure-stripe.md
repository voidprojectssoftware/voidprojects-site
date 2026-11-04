> **AI-generated, not yet reviewed.** This document was written by an AI assistant and has not been reviewed by a human.

# Configure Stripe for offer sign-up

The sign-up button on an offer page posts the chosen plan, interval and add-on ids to `/api/offer-checkout`. The function prices them from the offer's own data (`offers/<id>/offer.ts`, bundled into the API), creates a Stripe Checkout Session and answers with its `url`. Nothing the browser sends sets an amount, currency or label.

After payment Stripe sends the customer to `/thanks?session_id=...`. That page is one generic SvelteKit page (no offer id in it). Its questions box posts the session id and message to `/api/offer-question`, which reads the session back from Stripe to get the offer id, the customer's name and email, and the Business name field, then sends the message through the contact form's email delivery.

## App setting

| Setting             | Value                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `STRIPE_SECRET_KEY` | Secret key (`sk_test_...` first, `sk_live_...` at launch), as a Static Web Apps application setting. Never in the repo or the build. |

Without it both endpoints answer 503 and the Functions log gets one warning per instance: `[stripe] STRIPE_SECRET_KEY not set; offer sign-up and questions answer 503`. Request bodies are never logged. The questions box also needs the contact email settings (`ACS_CONNECTION_STRING`, `CONTACT_FROM`, `CONTACT_TO`).

## Stripe dashboard prerequisites

The session asks for these, and Stripe refuses to create it if they are missing:

- **Stripe Tax** active, with a head office address (`automatic_tax` is on and prices are tax exclusive).
- **Terms of service URL** in the public business details (`https://voidprojects.ai/terms`), because the session requires terms consent.
- **Customer Portal** configured. Copy its login link (`https://billing.stripe.com/p/login/...`) into `BILLING_PORTAL_URL` in `src/lib/offers/stripe.ts`; until then the thank-you page offers email for billing changes.

## Try it locally in test mode

```sh
npm run build
STRIPE_SECRET_KEY=sk_test_... npm run preview:offers
```

Open `http://localhost:5281/o/<id>/` and sign up with a Stripe test card. Checkout returns to `http://localhost:5281/thanks?session_id=...`, and a question sent from there is printed to the terminal instead of emailed. The preview refuses a key that is not a test key.

## What a session contains

The exact create parameters are pinned in `src/lib/offers/__snapshots__/checkout-http.test.ts.snap` (`npm test`). Metadata `offer_id`, `plan`, `interval` and `add_ons` is set on both the session and the subscription.
