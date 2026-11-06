<script lang="ts">
	import type {
		AuditGroup,
		AuditStatus,
		PublicAuditCheck,
		PublicOfferAudit,
		PublicSiteAudit
	} from '../audit.js';
	import { formatDate } from '../offer.js';

	let {
		audit,
		title = 'Search and AI visibility, measured',
		currentLabel = 'Your site today',
		previewLabel = 'The site we built',
		class: className = ''
	}: {
		audit: PublicOfferAudit | null;
		title?: string;
		currentLabel?: string;
		previewLabel?: string;
		class?: string;
	} = $props();

	const GROUPS: { id: AuditGroup; title: string }[] = [
		{ id: 'lighthouse', title: 'Speed and quality' },
		{ id: 'search', title: 'Search engines and shared links' },
		{ id: 'ai', title: 'AI assistants' }
	];

	const STATUS: Record<AuditStatus, string> = {
		pass: 'Good',
		warn: 'Could be better',
		fail: 'Needs fixing'
	};

	interface Row {
		id: string;
		label: string;
		current?: PublicAuditCheck;
		preview?: PublicAuditCheck;
	}

	// Pairs the two sites' checks by id, in the current site's order.
	function rowsFor(group: AuditGroup, a: PublicOfferAudit): Row[] {
		const rows: Row[] = [];
		for (const side of ['current', 'preview'] as const) {
			for (const check of a[side].checks) {
				if (check.group !== group) continue;
				let row = rows.find((r) => r.id === check.id);
				if (!row) rows.push((row = { id: check.id, label: check.label }));
				row[side] = check;
			}
		}
		return rows;
	}

	const COUNTED: Record<AuditStatus, [one: string, many: string]> = {
		pass: ['good', 'good'],
		warn: ['could be better', 'could be better'],
		fail: ['needs fixing', 'need fixing']
	};

	function summary(site: PublicSiteAudit): string {
		return (Object.keys(COUNTED) as AuditStatus[])
			.map(
				(status) => `${site.counts[status]} ${COUNTED[status][site.counts[status] === 1 ? 0 : 1]}`
			)
			.join(', ');
	}

	let groups = $derived(
		audit
			? GROUPS.map((g) => ({ ...g, rows: rowsFor(g.id, audit) })).filter((g) => g.rows.length)
			: []
	);
</script>

{#snippet side(label: string, check: PublicAuditCheck | undefined)}
	<div class="side">
		<p class="who">{label}</p>
		{#if check}
			<p class="status {check.status}">{STATUS[check.status]}</p>
			<p class="why">{check.explanation}</p>
		{:else}
			<p class="why">Not measured.</p>
		{/if}
	</div>
{/snippet}

<section class={className} aria-labelledby="offer-audit">
	<h2 id="offer-audit">{title}</h2>
	{#if audit && groups.length}
		<dl class="totals">
			<div>
				<dt>{currentLabel}</dt>
				<dd>{summary(audit.current)}</dd>
			</div>
			<div>
				<dt>{previewLabel}</dt>
				<dd>{summary(audit.preview)}</dd>
			</div>
		</dl>
		{#each groups as group (group.id)}
			<h3>{group.title}</h3>
			<div class="head" aria-hidden="true">
				<span></span><span>{currentLabel}</span><span>{previewLabel}</span>
			</div>
			<ul>
				{#each group.rows as row (row.id)}
					<li>
						<h4>{row.label}</h4>
						{@render side(currentLabel, row.current)}
						{@render side(previewLabel, row.preview)}
					</li>
				{/each}
			</ul>
		{/each}
		<p class="note">
			Measured {formatDate(audit.generatedAt.slice(0, 10))}, with the same checks on both sites as a
			phone visitor would load them. Speed and quality scores come from Google's Lighthouse test.
		</p>
	{:else}
		<p class="note">Measurements are on their way and will appear here.</p>
	{/if}
</section>

<style>
	.totals {
		display: grid;
		gap: 0.75rem;
		margin: 0 0 1.5rem;
	}
	.totals div {
		padding: 0.75rem 1rem;
		border: 1px solid var(--offer-border, rgb(0 0 0 / 0.12));
		border-radius: var(--offer-radius, 0.75rem);
		background: var(--offer-surface, #fff);
	}
	dt {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--offer-muted, #555);
	}
	dd {
		margin: 0.125rem 0 0;
		font-weight: 600;
	}
	h3 {
		margin: 1.75rem 0 0.75rem;
		font-size: 1.125rem;
	}
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
		border: 1px solid var(--offer-border, rgb(0 0 0 / 0.12));
		border-radius: var(--offer-radius, 0.75rem);
		background: var(--offer-surface, #fff);
	}
	li {
		display: grid;
		gap: 0.75rem;
		padding: 1rem;
		border-bottom: 1px solid var(--offer-border, rgb(0 0 0 / 0.12));
	}
	li:last-child {
		border-bottom: 0;
	}
	h4 {
		margin: 0;
		font-size: 1rem;
	}
	.side p {
		margin: 0;
	}
	.who {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--offer-muted, #555);
	}
	.status {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		margin: 0.25rem 0;
		font-size: 0.875rem;
		font-weight: 700;
	}
	.status::before {
		content: '';
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 50%;
		background: currentColor;
	}
	.pass {
		color: var(--offer-good, #17803d);
	}
	.warn {
		color: var(--offer-warn, #8a5a00);
	}
	.fail {
		color: var(--offer-bad, #b42318);
	}
	.why {
		color: var(--offer-muted, #555);
		font-size: 0.9375rem;
	}
	.head {
		display: none;
	}
	.note {
		margin: 0.75rem 0 0;
		font-size: 0.875rem;
		color: var(--offer-muted, #555);
	}

	/* Wide screens: one row per check with the two sites side by side, so the
	   per-side labels move to a shared header and stay only for screen readers. */
	@media (min-width: 48rem) {
		.totals {
			grid-template-columns: 1fr 1fr;
		}
		.head,
		li {
			grid-template-columns: minmax(9rem, 0.7fr) 1fr 1fr;
			gap: 1.5rem;
		}
		.head {
			display: grid;
			padding: 0 1rem 0.5rem;
			font-size: 0.8125rem;
			font-weight: 600;
			color: var(--offer-muted, #555);
		}
		.who {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
		.status {
			margin-top: 0;
		}
	}
</style>
