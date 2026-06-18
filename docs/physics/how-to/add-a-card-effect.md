# How to give a card a graph effect

This guide shows how to make a project card trigger a relationship graph when it appears: the
scattered glyphs (and the GitHub button, and the card itself) get sprung together into a labeled
node graph, then released when the card leaves. This is how the Constellation card works. For
why the graph is an additive effect rather than an actor or a peer, see the
[explanation](../explanation/architecture.md#relationship-graphs-additive-effects-over-shared-bodies).

The graph itself (`RelationGraph` in `src/lib/physics/relation-graph.ts`) is already generic over
`{ body }` nodes, so you usually do **not** edit it. You wire a new effect by assembling a spec
and toggling it from the composition root (`src/routes/+page.svelte`).

## 1. Get the bodies you want to link

A graph node is just a live Matter body. Both glyphs and a card expose theirs:

- glyph (or the GitHub button) bodies: `glyphs.bodyFor(el)` returns the live body for a
  registered element, or `null` if it has none yet (bodies only exist while drifting);
- the card hub body: `card.actor.body`, non-null once the card has tossed in.

The bodies must exist when you activate. A card's effect fires when it crosses its threshold,
and the glyphs drift in from a much lower threshold, so by then they are live. The stage fans
scroll to actors in registration order (glyphs first), so the glyph bodies are built before the
card's `onStateChange` runs.

## 2. Build the spec

A `GraphSpec` is a `hub` plus a list of `clusters`. Each cluster's consecutive nodes get an
intra-link, and its anchor (the first node by default) gets one link to the hub:

```ts
const spec: GraphSpec = {
	hub: { body: card.actor.body! },
	clusters: [
		{
			nodes: lettersOfWord.map((body) => ({ body })),
			hubLabel: 'relates to',
			intraLabel: 'same word'
		},
		{ nodes: [{ body: buttonBody }], hubLabel: 'links to source' } // a singleton needs no intra label
	]
};
```

Keep `intraLabel` short: those edges are tiny. Resolve any `null` bodies out before building the
nodes.

## 3. Toggle it from the card's state

Register the graph as an actor, then activate on `'active'` and tear down on `'ejecting'`:

```ts
const graph = new RelationGraph();
stage.add(graph);

card.actor.onStateChange = (state) => {
	if (state === 'active') graph.activate(buildSpec());
	else if (state === 'ejecting') graph.deactivate();
};
```

Deactivate on `'ejecting'`, not `'dormant'`: it must run while the hub body is still alive so the
constraints attached to it are removed before the body is. If your effect shares bodies with the
warp (the GitHub button does), also `graph.deactivate()` at the top of the warp handler so the
springs are gone before the warp grabs the glyphs.

## 4. Tune the feel

The look and the physics are all in `GraphConfig` (`GRAPH_DEFAULTS` in `relation-graph.ts`):
spring stiffness/damping, the size-based intra rest length (`intraSpread`), the hub radius
(`hubLength`), the settling damping (`memberFrictionAir`), edge colors/widths, and label sizes.
Pass overrides to the constructor: `new RelationGraph({ hubLength: 240 })`.

## Checklist

- [ ] The bodies you link are live when you activate (glyphs drift in before the card's threshold).
- [ ] `null` bodies are filtered out of the spec.
- [ ] You deactivate on `'ejecting'` (while the hub body still exists), not on `'dormant'`.
- [ ] If the effect shares bodies with the warp, the warp handler deactivates the graph first.
- [ ] `RelationGraph` already no-ops under reduced motion; do not add a static fallback to it.
