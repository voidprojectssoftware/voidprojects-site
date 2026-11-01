export interface CraftMeta {
	id: string;
	name: string;
	color: string;
	launch: string;
}
export interface TrajectoryCraft extends CraftMeta {
	points: [number, number][]; // heliocentric ecliptic X-Y, AU
	years: { year: number; i: number }[]; // i: index of the first point in that year
}
export interface TrajectoryData {
	meta: Record<string, string>;
	planets: { name: string; a: number }[];
	craft: TrajectoryCraft[];
}
