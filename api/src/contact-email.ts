// Email delivery for /api/contact through Azure Communication Services. Lives in
// api/ (not $lib) so the Vite dev middleware can never load it or reach ACS.
import { EmailClient, type EmailMessage } from '@azure/communication-email';
import { logDelivery, type ContactSubmission, type Deliver } from '$lib/contact/contact-http.js';

export const CONTACT_EMAIL_SETTINGS = [
	'ACS_CONNECTION_STRING',
	'CONTACT_FROM',
	'CONTACT_TO'
] as const;

const SEND_TIMEOUT_MS = 30_000;

export interface ContactEmailConfig {
	connectionString: string;
	from: string; // sender on the ACS-verified domain
	to: string; // the team inbox
}

export type SendEmail = (message: EmailMessage) => Promise<void>;

type Log = (message: string) => void;

export function readContactEmailConfig(
	env: Record<string, string | undefined>
): { config: ContactEmailConfig } | { missing: string[] } {
	const [connectionString, from, to] = CONTACT_EMAIL_SETTINGS.map((key) => env[key]?.trim() ?? '');
	const missing = CONTACT_EMAIL_SETTINGS.filter((key) => !env[key]?.trim());
	if (missing.length) return { missing };
	return { config: { connectionString, from, to } };
}

// Visitor input is free text; collapsing whitespace keeps the subject one line.
function oneLine(value: string): string {
	return value.replace(/\s+/g, ' ').trim();
}

// Plain text only: there is no HTML part, so visitor input cannot become markup.
export function composeContactEmail(
	submission: ContactSubmission,
	from: string,
	to: string
): EmailMessage {
	const name = oneLine(submission.name);
	return {
		senderAddress: from,
		recipients: { to: [{ address: to }] },
		replyTo: [{ address: submission.email }],
		content: {
			subject: `Website request from ${name} (${submission.kind})`,
			plainText: [
				`Name: ${name}`,
				`Email: ${submission.email}`,
				`Kind: ${submission.kind}`,
				'',
				'Message:',
				submission.message,
				'',
				'--',
				'Sent by the voidprojects.ai /websites contact form. Reply to answer the visitor directly.'
			].join('\n')
		}
	};
}

// The client is built on first send, so a malformed connection string fails that
// request (502, mailto fallback) instead of the module load that registers every function.
export function acsSender(connectionString: string): SendEmail {
	let client: EmailClient | undefined;
	return async (message) => {
		try {
			client ??= new EmailClient(connectionString);
		} catch {
			// The SDK's own message echoes the whole string, access key included.
			throw new Error('ACS_CONNECTION_STRING is not a valid connection string');
		}
		const poller = await client.beginSend(message, { updateIntervalInMs: 1000 });
		const result = await poller.pollUntilDone({
			abortSignal: AbortSignal.timeout(SEND_TIMEOUT_MS)
		});
		if (result.status !== 'Succeeded') {
			throw new Error(`ACS send ended ${result.status} (${result.error?.code ?? 'no code'})`);
		}
	};
}

export function emailDelivery(send: SendEmail, config: ContactEmailConfig, log: Log): Deliver {
	return async (submission) => {
		try {
			await send(composeContactEmail(submission, config.from, config.to));
		} catch (err) {
			const reason = (err instanceof Error ? err.message : String(err)).replace(
				/accesskey=[^;\s]*/gi,
				'accesskey=[redacted]'
			);
			log(`[contact] email delivery failed: ${reason}`);
			throw err;
		}
		log('[contact] delivered by email');
	};
}

/**
 * Picks the delivery once per process: ACS email when every setting in
 * {@link CONTACT_EMAIL_SETTINGS} is present, otherwise {@link logDelivery} with a
 * single warning naming the missing settings (never their values).
 */
export function contactDelivery(
	env: Record<string, string | undefined>,
	createSender: (connectionString: string) => SendEmail = acsSender
): (log: Log, warn: Log) => Deliver {
	const read = readContactEmailConfig(env);
	if ('missing' in read) {
		let warned = false;
		return (log, warn) => {
			if (!warned) {
				warned = true;
				warn(`[contact] ${read.missing.join(', ')} not set; submissions are only logged`);
			}
			return logDelivery(log);
		};
	}
	const send = createSender(read.config.connectionString);
	return (log) => emailDelivery(send, read.config, log);
}
