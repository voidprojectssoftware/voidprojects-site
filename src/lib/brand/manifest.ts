// The single source of truth for every brand asset we render and export. The
// /brand page renders one artwork per spec, and scripts/export-brand.mjs reads
// this same list (via /brand?asset=<id>&raw=1) to screenshot each at its exact
// pixel size. Change a dimension or filename here and both the preview and the
// export follow.

export type BrandFormat = 'png' | 'jpg';
export type ArtKind = 'banner' | 'logo';
export type Platform = 'youtube' | 'linkedin';

// A region of the asset that platforms guarantee to keep visible / uncropped.
// Drawn as an overlay in the gallery so we can keep the important content inside
// it. `shape: 'circle'` is the avatar crop (a centered circle of `width` px).
export interface SafeZone {
	width: number;
	height: number;
	shape?: 'rect' | 'circle';
	label?: string;
}

export interface BrandAssetSpec {
	id: string; // stable slug, also the ?asset= value and export filename stem
	platform: Platform;
	kind: ArtKind;
	label: string;
	width: number; // exact export width (px)
	height: number; // exact export height (px)
	format: BrandFormat;
	// Opaque fallback color, used when exporting to jpg (no alpha) and as the
	// artwork's base backdrop. Matches the site's deep-space --background.
	background: string;
	// Export pixel-density multiplier. >1 renders more device pixels than the
	// logical size, so platforms that upscale on hi-DPI displays (e.g. the LinkedIn
	// cover) stay crisp instead of blurring. Default 1.
	scale?: number;
	safe?: SafeZone;
	note?: string;
}

// The site's deep-space background (layout.css :root.dark --background).
export const BRAND_BG = 'oklch(0.17 0.018 285)';

export const BRAND = {
	name: 'Void Projects',
	tagline: 'AI-centric projects from a developer collective.',
	// Trimmed tagline for tight spaces (the LinkedIn banner is only 191px tall).
	taglineShort: 'AI-centric projects from a developer collective',
	// Social handles shown in the banner CTAs.
	github: 'github.com/voidprojectssoftware',
	youtube: 'youtube.com/@voidprojectssoftware',
	linkedin: 'linkedin.com/company/void-projects-software'
};

export const ASSETS: BrandAssetSpec[] = [
	{
		id: 'youtube-banner',
		platform: 'youtube',
		kind: 'banner',
		label: 'YouTube Channel Banner',
		width: 2560,
		height: 1440,
		format: 'png',
		background: BRAND_BG,
		// YouTube crops the banner differently per device; only this centered band is
		// guaranteed visible on every device (TV/desktop/tablet/mobile).
		safe: { width: 1546, height: 423, shape: 'rect', label: 'Safe on all devices' },
		note: 'Upload 2560×1440. Keep logo + text inside the center 1546×423 safe area.'
	},
	{
		id: 'youtube-logo',
		platform: 'youtube',
		kind: 'logo',
		label: 'YouTube Profile Picture',
		width: 800,
		height: 800,
		format: 'png',
		background: BRAND_BG,
		safe: { width: 800, height: 800, shape: 'circle', label: 'Circle crop' },
		note: 'Rendered as a circle. Renders as small as 98px — keep the mark bold.'
	},
	{
		id: 'linkedin-banner',
		platform: 'linkedin',
		kind: 'banner',
		label: 'LinkedIn Company Banner',
		width: 1128,
		height: 191,
		format: 'png',
		background: BRAND_BG,
		// 2× so LinkedIn's hi-DPI cover render stays sharp instead of upscaling 1128px.
		scale: 2,
		note: 'Company Page cover image, 1128×191 (exported at 2× for sharpness).'
	},
	{
		id: 'linkedin-logo',
		platform: 'linkedin',
		kind: 'logo',
		label: 'LinkedIn Company Logo',
		width: 300,
		height: 300,
		format: 'png',
		background: BRAND_BG,
		safe: { width: 300, height: 300, shape: 'rect', label: 'Square, min 268px' },
		note: 'Company Page logo, 300×300 (square). Shown small in feeds — keep it bold.'
	}
];

export function assetById(id: string): BrandAssetSpec | undefined {
	return ASSETS.find((a) => a.id === id);
}

export function exportFilename(spec: BrandAssetSpec): string {
	return `void-projects-${spec.id}.${spec.format}`;
}
