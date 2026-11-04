<script lang="ts">
	// Reads the AuditResults placeholder shape; the audit script (#79) owns the real format.
	import { formatDate, type AuditMetric, type AuditResults } from '../offer.js';

	let {
		audit,
		title = 'Search and AI visibility, measured',
		currentLabel = 'Your site today',
		previewLabel = 'The site we built',
		class: className = ''
	}: {
		audit: AuditResults | null;
		title?: string;
		currentLabel?: string;
		previewLabel?: string;
		class?: string;
	} = $props();

	function improved(m: AuditMetric): boolean {
		return m.better === 'higher' ? m.preview > m.current : m.preview < m.current;
	}
</script>

<section class={className} aria-labelledby="offer-audit">
	<h2 id="offer-audit">{title}</h2>
	{#if audit && audit.metrics.length}
		<div class="scroll">
			<table>
				<thead>
					<tr>
						<th scope="col">Measure</th>
						<th scope="col">{currentLabel}</th>
						<th scope="col">{previewLabel}</th>
					</tr>
				</thead>
				<tbody>
					{#each audit.metrics as metric (metric.label)}
						<tr>
							<th scope="row">{metric.label}</th>
							<td>{metric.current}{metric.unit ?? ''}</td>
							<td class:good={improved(metric)}>{metric.preview}{metric.unit ?? ''}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="note">Measured {formatDate(audit.measuredOn)}. {audit.source}</p>
	{:else}
		<p class="note">Measurements are on their way and will appear here.</p>
	{/if}
</section>

<style>
	.scroll {
		overflow-x: auto;
		border: 1px solid var(--offer-border, rgb(0 0 0 / 0.12));
		border-radius: var(--offer-radius, 0.75rem);
		background: var(--offer-surface, #fff);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-variant-numeric: tabular-nums;
	}
	th,
	td {
		padding: 0.75rem 1rem;
		text-align: left;
		border-bottom: 1px solid var(--offer-border, rgb(0 0 0 / 0.12));
	}
	tbody tr:last-child > * {
		border-bottom: 0;
	}
	thead th {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--offer-muted, #555);
	}
	tbody th {
		font-weight: 500;
	}
	.good {
		font-weight: 700;
		color: var(--offer-good, #17803d);
	}
	.note {
		margin: 0.75rem 0 0;
		font-size: 0.875rem;
		color: var(--offer-muted, #555);
	}
</style>
