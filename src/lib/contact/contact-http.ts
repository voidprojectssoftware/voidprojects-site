// The /api/contact contract, shared by the Azure Function (api/) and the Vite dev
// middleware so local dev validates and answers exactly as production does.
import { CONTACT_KINDS, type ContactKind } from '$lib/content/websites.js';
import { RateLimiter, rateKeyForIp, type RateRule } from './rate-limit.js';
import { MAX_TOKEN_LENGTH, type VerifyTurnstile } from './turnstile.js';

export interface ContactSubmission {
	name: string;
	email: string;
	kind: ContactKind;
	message: string;
	agent?: string; // set on the agent path: the assistant's self-reported name, unverified
}

export interface ContactRequest {
	contentType: string | null;
	body: string;
	clientIp: string; // best effort and spoofable; see CONTACT_RATE_LIMITS
}

export interface ContactResponse {
	status: number;
	headers: Record<string, string>;
	body: string;
}

// Where an accepted submission goes. A rejection becomes a 502 so the form shows
// its error state and the mailto fallback.
export type Deliver = (submission: ContactSubmission) => Promise<void>;

export const MAX_BODY_BYTES = 16 * 1024;

export const LIMITS = { name: 200, email: 320, message: 5000, agent: 100 };

// The browser form proves a person with Turnstile; the agent path (an `agent` field,
// documented in /llms.txt) skips it, so anyone can claim to be an agent. Its limits
// are what make that claim worthless to a spammer: a per-IP cap, and a global cap that
// holds however many IPs a flood rotates through. Exhausting the global cap only
// closes the agent path for the hour; the form and email keep working. Agent mail is
// also tagged in the subject so it can be filtered.
export const CONTACT_RATE_LIMITS = {
	formPerIp: { limit: 10, windowMs: 60 * 60_000 },
	agentPerIp: { limit: 3, windowMs: 60 * 60_000 },
	agentGlobal: { limit: 20, windowMs: 60 * 60_000 }
} satisfies Record<string, RateRule>;

export type ContactLimiters = Record<keyof typeof CONTACT_RATE_LIMITS, RateLimiter>;

export function contactLimiters(
	rules: Record<keyof typeof CONTACT_RATE_LIMITS, RateRule> = CONTACT_RATE_LIMITS
): ContactLimiters {
	return {
		formPerIp: new RateLimiter(rules.formPerIp),
		agentPerIp: new RateLimiter(rules.agentPerIp),
		agentGlobal: new RateLimiter(rules.agentGlobal)
	};
}

export interface ContactDeps {
	deliver: Deliver;
	verify: VerifyTurnstile;
	limiters: ContactLimiters;
	now?: () => number;
}
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SUCCESS = { ok: true };

function json(
	status: number,
	payload: unknown,
	extraHeaders: Record<string, string> = {}
): ContactResponse {
	return {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
			'X-Content-Type-Options': 'nosniff',
			...extraHeaders
		},
		body: JSON.stringify(payload)
	};
}

function tooMany(retryAfter: number, error: string): ContactResponse {
	return json(429, { error }, { 'Retry-After': String(retryAfter) });
}

function text(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

export function validateContact(
	input: unknown
): { submission: ContactSubmission } | { error: string } {
	if (typeof input !== 'object' || input === null || Array.isArray(input)) {
		return { error: 'Body must be a JSON object.' };
	}
	const raw = input as Record<string, unknown>;
	const name = text(raw.name);
	const email = text(raw.email);
	const kind = text(raw.kind);
	const message = text(raw.message);

	if (!name) return { error: 'Name is required.' };
	if (name.length > LIMITS.name)
		return { error: `Name must be at most ${LIMITS.name} characters.` };
	if (!email) return { error: 'Email is required.' };
	if (email.length > LIMITS.email || !EMAIL_SHAPE.test(email)) {
		return { error: 'Email does not look like an email address.' };
	}
	if (!(CONTACT_KINDS as readonly string[]).includes(kind)) {
		return { error: `Kind must be one of: ${CONTACT_KINDS.join(', ')}.` };
	}
	if (!message) return { error: 'Message is required.' };
	if (message.length > LIMITS.message) {
		return { error: `Message must be at most ${LIMITS.message} characters.` };
	}
	return { submission: { name, email, kind: kind as ContactKind, message } };
}

// `website` is a honeypot hidden from people; a bot that fills it gets the same
// success body and nothing is delivered. A non-empty `agent` field selects the agent
// path (no Turnstile, stricter limits); anything else needs a `turnstileToken`.
export async function contactResponse(
	request: ContactRequest,
	deps: ContactDeps
): Promise<ContactResponse> {
	const { contentType, body } = request;
	if (!contentType?.toLowerCase().startsWith('application/json')) {
		return json(415, { error: 'Content-Type must be application/json.' });
	}
	if (body.length > MAX_BODY_BYTES) return json(413, { error: 'Request body is too large.' });

	let input: unknown;
	try {
		input = JSON.parse(body);
	} catch {
		return json(400, { error: 'Body is not valid JSON.' });
	}
	if (
		typeof input === 'object' &&
		input !== null &&
		text((input as { website?: unknown }).website)
	) {
		return json(200, SUCCESS);
	}

	const result = validateContact(input);
	if ('error' in result) return json(400, { error: result.error });
	const raw = input as Record<string, unknown>;
	const agent = text(raw.agent);
	const now = deps.now?.() ?? Date.now();
	const ipKey = rateKeyForIp(request.clientIp);
	const { limiters } = deps;

	if (agent) {
		if (agent.length > LIMITS.agent) {
			return json(400, { error: `Agent must be at most ${LIMITS.agent} characters.` });
		}
		const wait = limiters.agentPerIp.take(ipKey, now);
		if (wait) return tooMany(wait, 'Too many agent requests from this address. Try later.');
		const globalWait = limiters.agentGlobal.take('all', now);
		if (globalWait) {
			return tooMany(
				globalWait,
				'The agent endpoint is busy. Try later, or have the person use the contact form.'
			);
		}
		return send({ ...result.submission, agent }, deps.deliver);
	}

	const token = typeof raw.turnstileToken === 'string' ? raw.turnstileToken.trim() : '';
	if (!token || token.length > MAX_TOKEN_LENGTH) {
		return json(400, {
			error:
				'The spam check is missing; reload the page and try again. AI agents: send an "agent" field instead (see /llms.txt).'
		});
	}
	const verdict = await deps.verify(token);
	if (verdict === 'unavailable') {
		return json(503, { error: 'The spam check is unavailable right now.' });
	}
	if (verdict === 'rejected') {
		return json(403, { error: 'The spam check failed. Reload the page and try again.' });
	}
	const wait = limiters.formPerIp.take(ipKey, now);
	if (wait) return tooMany(wait, 'Too many messages from this address. Try again later.');
	return send(result.submission, deps.deliver);
}

async function send(submission: ContactSubmission, deliver: Deliver): Promise<ContactResponse> {
	try {
		await deliver(submission);
	} catch {
		return json(502, { error: 'The message could not be delivered.' });
	}
	return json(200, SUCCESS);
}

// Used by `vite dev`, and by the Azure Function when its ACS email settings are
// absent (see api/src/contact-email.ts).
export function logDelivery(log: (message: string) => void): Deliver {
	return async (submission) => {
		log(`[contact] ${JSON.stringify(submission)}`);
	};
}
