// Loads the bundled Functions app (build-api/index.js) the way the Functions worker
// would, with @azure/functions-core stubbed, and fails unless every expected function
// registers. @azure/functions swallows a missing core module and silently skips
// registration ("test mode"), so a bundle that merely loads proves nothing.
// Usage: node scripts/smoke-api.mjs [path/to/index.js]
import Module, { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const expected = ['mark', 'contact'];

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = resolve(process.argv[2] ?? join(root, 'build-api/index.js'));

const registered = new Map(); // function name -> trigger binding type
let programmingModelSet = false;

const coreStub = {
	setProgrammingModel() {
		programmingModelSet = true;
	},
	registerFunction(metadata, handler) {
		if (typeof handler !== 'function') {
			throw new Error(`function "${metadata?.name}" registered without a handler`);
		}
		const types = Object.values(metadata.bindings ?? {}).map((b) => b.type);
		registered.set(metadata.name, types.find((t) => /Trigger$/.test(t)) ?? 'no trigger binding');
		return { dispose() {} };
	},
	registerHook() {
		return { dispose() {} };
	},
	log() {}
};

const originalLoad = Module._load;
Module._load = function (request, ...rest) {
	if (request === '@azure/functions-core') return coreStub;
	return originalLoad.call(this, request, ...rest);
};

try {
	createRequire(import.meta.url)(bundle);
} catch (err) {
	console.error(`smoke-api: FAIL, ${bundle} threw while loading:`);
	console.error(err);
	process.exit(1);
} finally {
	Module._load = originalLoad;
}

const missing = expected.filter((name) => !registered.has(name));
if (!programmingModelSet || missing.length > 0) {
	if (!programmingModelSet) {
		console.error('smoke-api: FAIL, the bundle never called setProgrammingModel on the core API');
	}
	if (missing.length > 0) {
		console.error(`smoke-api: FAIL, missing function registration(s): ${missing.join(', ')}`);
	}
	console.error(`smoke-api: registered: ${[...registered.keys()].join(', ') || '(none)'}`);
	process.exit(1);
}

for (const [name, type] of registered) console.log(`smoke-api: registered ${name} (${type})`);
console.log(`smoke-api: OK, ${expected.join(' and ')} registered from ${bundle}`);
process.exit(0);
