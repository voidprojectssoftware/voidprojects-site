// Dev-only visual feedback toolbar (Agentation): click any element on the running
// page, leave a note, and the note reaches the coding agent through the
// `agentation` MCP server in .mcp.json. Injected by src/hooks.server.ts under
// `vite dev` only, so production builds never reference it (or React).
//
// Agentation is a React component; this site is Svelte, so it gets its own small
// React root. createElement rather than JSX keeps this plain TypeScript.
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Agentation, type AgentationProps } from 'agentation';

// Must match `--port` on the MCP server in .mcp.json. Not the 4747 default, so
// this site's notes don't land on another project's running server.
const ENDPOINT = `http://${window.location.hostname}:4748`;

const host = document.createElement('div');
host.id = 'agentation-root';
document.body.append(host);

createRoot(host).render(
	createElement<AgentationProps>(Agentation, {
		endpoint: ENDPOINT,
		appName: 'voidprojects-site',
		onSessionCreated: (sessionId) => console.info(`[agentation] session ${sessionId}`)
	})
);
