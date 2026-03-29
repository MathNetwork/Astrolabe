# 1-Skeleton View Plugin

## Overview

Transform the simplicial reference view into a classical directed graph:
atoms become nodes, degree-1 entries become directed edges.

## Phase 1: Plugin Infrastructure

- [ ] `src/plugins/types.ts` — `AstrolabePlugin` interface
- [ ] `src/plugins/registry.ts` — zustand store: `enabledPlugins`, `register()`, `toggle()`
- [ ] Wire into NetworkSettings: plugin toggle section

## Phase 2: Graph Transformation

- [ ] `src/plugins/skeleton/transform.ts`
  - Input: ref-graph nodes + links (all entries)
  - Output: filtered graph (degree-0 nodes only, degree-1 entries as edges)
  - Edge carries: source (ref[0]), target (ref[1]), sort, color, entry hash
  - Handle multi-edges between same pair (curve offset by index)
- [ ] `src/plugins/skeleton/index.ts` — plugin declaration with `transformGraph`
- [ ] `NetworkView.tsx` — apply active plugin's `transformGraph` before rendering

## Phase 3: Edge Rendering

- [ ] Draw directed edges with arrows in NetworkView canvas
- [ ] Color edges by derived sort (from sortColors)
- [ ] Click edge to select the underlying degree-1 entry
- [ ] Hover tooltip showing sort + entry hash
- [ ] Multi-edge curve offset for parallel edges

## Phase 4: Detail Panel Enhancement

- [ ] `src/plugins/skeleton/DetailEdges.tsx`
  - When an atom is selected, show all connected degree-1 entries
  - Group by sort: outgoing (ref[0]=self) vs incoming (ref[1]=self)
  - Each item clickable (select that entry)
  - Show sort color dot + target atom title
- [ ] Wire into DetailView: render active plugin's `DetailSection` below entry data

## Phase 5: Polish

- [ ] Edge label option (show sort text on edges)
- [ ] Filter edges by sort (toggle specific sorts on/off)
- [ ] Legend showing sort → color mapping
- [ ] Persist plugin enabled state in localStorage

## Data Flow

```
ref-graph API → raw {nodes, links}
                     ↓
              plugin.transformGraph()
                     ↓
              ForceNode[] (atoms only)
              ForceLink[] (degree-1 as edges)
                     ↓
              d3-force simulation
                     ↓
              Canvas render (nodes + directed edges)
```

## Key Decisions

- Plugin only transforms frontend data, no backend changes
- ref-graph API already returns all needed data (degree, record per node)
- sortColors already handles derived sort "(a, b)" coloring
- Plugin is opt-in: default off, toggle in NetworkSettings
