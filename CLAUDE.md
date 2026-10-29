# voidprojects-site

## Comments

Code should explain itself; comments fill gaps where it cannot.

**Properties and fields:** inline `//` to the right only. No `/** */` block above a property.

```ts
// Wrong:
/** Cursor influence radius (px). Glyphs farther than this feel nothing. */
radius: number;

// Right:
radius: number; // cursor influence radius (px); glyphs farther than this feel nothing
```

**Interface/class methods:** comment only when the signature does not capture a non-obvious ordering constraint, side-effect, or failure mode. Skip if the name and types already say it.

**Svelte components:** only what the template cannot show: layout contracts with other systems, non-obvious CSS behavior. Remove anything that re-describes what is rendered.

**Classes and exported functions:** one short summary when scope or coupling is non-obvious. Use `{@link}` rather than restating names.

## AI-generated docs

Any document you write into the `docs/` folder must open with this annotation as the very first line:

```
> **AI-generated, not yet reviewed.** This document was written by an AI assistant and has not been reviewed by a human.
```

Leave it in place until a human explicitly removes it after review.

## Visual feedback (Agentation)

`npm run dev` mounts the Agentation toolbar (bottom right; `src/lib/dev/agentation.ts`, injected by `src/hooks.server.ts` in dev only). Notes left on the page reach the agent through the `agentation` MCP server in `.mcp.json`, which listens on port **4748** (not the 4747 default, which other local projects use). Both must agree on the port.

When asked to work through feedback: read pending notes with `agentation_get_all_pending`, ignore any whose page URL isn't this site's dev server (the store in `~/.agentation/` is shared across projects), make the change, then resolve each note with `agentation_resolve` and a one-line summary of what changed.
