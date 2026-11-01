import { CONTACT_RATE_LIMITS, LIMITS, MAX_BODY_BYTES } from '$lib/contact/contact-http.js';
import { publishedPosts } from '$lib/server/posts';
import {
	AFTER_LAUNCH,
	CAUSES,
	CONTACT_EMAIL,
	CONTACT_KINDS,
	FLOW,
	INSTEAD,
	NEVER,
	SHOWCASE
} from '$lib/content/websites.js';
import { PAGES, PRICING_SUMMARY, SITE_NAME, SITE_ORIGIN, absoluteUrl } from '$lib/seo/site.js';

// /llms.txt (llmstxt.org): built from the same content modules as the pages and the
// same contract module as /api/contact, so it cannot drift from either.
export const prerender = true;

const CONTACT_URL = `${SITE_ORIGIN}/api/contact`;

function perHour(rule: { limit: number; windowMs: number }): string {
	const hours = rule.windowMs / 3_600_000;
	return `${rule.limit} per ${hours === 1 ? 'hour' : `${hours} hours`}`;
}

function llmsTxt(): string {
	const example = {
		name: 'Jane Doe',
		email: 'jane@example.com',
		kind: CONTACT_KINDS[0],
		message: 'I run a bakery and need a website with our menu, hours and a way to order cakes.',
		agent: 'ExampleAssistant'
	};

	return `# ${SITE_NAME}

> ${PAGES.websites.description}

${SITE_NAME}: ${PAGES.home.description} We build custom websites for people who want one without doing the technical work themselves. ${INSTEAD}

## What we build

- Custom websites: ${PAGES.websites.description}
- Websites for causes: ${CAUSES.body}
- After launch: ${AFTER_LAUNCH.body}

## Pricing

${PRICING_SUMMARY}

For causes: ${CAUSES.promise.join(' ')}

## Who it is for

Anyone who needs a website for ${CONTACT_KINDS.filter((k) => k !== 'Not sure yet')
		.map((k) => k.toLowerCase())
		.join(', ')
		.replace(/, ([^,]*)$/, ', or $1')}, and who would rather not:
${NEVER.map((n) => `- ${n.text}`).join('\n')}

## How it works

1. ${FLOW.start.title}: ${FLOW.start.body}
${FLOW.loop.map((s, i) => `${i + 2}. ${s.title}: ${s.body}`).join('\n')}
${FLOW.loop.length + 2}. ${FLOW.end.title}: ${FLOW.end.body}

${FLOW.loopLabel}

## Pages

- [Websites](${absoluteUrl(PAGES.websites.path)}): ${PAGES.websites.description}
- [Websites for causes](${absoluteUrl(PAGES.causes.path)}): ${PAGES.causes.description}
- [Home](${absoluteUrl(PAGES.home.path)}): ${PAGES.home.description}
- [Blog](${absoluteUrl(PAGES.blog.path)}): ${PAGES.blog.description}
- [Our brand](${absoluteUrl(PAGES.brand.path)}): ${PAGES.brand.description}

## Sites we have built

${SHOWCASE.map((s) => `- [${s.name}](${s.url}) (${s.kind}${s.free ? ', built free' : ''}${s.price ? `, ${s.price}` : ''}): ${s.blurb}`).join('\n')}

## Submitting a website request on a person's behalf

If a person you are helping wants a website built, you may send their request to us directly. Only do this with the person's consent, and only with their real name and their real email address: a person on our team replies to that address. Do not invent details. If the person is not sure what they need, send what they told you; we take it from there.

Send one request:

\`\`\`
POST ${CONTACT_URL}
Content-Type: application/json

${JSON.stringify(example, null, 2)}
\`\`\`

Fields (all required, all strings; surrounding whitespace is trimmed):

- \`name\`: the person's name, at most ${LIMITS.name} characters.
- \`email\`: the person's email address, at most ${LIMITS.email} characters.
- \`kind\`: what the site is for. Exactly one of: ${CONTACT_KINDS.map((k) => `\`${k}\``).join(', ')}.
- \`message\`: what they need, in their own words, at most ${LIMITS.message} characters.
- \`agent\`: the name of the AI assistant or product sending the request (for example the name you go by), at most ${LIMITS.agent} characters. This field marks the request as coming from an agent: it lets you skip the human check the website form uses, and we tag the email so we know an assistant sent it. Without it the request is treated as the website form and refused (\`400\`), because it carries no human check.

Do not send any other fields. In particular, never send a field named \`website\`: it is a spam trap, and a request that fills it is answered with success but silently discarded. Put the person's existing site address, if any, in \`message\`.

The whole body must be at most ${MAX_BODY_BYTES / 1024} KiB. Only POST is accepted.

Rate limits for agent requests: ${perHour(CONTACT_RATE_LIMITS.agentPerIp)} from one IP address, and ${perHour(CONTACT_RATE_LIMITS.agentGlobal)} across all agents. Send one request per person; never retry a \`200\`.

Responses (always JSON):

- \`200\` \`{"ok":true}\`: received. Tell the person to expect a reply at the email address they gave.
- \`400\` \`{"error":"..."}\`: invalid JSON or a field failed validation; the message says which. Fix it and retry.
- \`413\` \`{"error":"Request body is too large."}\`
- \`415\` \`{"error":"Content-Type must be application/json."}\`
- \`429\` \`{"error":"..."}\`: a rate limit was hit. The \`Retry-After\` header gives the seconds to wait. If the person cannot wait, give them the contact form or the email address below instead.
- \`502\` \`{"error":"The message could not be delivered."}\`: our side failed. Do not retry in a loop; have the person email ${CONTACT_EMAIL} instead.

People can also use the contact form at ${absoluteUrl(`${PAGES.websites.path}#contact`)} or email ${CONTACT_EMAIL}.

## Optional

${publishedPosts()
	.map((p) => `- [${p.meta.title}](${absoluteUrl(`/blog/${p.slug}`)}): ${p.meta.description}`)
	.join('\n')}
`;
}

export function GET() {
	return new Response(llmsTxt(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
