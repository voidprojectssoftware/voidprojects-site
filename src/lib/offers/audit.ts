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
