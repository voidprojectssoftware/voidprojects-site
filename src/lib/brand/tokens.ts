// The brand's design tokens, keyed by the CSS custom properties that define them
// in src/routes/layout.css (the @theme + :root.dark). The /brand guide reads each
// value live from the DOM (getComputedStyle), so layout.css is the single source
// of truth — change a color there and the guide follows. This file only lists
// which tokens to surface and how to label them; it holds no color values.

export interface Swatch {
	name: string;
	cssVar: string; // CSS custom property, resolved at runtime from layout.css
	note?: string;
}

export interface SwatchGroup {
	title: string;
	description: string;
	swatches: Swatch[];
}

export const PALETTE: SwatchGroup[] = [
	{
		title: 'Brand',
		description: 'The core violet that carries the brand across the site and assets.',
		swatches: [
			{ name: 'Primary', cssVar: '--color-primary', note: 'brand violet' },
			{ name: 'Secondary', cssVar: '--color-secondary', note: 'muted violet-grey' }
		]
	},
	{
		title: 'Surfaces',
		description: 'The site runs dark-only; these build the deep-space UI.',
		swatches: [
			{ name: 'Background', cssVar: '--background', note: 'deep space' },
			{ name: 'Foreground', cssVar: '--foreground', note: 'primary text' },
			{ name: 'Card / Popover', cssVar: '--card' },
			{ name: 'Muted', cssVar: '--muted' },
			{ name: 'Muted foreground', cssVar: '--muted-foreground', note: 'secondary text' },
			{ name: 'Border', cssVar: '--border' },
			{ name: 'Ring', cssVar: '--ring', note: 'focus' },
			{ name: 'Destructive', cssVar: '--destructive', note: 'errors' }
		]
	},
	{
		title: 'Data-viz accents',
		description: 'Chart series colors, used sparingly for graphs.',
		swatches: [
			{ name: 'Chart 1', cssVar: '--chart-1' },
			{ name: 'Chart 2', cssVar: '--chart-2' },
			{ name: 'Chart 3', cssVar: '--chart-3' },
			{ name: 'Chart 4', cssVar: '--chart-4' },
			{ name: 'Chart 5', cssVar: '--chart-5' }
		]
	}
];

// The typeface is read from --font-sans; the weights below document which we use.
export const FONT_VAR = '--font-sans';

export interface TypeWeight {
	name: string;
	weight: number;
	use: string;
}

export const TYPE_WEIGHTS: TypeWeight[] = [
	{ name: 'Regular', weight: 400, use: 'body copy, taglines' },
	{ name: 'Semibold', weight: 600, use: 'buttons, nav, card titles' },
	{ name: 'Bold', weight: 700, use: 'headings, the wordmark' },
	{ name: 'Extrabold', weight: 800, use: 'the VP lettermark' }
];
