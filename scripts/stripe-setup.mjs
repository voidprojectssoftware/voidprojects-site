// Brings the Stripe account to the state offer sign-up needs, from code: Stripe Tax
// settings and the Customer Portal configuration. Idempotent: it reads what is
// there, changes only what differs from DESIRED, and says what it did.
// Usage: STRIPE_SECRET_KEY=sk_test_... npm run stripe-setup [-- --dry-run]
//        STRIPE_SECRET_KEY=sk_live_... npm run stripe-setup -- --live [--yes]
// A live run prints its plan and asks before changing anything. Settings the API
// cannot set for our own account are listed at the end (docs/offers/how-to/configure-stripe.md).
import { createInterface } from 'node:readline/promises';
import Stripe from 'stripe';

const MANAGED_BY = 'voidprojects-site/scripts/stripe-setup.mjs'; // portal configuration metadata tag

const DESIRED = {
	tax: {
		head_office: {
			address: {
				line1: '501 Union St Ste 545 PMB 834400',
				city: 'Nashville',
				state: 'TN',
				postal_code: '37219-1876',
				country: 'US'
			}
		},
		defaults: { tax_behavior: 'exclusive' } // checkout sends prices tax exclusive
	},
	portal: {
		name: 'Void Projects offers',
		business_profile: {
			headline: 'Void Projects: manage your plan and billing',
			privacy_policy_url: 'https://voidprojects.ai/privacy',
			terms_of_service_url: 'https://voidprojects.ai/terms'
		},
		features: {
			invoice_history: { enabled: true },
			payment_method_update: { enabled: true },
			customer_update: {
				enabled: true,
				allowed_updates: ['email', 'address', 'phone', 'name', 'tax_id']
			},
			subscription_cancel: {
				enabled: true,
				mode: 'at_period_end',
				proration_behavior: 'none',
				cancellation_reason: {
					enabled: true,
					options: [
						'too_expensive',
						'missing_features',
						'switched_service',
						'unused',
						'customer_service',
						'too_complex',
						'low_quality',
						'other'
					]
				}
			},
			subscription_update: { enabled: false },
			subscription_pause: { enabled: false }
		},
		login_page: { enabled: true },
		metadata: { managed_by: MANAGED_BY }
	}
};

// Not settable through the API for a platform's own account; see the doc for each path.
const DASHBOARD_ONLY = [
	'Terms of service URL in public business details (Checkout terms consent needs it): Settings > Business > Public details',
	'Branding (icon, logo, colors for Checkout, portal, emails): Settings > Business > Branding',
	'Custom domain pay.voidprojects.ai (live mode only, paid): Settings > Business > Custom domains',
	'Smart Retries, then cancel after 30 days: Billing > Revenue recovery > Retries',
	'Failed payment and expiring card emails: Billing > Revenue recovery > Emails',
	'Renewal reminder emails: Settings > Billing > Subscriptions and emails',
	'Default portal configuration (only if another default existed first): Settings > Billing > Customer portal'
];

const args = new Set(process.argv.slice(2));
const live = args.has('--live');
const dryRun = args.has('--dry-run');

function fail(message) {
	console.error(`stripe-setup: ${message}`);
	process.exit(1);
}

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key) fail('set STRIPE_SECRET_KEY');
const keyIsLive = /^(sk|rk)_live_/.test(key);
const keyIsTest = /^(sk|rk)_test_/.test(key);
if (!keyIsLive && !keyIsTest) fail('STRIPE_SECRET_KEY is not a Stripe secret or restricted key');
if (keyIsLive && !live) fail('refusing a live key without --live');
if (keyIsTest && live) fail('--live given with a test key');

const stripe = new Stripe(key);

// Differences between the desired value and what Stripe has, as dotted paths.
// Arrays compare as sets; keys missing from `want` are not compared.
function diff(want, have, path = '') {
	if (Array.isArray(want)) {
		const a = [...want].sort();
		const b = Array.isArray(have) ? [...have].sort() : [];
		return JSON.stringify(a) === JSON.stringify(b) ? [] : [path];
	}
	if (want && typeof want === 'object') {
		return Object.keys(want).flatMap((k) => diff(want[k], have?.[k], path ? `${path}.${k}` : k));
	}
	return want === have ? [] : [path];
}

