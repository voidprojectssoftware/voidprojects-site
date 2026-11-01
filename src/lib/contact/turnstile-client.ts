import type { Attachment } from 'svelte/attachments';
import { TURNSTILE_SCRIPT_URL } from './turnstile.js';

interface TurnstileApi {
	render(container: HTMLElement, options: Record<string, unknown>): string | undefined;
	remove(widgetId: string): void;
}

declare global {
	interface Window {
		turnstile?: TurnstileApi;
	}
}

let loading: Promise<TurnstileApi> | undefined;

// One script tag per page, added on first need; a failed load can be retried.
function loadTurnstile(): Promise<TurnstileApi> {
	loading ??= new Promise<TurnstileApi>((resolve, reject) => {
		if (window.turnstile) return resolve(window.turnstile);
		const script = document.createElement('script');
		script.src = TURNSTILE_SCRIPT_URL;
		script.async = true;
		script.onload = () =>
			window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing'));
		script.onerror = () => {
			script.remove();
			loading = undefined;
			reject(new Error('turnstile script failed to load'));
		};
		document.head.append(script);
	});
	return loading;
}

export interface TurnstileCallbacks {
	onToken(token: string): void;
	onExpire(): void; // the token lapsed or the widget went away; it is no longer usable
	onError(): void;
}

/**
 * Renders a Turnstile widget into the element, but only once its form comes within a
 * screen of view or takes focus, so pages that never reach the form never fetch the
 * script. The widget is removed (and {@link TurnstileCallbacks.onExpire} called) when
 * the element unmounts, so a remounted form starts with a fresh token.
 */
export function turnstile(sitekey: string, callbacks: TurnstileCallbacks): Attachment<HTMLElement> {
	return (node) => {
		const trigger = node.closest('form') ?? node;
		let disposed = false;
		let api: TurnstileApi | undefined;
		let widgetId: string | undefined;

		const start = () => {
			observer.disconnect();
			trigger.removeEventListener('focusin', start);
			loadTurnstile().then(
				(loaded) => {
					if (disposed) return;
					api = loaded;
					widgetId = loaded.render(node, {
						sitekey,
						theme: 'dark',
						size: 'flexible',
						appearance: 'interaction-only',
						callback: callbacks.onToken,
						'expired-callback': callbacks.onExpire,
						'timeout-callback': callbacks.onExpire,
						'error-callback': () => {
							callbacks.onError();
							return true; // handled; keeps Turnstile from throwing to the console
						}
					});
				},
				() => {
					if (!disposed) callbacks.onError();
				}
			);
		};

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) start();
			},
			{ rootMargin: '100% 0px' }
		);
		observer.observe(trigger);
		trigger.addEventListener('focusin', start);

		return () => {
			disposed = true;
			observer.disconnect();
			trigger.removeEventListener('focusin', start);
			if (api && widgetId) api.remove(widgetId);
			callbacks.onExpire();
		};
	};
}
