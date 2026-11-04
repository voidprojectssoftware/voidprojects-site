// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	const __BRAND_PRIMARY__: string; // --color-primary from layout.css, inlined by vite.config.ts
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
