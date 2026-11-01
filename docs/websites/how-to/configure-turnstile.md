> **AI-generated, not yet reviewed.** This document was written by an AI assistant and has not been reviewed by a human.

# Configure Turnstile for the contact form

The contact form on `/websites` and `/websites/causes` carries a Cloudflare Turnstile widget. `/api/contact` checks its token with Cloudflare's siteverify before it sends any email. Every request without a token takes the agent path documented in `/llms.txt`: agents are asked to name themselves in an `agent` field, but older ones that do not are accepted too. That path skips Turnstile and gets stricter rate limits and an `[agent]` subject tag.

## The keys

| Setting                     | Where                                                   | Secret? |
| --------------------------- | ------------------------------------------------------- | ------- |
| `PUBLIC_TURNSTILE_SITE_KEY` | Environment of `npm run build` (inlined into the pages) | No      |
| `TURNSTILE_SECRET_KEY`      | Static Web App app setting (read by the function)       | Yes     |

Both come from one Turnstile widget in Cloudflare, whose allowed hostnames must include `voidprojects.ai` (plus any preview hostname that should accept the form). They are managed in `voidprojects-site-infra`; settings set by hand are overwritten by the next apply.

## What happens when a key is missing

- No `PUBLIC_TURNSTILE_SITE_KEY` at build: the build prints a warning and uses Cloudflare's always-pass test site key. Its tokens are rejected by a real secret, so the form shows its error and mailto fallback until the site is rebuilt with the key.
- No `TURNSTILE_SECRET_KEY` on the function: every form submission is refused with `503` and the form shows its error and mailto fallback (fail closed). The function logs `[contact] TURNSTILE_SECRET_KEY not set; form submissions are refused (503)` once per instance. The agent path keeps working.
- A Cloudflare test secret on the function: it logs a warning that tokens are not really checked.

## Local development

`npm run dev` needs no keys. Pages use the always-pass test site key, and the dev middleware verifies tokens against Cloudflare's siteverify with the always-pass test secret (`1x0000000000000000000000000000000AA`). To see the rejected path, start the dev server with `TURNSTILE_SECRET_KEY=2x0000000000000000000000000000000AA` (always fails). See [Cloudflare's testing keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).

## Rate limits

Limits live in `CONTACT_RATE_LIMITS` (`src/lib/contact/contact-http.ts`) and `/llms.txt` reads them from there. They are kept in memory per function instance, so they bound a flood rather than count exactly. The agent path has a global cap because anyone can claim to be an agent and rotate IP addresses; using it all up only closes the agent path for the hour, never the form.
