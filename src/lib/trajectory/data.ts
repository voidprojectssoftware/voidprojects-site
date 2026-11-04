// Browser access to the spacecraft trajectories (see scripts/fetch-trajectories.mjs).
// The craft list is bundled because it is tiny; the points are fetched from
// trajectories.bin on first use, so a page only pays for them when it draws a
// mark. Rebuild both with `npm run gen:trajectory-bin`.

import meta from './trajectory-meta.json';
import binUrl from './trajectories.bin?url';
import { decode } from './trajectory-format.js';
import type { CraftMeta, TrajectoryData } from './types.js';

export const CRAFT_META: CraftMeta[] = meta.craft;
export const CRAFT_IDS = CRAFT_META.map((c) => c.id);

let pending: Promise<TrajectoryData> | undefined;

// Memoised, so every caller shares one fetch. A failed fetch is forgotten and
// the next call retries.
export function loadTrajectories(): Promise<TrajectoryData> {
	pending ??= fetch(binUrl)
		.then(async (res) => {
			if (!res.ok) throw new Error(`trajectories.bin: HTTP ${res.status}`);
			const series = decode(await res.arrayBuffer());
			if (series.length !== CRAFT_META.length)
				throw new Error(
					`trajectories.bin has ${series.length} craft, meta has ${CRAFT_META.length}`
				);
			return {
				meta: meta.meta,
				planets: meta.planets,
				craft: CRAFT_META.map((c, k) => ({ ...c, ...series[k] }))
			};
		})
		.catch((err) => {
			pending = undefined;
			throw err;
		});
	return pending;
}
