// The /api/contact contract, shared by the Azure Function (api/) and the Vite dev
// middleware so local dev validates and answers exactly as production does.
import { CONTACT_KINDS, type ContactKind } from '$lib/content/websites.js';

export interface ContactSubmission {
	name: string;
	email: string;
	kind: ContactKind;
	message: string;
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

export const LIMITS = { name: 200, email: 320, message: 5000 };
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SUCCESS = { ok: true };

function json(status: number, payload: unknown): ContactResponse {
	return {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
			'X-Content-Type-Options': 'nosniff'
		},
		body: JSON.stringify(payload)
	};
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
// success body and nothing is delivered.
export async function contactResponse(
	contentType: string | null,
	body: string,
	deliver: Deliver
): Promise<ContactResponse> {
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

	try {
		await deliver(result.submission);
	} catch {
		return json(502, { error: 'The message could not be delivered.' });
	}
	return json(200, SUCCESS);
}

// Pending the owner's choice of real sender (ACS email, Resend/Postmark, a chat
// webhook, or Jira); until then submissions are only logged.
export function logDelivery(log: (message: string) => void): Deliver {
	return async (submission) => {
		log(`[contact] ${JSON.stringify(submission)}`);
	};
}
