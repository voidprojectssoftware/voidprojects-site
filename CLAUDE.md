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
