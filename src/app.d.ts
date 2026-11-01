// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	const __TURNSTILE_SITE_KEY__: string; // inlined by vite.config.ts from PUBLIC_TURNSTILE_SITE_KEY

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
