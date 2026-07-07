// The brand's design tokens, transcribed from src/routes/layout.css (the site's
// @theme + :root.dark). Shown on the /brand guide so the palette and type are
// documented in one place. Values are the source-of-truth oklch strings; the CSS
// custom property each maps to is noted for reference.

export interface Swatch {
	name: string;
	value: string; // oklch(...) — rendered directly as the swatch color
	token?: string; // the CSS custom property it maps to
	note?: string;
}

export interface SwatchGroup {
	title: string;
	description: string;
	swatches: Swatch[];
}

// The brand violet, referenced by the logo and asset artwork too.
export const BRAND_VIOLET = 'oklch(0.6534 0.1876 301.62)';

export const PALETTE: SwatchGroup[] = [
	{
		title: 'Brand',
		description: 'The core violet that carries the brand across the site and assets.',
		swatches: [
			{ name: 'Primary', value: BRAND_VIOLET, token: '--color-primary', note: 'brand violet' },
			{
				name: 'Secondary',
				value: 'oklch(0.5727 0.0302 304.51)',
				token: '--color-secondary',
				note: 'muted violet-grey'
			}
		]
	},
	{
		title: 'Surfaces',
		description: 'The site runs dark-only; these build the deep-space UI.',
		swatches: [
			{
				name: 'Background',
				value: 'oklch(0.17 0.018 285)',
				token: '--background',
				note: 'deep space'
			},
			{
				name: 'Foreground',
				value: 'oklch(0.985 0 0)',
				token: '--foreground',
				note: 'primary text'
			},
			{ name: 'Card / Popover', value: 'oklch(0.205 0 0)', token: '--card' },
			{ name: 'Muted', value: 'oklch(0.269 0 0)', token: '--muted' },
			{
				name: 'Muted foreground',
				value: 'oklch(0.708 0 0)',
				token: '--muted-foreground',
				note: 'secondary text'
			},
			{ name: 'Border', value: 'oklch(1 0 0 / 10%)', token: '--border' },
			{ name: 'Ring', value: 'oklch(0.556 0 0)', token: '--ring', note: 'focus' },
			{
				name: 'Destructive',
				value: 'oklch(0.704 0.191 22.216)',
				token: '--destructive',
				note: 'errors'
			}
		]
	},
	{
		title: 'Data-viz accents',
		description: 'Chart series colors, used sparingly for graphs.',
		swatches: [
			{ name: 'Chart 1', value: 'oklch(0.488 0.243 264.376)', token: '--chart-1' },
			{ name: 'Chart 2', value: 'oklch(0.696 0.17 162.48)', token: '--chart-2' },
			{ name: 'Chart 3', value: 'oklch(0.769 0.188 70.08)', token: '--chart-3' },
			{ name: 'Chart 4', value: 'oklch(0.627 0.265 303.9)', token: '--chart-4' },
			{ name: 'Chart 5', value: 'oklch(0.645 0.246 16.439)', token: '--chart-5' }
		]
	}
];

export interface TypeWeight {
	name: string;
	weight: number;
	use: string;
}

export const FONT_FAMILY = 'Inter Variable';

export const TYPE_WEIGHTS: TypeWeight[] = [
	{ name: 'Regular', weight: 400, use: 'body copy, taglines' },
	{ name: 'Semibold', weight: 600, use: 'buttons, nav, card titles' },
	{ name: 'Bold', weight: 700, use: 'headings, the wordmark' },
	{ name: 'Extrabold', weight: 800, use: 'the VP logo' }
];
