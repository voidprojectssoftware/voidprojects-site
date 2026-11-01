// Cloudflare Turnstile for the contact form: the keys Cloudflare publishes for testing,
// and the server-side token check (siteverify) behind /api/contact. No real key lives in
// this repo: the site key is build config (PUBLIC_TURNSTILE_SITE_KEY) and the secret is
// the TURNSTILE_SECRET_KEY app setting, both managed in voidprojects-site-infra.
// https://developers.cloudflare.com/turnstile/troubleshooting/testing/

export const TURNSTILE_TEST_KEYS = {
	siteKeyPass: '1x00000000000000000000AA', // visible widget, always passes
	secretPass: '1x0000000000000000000000000000000AA', // every token verifies
	secretFail: '2x0000000000000000000000000000000AA', // every token is rejected
	token: 'XXXX.DUMMY.TOKEN.XXXX' // what a test site key hands out; production secrets reject it
} as const;

export const TURNSTILE_SCRIPT_URL =
	'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SITEVERIFY_TIMEOUT_MS = 10_000;

export const MAX_TOKEN_LENGTH = 2048; // Cloudflare's documented upper bound

// 'unavailable' means the check could not run (no secret, or siteverify unreachable);
// the caller fails closed.
export type TurnstileResult = 'ok' | 'rejected' | 'unavailable';
export type VerifyTurnstile = (token: string) => Promise<TurnstileResult>;

export function isTestSecret(secret: string): boolean {
	return /^[123]x0+AA$/.test(secret);
}

export function siteverify(secret: string, fetchFn: typeof fetch = fetch): VerifyTurnstile {
	return async (token) => {
		try {
			const res = await fetchFn(SITEVERIFY_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ secret, response: token }),
				signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS)
			});
			if (!res.ok) return 'unavailable';
			const data = (await res.json()) as { success?: unknown };
			return data.success === true ? 'ok' : 'rejected';
		} catch {
			return 'unavailable';
		}
	};
}

/**
 * Picks the verifier once per process from `TURNSTILE_SECRET_KEY`. Without a secret
 * every browser submission is refused (fail closed); `warning` says why, never the value.
 */
export function turnstileFromEnv(env: Record<string, string | undefined>): {
	verify: VerifyTurnstile;
	warning?: string;
} {
	const secret = env.TURNSTILE_SECRET_KEY?.trim();
	if (!secret) {
		return {
			verify: async () => 'unavailable',
			warning: '[contact] TURNSTILE_SECRET_KEY not set; form submissions are refused (503)'
		};
	}
	return {
		verify: siteverify(secret),
		warning: isTestSecret(secret)
			? '[contact] TURNSTILE_SECRET_KEY is a Cloudflare test key; tokens are not really checked'
			: undefined
	};
}