async function planTax() {
	const current = await stripe.tax.settings.retrieve();
	const changes = [
		...diff(DESIRED.tax.head_office, current.head_office, 'head_office'),
		...diff(DESIRED.tax.defaults, current.defaults, 'defaults')
	];
	return { current, changes };
}

async function planPortal() {
	const all = [];
	for await (const config of stripe.billingPortal.configurations.list({ limit: 100 })) {
		all.push(config);
	}
	const target =
		all.find((c) => c.metadata?.managed_by === MANAGED_BY) ?? all.find((c) => c.is_default);
	if (!target) return { target: undefined, changes: ['(new configuration)'] };
	const want = { ...DESIRED.portal, active: true };
	const changes = diff(want, target);
	return { target, changes };
}

async function confirm() {
	if (!live || args.has('--yes')) return true;
	if (!process.stdin.isTTY) fail('live run needs a terminal to confirm, or --yes');
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	const answer = await rl.question('Apply these changes to the LIVE account? Type "yes": ');
	rl.close();
	return answer.trim() === 'yes';
}

const account = await stripe.accounts.retrieve();
console.log(
	`Stripe account ${account.id} (${account.settings?.dashboard?.display_name ?? 'no display name'}), ${live ? 'LIVE' : 'test'} mode`
);

const tax = await planTax();
const portal = await planPortal();

console.log('\nPlan');
console.log(
	`  Tax settings: ${tax.changes.length ? `update ${tax.changes.join(', ')}` : 'up to date'}`
);
console.log(
	`  Customer Portal: ${
		!portal.target
			? 'create configuration'
			: portal.changes.length
				? `update ${portal.target.id}: ${portal.changes.join(', ')}`
				: `${portal.target.id} up to date`
	}`
);

const pending = tax.changes.length || portal.changes.length;
if (dryRun) console.log('\n--dry-run: nothing changed');
else if (pending && !(await confirm())) fail('not confirmed; nothing changed');

const summary = [];

if (tax.changes.length && !dryRun) {
	const updated = await stripe.tax.settings.update(DESIRED.tax);
	summary.push(`Tax settings: updated (${tax.changes.join(', ')}); status ${updated.status}`);
	tax.current = updated;
} else {
	const state = tax.changes.length ? 'not updated (dry run)' : 'left alone';
	summary.push(`Tax settings: ${state}; status ${tax.current.status}`);
}
if (tax.current.status !== 'active') {
	summary.push(`  not active: ${JSON.stringify(tax.current.status_details)}`);
}

let config = portal.target;
if (!dryRun && !config) {
	config = await stripe.billingPortal.configurations.create(DESIRED.portal);
	summary.push(`Customer Portal: created ${config.id}`);
} else if (!dryRun && portal.changes.length) {
	config = await stripe.billingPortal.configurations.update(config.id, {
		...DESIRED.portal,
		active: true
	});
	summary.push(`Customer Portal: updated ${config.id} (${portal.changes.join(', ')})`);
} else if (config) {
	const state = portal.changes.length ? 'not updated (dry run)' : 'left alone';
	summary.push(`Customer Portal: ${state} ${config.id}`);
}
if (config) {
	summary.push(
		`  default configuration: ${config.is_default ? 'yes' : 'no (only the Dashboard can change the default; the login link works either way)'}`
	);
	summary.push(`  login page: ${config.login_page.url ?? '(none)'}`);
}

const registrations = [];
for await (const r of stripe.tax.registrations.list({ limit: 100 })) registrations.push(r);
summary.push(
	`Tax registrations (not managed here; an accountant decision): ${registrations.length ? '' : 'none'}`
);
for (const r of registrations) {
	const where = [r.country, r.country_options?.us?.state].filter(Boolean).join('-');
	summary.push(
		`  ${where} ${r.status} from ${new Date(r.active_from * 1000).toISOString().slice(0, 10)}`
	);
}

console.log('\nSummary');
for (const line of summary) console.log(`  ${line}`);
if (config?.login_page.url) {
	console.log(`\nFor the site build: PUBLIC_STRIPE_PORTAL_URL=${config.login_page.url}`);
}
console.log('\nDashboard only (the API cannot set these for our own account):');
for (const item of DASHBOARD_ONLY) console.log(`  - ${item}`);
