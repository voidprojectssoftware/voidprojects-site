import type Matter from 'matter-js';

let lib: typeof Matter | null = null;
let loading: Promise<typeof Matter> | null = null;

/** Fetch the Matter.js chunk once; later calls share the same promise. */
export function loadMatter(): Promise<typeof Matter> {
	loading ??= import('matter-js').then((m) => (lib = m.default));
	return loading;
}

/**
 * The loaded Matter.js module. Only call it from code that runs once a
 * {@link PhysicsStage} is ready, which is what guarantees {@link loadMatter} resolved.
 */
export function matter(): typeof Matter {
	if (!lib) throw new Error('matter-js used before loadMatter() resolved');
	return lib;
}
