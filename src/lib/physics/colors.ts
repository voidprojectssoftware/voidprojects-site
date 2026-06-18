// Brand violet for canvas/SVG effects (quasar jets, relation-graph hub), kept
// in sync with the Tailwind theme's --color-primary (layout.css:
// oklch(0.6534 0.1876 301.62)). Canvas/SVG filters can't consume CSS custom
// properties, so this is the one place the sRGB equivalent is spelled out.
const BRAND_VIOLET_RGB = '196, 162, 255';

export function brandViolet(alpha: number): string {
	return `rgba(${BRAND_VIOLET_RGB}, ${alpha})`;
}
