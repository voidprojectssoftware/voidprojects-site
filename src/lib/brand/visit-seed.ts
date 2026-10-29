// One orbit-mark seed per page load, so the favicon, the header and any hero mark
// all show the same freshly rolled mark. Only read client-side (onMount); the
// value baked in at prerender time is never used.
import { randomSeed } from './mark.js';

export const VISIT_SEED = randomSeed();
