// Shared access to the fetched spacecraft trajectory data (see
// scripts/fetch-trajectories.mjs). Both the plot renderer (trajectory.ts) and the
// generative logo engine (trajectory-logo.ts) read from here.

import raw from './trajectories.json';

export interface TrajectoryCraft {
	id: string;
	name: string;
	color: string;
	launch: string;
	points: [number, number][]; // heliocentric ecliptic X-Y, AU
	years: { year: number; i: number }[];
}
export interface TrajectoryData {
	meta: Record<string, string>;
	planets: { name: string; a: number }[];
	craft: TrajectoryCraft[];
}

// The JSON widens tuples to number[]; the cast restores the [x, y] shape.
export const DATA = raw as unknown as TrajectoryData;

export const CRAFT_META = DATA.craft.map((c) => ({ id: c.id, name: c.name, color: c.color }));
export const CRAFT_IDS = DATA.craft.map((c) => c.id);
