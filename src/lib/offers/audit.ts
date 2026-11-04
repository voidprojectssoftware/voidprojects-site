// Shape of the JSON written by scripts/offer-audit.mjs: the same checks run on a
// prospect's current site and on our preview, rendered on their offer page as the
// SEO/AEO comparison. Self-contained on purpose; nothing here imports the site.

export type AuditStatus = 'pass' | 'warn' | 'fail';

export type AuditGroup = 'lighthouse' | 'search' | 'ai';

export interface LighthouseValue {
	score: number | null; // 0 to 100, mobile emulation; null when Lighthouse could not score it
}

export interface FetchedFile {
	url: string;
	httpStatus: number | null; // null when the request never got an answer
	found: boolean; // 200 with a real file, not an HTML page served in its place
}

// Raw measured value per check. The offer page can show these next to the status.
export interface AuditCheckValues {
	performance: LighthouseValue & {
		metrics: {
			firstContentfulPaintMs: number | null;
			largestContentfulPaintMs: number | null;
			totalBlockingTimeMs: number | null;
			cumulativeLayoutShift: number | null;
		};
	};
	accessibility: LighthouseValue;
	seo: LighthouseValue;
	bestPractices: LighthouseValue;
	viewport: { content: string | null };
	title: { text: string | null; length: number };
	metaDescription: { text: string | null; length: number };
	openGraph: { tags: Record<string, string>; missing: string[] }; // missing: of og:title, og:description, og:image
	canonical: { href: string | null; sameOrigin: boolean | null };
	structuredData: { blocks: number; parsed: number; types: string[]; errors: string[] }; // JSON-LD only
	robotsTxt: FetchedFile & {
		blocksAllCrawlers: boolean; // "User-agent: *" with "Disallow: /"
		blockedAiBots: string[]; // known AI crawlers the file shuts out
		sitemaps: string[]; // Sitemap: lines
	};
	sitemap: Omit<FetchedFile, 'url'> & { url: string | null; urlCount: number | null };
	serverText: {
		serverWords: number; // visible words with JavaScript off, as most AI crawlers read the page
		renderedWords: number; // visible words after scripts run, as a visitor sees it
		ratio: number | null; // serverWords / renderedWords, capped at 1
		sample: string; // opening of the server text
	};
	headings: { outline: { level: number; text: string }[]; h1Count: number; skippedLevels: boolean };
	llmsTxt: FetchedFile & { firstLine: string | null };
}

export type AuditCheckId = keyof AuditCheckValues;

export type AuditCheck<K extends AuditCheckId = AuditCheckId> = {
	[P in K]: {
		id: P;
		group: AuditGroup;
		label: string; // short display name, e.g. "Mobile speed"
		status: AuditStatus;
		value: AuditCheckValues[P] | null; // null only when the check itself could not run
		explanation: string; // one plain-English line for a business owner
		error?: string; // why the check could not run, for us rather than the prospect
	};
}[K];

export interface SiteAudit {
	requestedUrl: string;
	finalUrl: string | null; // after redirects; null when the page never loaded
	httpStatus: number | null;
	checks: AuditCheck[]; // every AuditCheckId, always in the same order
	counts: Record<AuditStatus, number>;
}

export interface OfferAudit {
	schemaVersion: 1;
	generatedAt: string; // ISO 8601, when the run started
	lighthouseVersion: string;
	formFactor: 'mobile';
	current: SiteAudit; // the prospect's site today
	preview: SiteAudit; // the site we built for them
}

// What an offer page receives: each check's status and explanation, without the raw
// values or the `error` notes, which are for us.
export type PublicAuditCheck = Pick<
	AuditCheck,
	'id' | 'group' | 'label' | 'status' | 'explanation'
>;

export interface PublicSiteAudit {
	checks: PublicAuditCheck[];
	counts: Record<AuditStatus, number>;
}

export interface PublicOfferAudit {
	generatedAt: string;
	current: PublicSiteAudit;
	preview: PublicSiteAudit;
}

const STATUSES: readonly AuditStatus[] = ['pass', 'warn', 'fail'];
const GROUPS: readonly AuditGroup[] = ['lighthouse', 'search', 'ai'];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, where: string): string {
	if (typeof value !== 'string' || !value.trim())
		throw new Error(`${where} must be a non-empty string`);
	return value;
}

function publicSite(value: unknown, where: string): PublicSiteAudit {
	if (!isRecord(value) || !Array.isArray(value.checks) || !value.checks.length) {
		throw new Error(`${where} needs a non-empty checks list`);
	}
	const counts: Record<AuditStatus, number> = { pass: 0, warn: 0, fail: 0 };
	const checks = value.checks.map((check: unknown, i): PublicAuditCheck => {
		const at = `${where}.checks[${i}]`;
		if (!isRecord(check)) throw new Error(`${at} must be an object`);
		const status = check.status as AuditStatus;
		const group = check.group as AuditGroup;
		if (!STATUSES.includes(status)) throw new Error(`${at}.status must be pass, warn or fail`);
		if (!GROUPS.includes(group)) throw new Error(`${at}.group must be ${GROUPS.join(', ')}`);
		counts[status]++;
		return {
			id: text(check.id, `${at}.id`) as AuditCheckId,
			group,
			label: text(check.label, `${at}.label`),
			status,
			explanation: text(check.explanation, `${at}.explanation`)
		};
	});
	return { checks, counts };
}

/** Validates a parsed audit file and trims it to {@link PublicOfferAudit}; throws with `where` on a bad file. */
export function publicAudit(value: unknown, where: string): PublicOfferAudit {
	if (!isRecord(value) || value.schemaVersion !== 1) {
		throw new Error(`${where}: expected an OfferAudit with schemaVersion 1`);
	}
	const generatedAt = text(value.generatedAt, `${where}: generatedAt`);
	if (Number.isNaN(Date.parse(generatedAt)))
		throw new Error(`${where}: generatedAt must be ISO 8601`);
	return {
		generatedAt,
		current: publicSite(value.current, `${where}: current`),
		preview: publicSite(value.preview, `${where}: preview`)
	};
}
