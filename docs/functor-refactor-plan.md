# Functor Refactor Plan

## Principle

Every feature is a **functor pair** (backend + frontend). Panels are empty containers. Each functor does ONE thing.

## Functor Inventory

| Functor | Backend | Frontend | Does |
|---------|---------|----------|------|
| `mdx_docs` | read/list .astrolabe/docs/ | MarkdownRenderer, ObjBlock, ObjRef | MDX document reading and rendering |
| `math_domain` | defaults (name, sort, statement, proof, notes), validation | ObjCard, MorCard, MorList, sortConfig | Math field semantics and card rendering |
| `ilean_parser` | parse .ilean files | Lean-style ObjCard, lean sortConfig | Lean compilation import |
| `network_analysis` | pagerank, betweenness, communities, etc. | SizeMapping, ColorMapping, ClusterMapping, Settings | Graph metrics computation and visualization mapping |
| `timestamp` | created_at, updated_at | TimeDisplay | Temporal metadata |
| `layout` | — | d3-force simulation, canvas drawing, node/edge renderer | 2D graph layout and rendering |
| `file_browser` | /api/project/files, /api/project/file-content | FileTree, FileViewer | Project file browsing |

## Target Structure

```
backend/astrolabe/functors/
├── math_domain/          # field defaults + validation
├── ilean_parser/         # .ilean parsing
├── network_analysis/     # graph metrics
├── timestamp/            # created_at/updated_at
├── mdx_docs/             # NEW: read/list docs (extract from server.py)
└── base.py

src/functors/
├── mdx_docs/
│   ├── MarkdownRenderer.tsx   # KaTeX + remark + rehype
│   ├── ObjBlock.tsx           # <div class="objblock"> rendering
│   ├── ObjRef.tsx             # <objref> inline rendering
│   └── index.ts
│
├── math_domain/
│   ├── ObjCard.tsx            # renders name, sort, statement, proof, notes
│   ├── MorCard.tsx            # renders source → target, notes
│   ├── MorList.tsx            # incoming/outgoing morphisms
│   ├── sortConfig.ts          # theorem→gold, definition→blue, etc.
│   └── index.ts
│
├── ilean_parser/
│   ├── ObjCard.tsx            # lean declaration card style
│   ├── sortConfig.ts          # lean-theorem, lean-definition colors
│   └── index.ts
│
├── network_analysis/
│   ├── SizeMapping.tsx        # size options (pagerank, betweenness, etc.)
│   ├── ColorMapping.tsx       # color options (community, spectral, etc.)
│   ├── ClusterMapping.tsx     # clustering options
│   ├── Settings.tsx           # physics + labels
│   └── index.ts
│
├── layout/
│   ├── ForceSimulation.ts     # d3-force setup
│   ├── CanvasRenderer.tsx     # draw nodes + edges on canvas
│   ├── NodeRenderer.ts        # how to draw one node
│   ├── EdgeRenderer.ts        # how to draw one edge
│   └── index.ts
│
├── timestamp/
│   ├── TimeDisplay.tsx        # format timestamps on cards
│   └── index.ts
│
├── file_browser/
│   ├── FileTree.tsx           # directory tree component
│   ├── FileViewer.tsx         # file content display
│   └── index.ts
│
└── registry.ts                # collects all functor components
```

## Phases

### Phase 1: Registry + Infrastructure
1. Create `src/functors/registry.ts` — component registry interface
2. Define registry API: `registerObjCard`, `registerDocRenderer`, etc.
3. No panel changes yet — just the infrastructure

### Phase 2: Inspector Panel (cards)
1. Move `components/shared/ObjCard.tsx` → `src/functors/math_domain/ObjCard.tsx`
2. Move `components/shared/MorCard.tsx` → `src/functors/math_domain/MorCard.tsx`
3. Move `components/shared/MorList.tsx` → `src/functors/math_domain/MorList.tsx`
4. Create `src/functors/ilean_parser/ObjCard.tsx` for lean-specific card
5. Inspector panel queries registry for card components
6. Delete `components/shared/ObjCard.tsx`, `MorCard.tsx`, `MorList.tsx`

### Phase 3: ReadView Panel (MDX rendering)
1. Create `src/functors/mdx_docs/MarkdownRenderer.tsx` — move from `components/MarkdownRenderer.tsx`
2. Move `components/shared/ObjBlock.tsx` → `src/functors/mdx_docs/ObjBlock.tsx`
3. Move `components/shared/ObjRef.tsx` → `src/functors/mdx_docs/ObjRef.tsx`
4. ReadView fetches MDX, passes to mdx_docs renderer via registry
5. Delete old files
6. Backend: extract docs routes from server.py → `backend/functors/mdx_docs/`

### Phase 4: NetworkView Panel (graph rendering)
1. Create `src/functors/layout/` — move d3-force + canvas from NetworkView
2. Create `src/functors/network_analysis/Settings.tsx` — move from NetworkSettings.tsx
3. Move `sortConfig.ts` → split into `math_domain/sortConfig.ts` + `ilean_parser/sortConfig.ts`
4. NetworkView becomes thin container
5. Delete `NetworkSettings.tsx`, `sortConfig.ts`, `graph2d.ts`

### Phase 5: DetailView + File Browser
1. DetailView queries registry for detail component per sort
2. Create `src/functors/file_browser/` — move FileTree from ExplorerPanel
3. ExplorerPanel FILES section delegates to file_browser functor

### Phase 6: Cleanup
1. Delete `src/components/shared/` (everything moved)
2. Delete `src/components/MarkdownRenderer.tsx`
3. Verify: no panel imports anything except from `src/functors/registry.ts`
4. Verify: every functor has matching backend + frontend directory

## Panel Contract (after refactor)

| Panel | Lines | Does |
|---|---|---|
| ReadView | ~25 | fetch MDX, pass to registry renderer |
| NetworkView | ~30 | init canvas, delegate to layout functor |
| DetailView | ~15 | query registry for detail component |
| Inspector | ~20 | list objs, render each via registry card |
| Explorer | ~50 | functor list + file_browser functor |

## Rules

1. Panels import ONLY from `src/functors/registry.ts`
2. Each functor has `index.ts` that registers its components
3. Backend functor and frontend functor share the same directory name
4. No hardcoded field reads in panels
5. Each phase: delete old code, write new code, test
6. One functor = one responsibility
