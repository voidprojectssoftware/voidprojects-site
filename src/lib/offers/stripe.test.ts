import { describe, expect, it } from 'vitest';
import { billingPortalUrl } from './stripe.js';

describe('billingPortalUrl', () => {
	it('is null when unset or blank', () => {
		expect(billingPortalUrl({})).toBeNull();
		expect(billingPortalUrl({ PUBLIC_STRIPE_PORTAL_URL: '  ' })).toBeNull();
	});

	it('returns the trimmed login link', () => {
		const url = 'https://billing.stripe.com/p/login/test_abc123';
		expect(billingPortalUrl({ PUBLIC_STRIPE_PORTAL_URL: ` ${url}\n` })).toBe(url);
	});

	it('rejects a value that is not an https URL', () => {
		expect(() => billingPortalUrl({ PUBLIC_STRIPE_PORTAL_URL: 'billing.stripe.com/p' })).toThrow(
			/not a URL/
		);
		expect(() =>
			billingPortalUrl({ PUBLIC_STRIPE_PORTAL_URL: 'http://billing.stripe.com/p/login/x' })
		).toThrow(/not https/);
	});
});
