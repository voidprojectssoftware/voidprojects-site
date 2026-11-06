// Shared blocks for offer pages (offers/<id>/page.svelte). None hard-codes a look:
// each reads these custom properties, which the offer's page sets on an ancestor,
// and takes a `class` (and most a `title`) for local adjustments.
//   --offer-fg, --offer-muted          text and secondary text
//   --offer-surface, --offer-border    card background and its edge
//   --offer-accent, --offer-accent-fg  selected states and the sign-up button
//   --offer-good, --offer-warn,        audit statuses: pass, warn and fail
//     --offer-bad
//   --offer-radius                     card corner radius
//   --offer-callout                    highlighted text, e.g. a concern's impact (optional)
//   --offer-link                       inline links in the accepted blocks (optional; defaults to --offer-accent)
export { default as ConcernsList } from './concerns-list.svelte';
export { default as AuditComparison } from './audit-comparison.svelte';
export { default as PlanPicker } from './plan-picker.svelte';
export { default as SignUpButton } from './sign-up-button.svelte';
export { default as QrCode } from './qr-code.svelte';
export { default as ExpiredState } from './expired-state.svelte';
export { default as OfferGate } from './offer-gate.svelte';
export { default as AcceptedState } from './accepted-state.svelte';
export { default as AcceptedPlan } from './accepted-plan.svelte';
export { initialSelection, type Selection } from './selection.js';
