# Functor Refactor Plan

## Principle

Every feature is a **functor pair** (backend + frontend). Panels are empty containers. All content rendering, field interpretation, and UI logic lives in functor directories.

## Target Structure

```
src/functors/
├── math_domain/
│   ├── ObjCard.tsx          # renders name, sort, statement, proof, notes
│   ├── ObjBlock.tsx         # renders objblock in MDX
│   ├── ObjRef.tsx           # renders inline objref
│   ├── MorCard.tsx          # renders source → target, notes
│   ├── MorList.tsx          # renders incoming/outgoing morphisms
│   ├── sortConfig.ts        # sort → color mapping for math sorts
│   ├── MarkdownRenderer.tsx # MDX rendering (KaTeX, remark, rehype)
│   └── index.ts             # registers all components
│
├── ilean_parser/
│   ├── ObjCard.tsx          # lean declaration card (different style)
│   ├── sortConfig.ts        # lean-theorem, lean-definition, lean-instance colors
│   └── index.ts
│
├── network_analysis/
│   ├── NodeRenderer.tsx     # how to draw nodes on canvas (size, color, shape)
│   ├── EdgeRenderer.tsx     # how to draw edges (color, width, dash)
│   ├── SizeMapping.tsx      # size options UI (pagerank, betweenness, etc.)
│   ├── ColorMapping.tsx     # color options UI (community, spectral, etc.)
│   ├── ClusterMapping.tsx   # clustering options UI
│   ├── Settings.tsx         # physics + labels settings
│   └── index.ts
│
├── timestamp/
│   ├── TimeDisplay.tsx      # formats created_at, updated_at on cards
│   └── index.ts
│
└── registry.ts              # collects all functor frontend components
```

## Phases

### Phase 1: Registry + Inspector Panel
**Goal**: Inspector panel becomes empty container, cards rendered by functors.

1. Create `src/functors/registry.ts` — component registry interface
2. Create `src/functors/math_domain/` — move ObjCard, MorCard, MorList from `components/shared/`
3. Create `src/functors/ilean_parser/` — lean-specific ObjCard
4. Clear `src/panels/inspector/` — becomes thin container querying registry
5. Delete `src/components/shared/ObjCard.tsx`, `MorCard.tsx`, `MorList.tsx`
6. Test: cards still render correctly

### Phase 2: ReadView Panel
**Goal**: ReadView becomes empty container, MDX rendering is a functor.

1. Create `src/functors/math_domain/MarkdownRenderer.tsx` — move from `components/MarkdownRenderer.tsx`
2. Create `src/functors/math_domain/ObjBlock.tsx` — move from `components/shared/ObjBlock.tsx`
3. Create `src/functors/math_domain/ObjRef.tsx` — move from `components/shared/ObjRef.tsx`
4. ReadView fetches MDX, passes to math_domain's renderer via registry
5. Delete old `components/MarkdownRenderer.tsx`, `components/shared/ObjBlock.tsx`, `ObjRef.tsx`
6. Test: MDX renders with KaTeX, objblock, objref

### Phase 3: NetworkView Panel
**Goal**: NetworkView becomes empty canvas, rendering logic is in functors.

1. Create `src/functors/network_analysis/NodeRenderer.tsx` — how to draw each node
2. Create `src/functors/network_analysis/EdgeRenderer.tsx` — how to draw each edge
3. Create `src/functors/network_analysis/Settings.tsx` — move from `NetworkSettings.tsx`
4. Move `sortConfig.ts` → split into `math_domain/sortConfig.ts` + `ilean_parser/sortConfig.ts`
5. NetworkView only does d3-force simulation + canvas, delegates rendering to functor
6. Delete `NetworkSettings.tsx`, `sortConfig.ts`
7. Test: nodes colored by sort, size by analysis

### Phase 4: DetailView Panel
**Goal**: DetailView becomes empty container, content from functors.

1. DetailView queries registry for detail component
2. math_domain provides detail view (statement, proof, notes)
3. ilean_parser provides detail view (lean source link)
4. Test: clicking obj shows detail

### Phase 5: Cleanup
1. Delete all files in `src/components/shared/` (moved to functors)
2. Delete old `src/lib/sortConfig.ts`
3. Verify no panel imports from `components/shared/` directly
4. All imports go through `src/functors/registry.ts`

## Rules

- Panels import from `src/functors/registry.ts`, never directly from functor dirs
- Each functor frontend dir has `index.ts` that exports its components
- Backend functor and frontend functor share the same directory name
- No hardcoded field reads in panels — all field interpretation is in functors
- Each phase: clear old code first, then write new code
- Each phase: tests before code

## Panel Contract (after refactor)

| Panel | Lines | Does |
|---|---|---|
| ReadView | ~25 | fetch MDX, pass to registry renderer |
| NetworkView | ~50 | d3-force canvas, delegate node/edge drawing to registry |
| DetailView | ~15 | query registry for detail component |
| Inspector | ~20 | list objs, render each via registry card component |
| Explorer | ~100 | functor list + file tree (stays as-is) |
