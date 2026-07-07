// The single JS entry point for brand colors. Resolves the CSS custom properties
// defined in src/routes/layout.css (the source of truth) at runtime, so nothing in
// JS has to hardcode a brand color. Browser-only; returns '' during SSR so callers
// can fall back.
export function brandColor(cssVar: string = '--color-primary'): string {
	if (typeof document === 'undefined') return '';
	return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
}
