---
name: comment-cleanup
description: >-
  Apply the project comment standards to a TypeScript or Svelte file: convert
  block comments above properties to inline, remove redundant method/interface
  comments, trim Svelte component block comments to layout-contract essentials.
  Usage: /comment-cleanup <file-path-relative-to-voidprojects-site/>
allowed-tools: Read, Edit
---

# comment-cleanup

Sweep the file given as the command argument and apply the comment standards from CLAUDE.md.

## Rules

### 1. Property / field comments: move above block to inline

Any `/** text */` block directly above a property in a type, interface, or object literal becomes an inline `//` comment to the right of that property.

Before:
```ts
/** Cursor influence radius (px). Glyphs farther than this feel nothing. */
radius: number;
```
After:
```ts
radius: number; // cursor influence radius (px); glyphs farther than this feel nothing
```

- Lowercase the first character of the comment (it is now mid-sentence).
- Replace any em-dash with a semicolon.
- If the original block cannot be distilled to one line without losing a genuinely non-obvious fact, leave it above and add a `// TODO: trim` note.

### 2. Interface / class method comments: remove when redundant

Remove the comment when the method name, parameter types, and return type already say it all. Keep a comment only when it adds:
- An ordering constraint (e.g., "must not call Engine.update here")
- A non-obvious side-effect (e.g., "stores the stage reference; call before step/sync")
- A failure mode

### 3. Svelte component block comments: trim

A multi-line comment at the top of `<script>` or inside the template that describes what the component renders should be removed or reduced to the one sentence explaining the layout contract with another system.

Keep: coupling facts the template cannot show.
Remove: sentences that re-describe what a reader already sees in the template or props.

### 4. Leave alone

- Class-level and exported-function-level summary blocks explaining scope or non-obvious coupling.
- Comments explaining algorithms, timing, or physics invariants.
- `{@link}` references inside kept comments.
- Directive comments (`// eslint-disable`, `// @ts-ignore`, etc.).

## Workflow

1. Read the target file (from the command argument).
2. Apply the rules above using Edit.
3. Report a one-line summary of what changed (properties converted, comments removed).
4. Do not run the linter or formatter.
