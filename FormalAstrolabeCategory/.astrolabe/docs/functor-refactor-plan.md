# Functor Refactor Plan

## Principle

Every feature is a **functor pair** (backend + frontend). Panels are empty containers. All content rendering, field interpretation, and UI logic lives in functor directories.

## Current State — What Each Panel Does

### ReadView (workspace)
- Fetches `/api/docs/list` and `/api/docs/read`
- Displays MDX source text
- **Should be**: empty container that renders whatever the active functor's frontend component provides

### NetworkView (workspace)
- d3-force 2D canvas
- Reads `obj.sort` → color mapping (hardcoded in `sortConfig.ts`)
- Reads analysis data → size/color mapping (hardcoded in `NetworkSettings.tsx`)
- **Should be**: empty canvas, functors register what to render

### DetailView (workspace)
- Shows "Select an object or morphism"
- **Should be**: empty container

### Inspector / CardStack (right panel)
- Lists all obj as ObjCard
- ObjCard reads `name`, `sort`, `statement`, `proof`, `notes` (hardcoded)
- MorCard reads `source`, `target`, `sort`, `notes` (hardcoded)
- **Should be**: empty container, functor defines card layout

### ExplorerPanel (left panel)
- FUNCTORS section: lists functors with icons
- FILES section: project file tree
- **Should be**: stays as-is (it's already functor-aware)

## Target Structure

```
src/functors/
├── math_domain/
│   ├── ObjCard.tsx          # renders name, sort, statement, proof, notes
│   ├── ObjBlock.tsx         # renders objblock in MDX
│   ├── ObjRef.tsx           # renders inline objref
│   ├── MorCard.tsx          # renders source → target, notes
│   ├── sortConfig.ts        # sort → color mapping
│   └── index.ts             # registers components
│
├── ilean_parser/
│   ├── ObjCard.tsx          # renders lean declaration (different style)
│   ├── sortConfig.ts        # lean-theorem, lean-definition colors
│   └── index.ts
│
├── network_analysis/
│   ├── SizeMapping.tsx      # size options (pagerank, betweenness, etc.)
│   ├── ColorMapping.tsx     # color options (community, spectral, etc.)
│   ├── ClusterMapping.tsx   # clustering options
│   └── index.ts
│
├── timestamp/
│   ├── TimeDisplay.tsx      # formats created_at, updated_at
│   └── index.ts
│
└── registry.ts              # collects all functor frontend components
```

## What Gets Deleted

| Current location | Destination |
|---|---|
| `src/components/shared/ObjCard.tsx` | `src/functors/math_domain/ObjCard.tsx` |
| `src/components/shared/ObjBlock.tsx` | `src/functors/math_domain/ObjBlock.tsx` |
| `src/components/shared/ObjRef.tsx` | `src/functors/math_domain/ObjRef.tsx` |
| `src/components/shared/MorCard.tsx` | `src/functors/math_domain/MorCard.tsx` |
| `src/components/shared/MorList.tsx` | `src/functors/math_domain/MorList.tsx` |
| `src/lib/sortConfig.ts` | `src/functors/math_domain/sortConfig.ts` + `src/functors/ilean_parser/sortConfig.ts` |
| `src/panels/workspace/NetworkSettings.tsx` (size/color/cluster) | `src/functors/network_analysis/` |

## What Stays

| Location | Reason |
|---|---|
| `src/panels/workspace/ReadView.tsx` | Empty container (25 lines) |
| `src/panels/workspace/NetworkView.tsx` | Canvas container (d3-force) |
| `src/panels/workspace/DetailView.tsx` | Empty container |
| `src/panels/inspector/` | Container for cards |
| `src/panels/explorer/` | Already functor-aware |
| `src/stores/` | State management (zustand) |
| `src/hooks/` | Data loading |

## Execution Order

1. Create `src/functors/` directory
2. Create `src/functors/registry.ts` — functor component registry
3. Move ObjCard/ObjBlock/ObjRef/MorCard/MorList → `src/functors/math_domain/`
4. Move sortConfig → split into math_domain + ilean_parser
5. Move NetworkSettings size/color/cluster → `src/functors/network_analysis/`
6. Update all imports
7. Panels become thin containers that query the registry

## Rules

- Panels import from `src/functors/registry.ts`, never directly from functor dirs
- Each functor frontend dir has an `index.ts` that exports its components
- Backend functor and frontend functor share the same directory name
- No hardcoded field reads in panels — all field interpretation is in functors
