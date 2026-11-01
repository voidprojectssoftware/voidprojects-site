// The full trajectory table as a synchronous JSON import, for code that cannot
// await loadTrajectories() from ./data.ts: the /api/mark.svg handler (Node) and
// the internal /brand labs. Public pages must not import this: it compiles the
// whole table into their JS, which is what trajectories.bin exists to avoid.
import raw from './trajectories.json';
import type { TrajectoryData } from './types.js';

export const TRAJECTORIES = raw as unknown as TrajectoryData; // the JSON widens [x, y] tuples to number[]
