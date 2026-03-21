# Functor Refactor Plan

## Principle

Every feature is a **functor pair** (backend + frontend). Panels are empty containers. Each functor does ONE thing. server.py is just a router collector.

## Architecture

```
server.py                    ← collects all functor routers, no business logic
    ↓ mount
backend/functors/*/router.py ← each functor provides its own API routes
    ↕ REST API
src/functors/*/index.ts      ← each frontend functor knows its API endpoints
    ↑ registry
src/panels/*                 ← empty containers, query registry for components
```

## Functor Inventory

| Functor | Backend router | Frontend | API endpoints |
|---------|---------------|----------|---------------|
| `signature_crud` | CRUD obj/mor | — (data layer) | `POST/GET/PATCH/DELETE /api/signature/*` |
| `mdx_docs` | read/list docs | MarkdownRenderer, ObjBlock, ObjRef | `GET /api/docs/list`, `GET /api/docs/read` |
| `math_domain` | defaults, validation | ObjCard, MorCard, MorList, sortConfig | (hooks into signature_crud pipeline) |
| `ilean_parser` | parse .ilean | Lean ObjCard, lean sortConfig | `POST /api/functors/lean/import` |
| `network_analysis` | pagerank, betweenness, etc. | SizeMapping, ColorMapping, Settings | `GET /api/project/analysis/*` (24 endpoints) |
| `timestamp` | created_at, updated_at | TimeDisplay | (hooks into signature_crud pipeline) |
| `layout` | — | d3-force, canvas, node/edge renderer | — (pure frontend) |
| `file_browser` | list/read project files | FileTree, FileViewer | `GET /api/project/files`, `GET /api/project/file-content` |
| `viewport` | viewport state | — (store layer) | `GET/PATCH /api/canvas/viewport` |

## Target Structure

### Backend

```
backend/astrolabe/
├── server.py                    # ONLY: collect routers, mount to app
├── signature_storage.py         # (O, M, h) persistence
├── functors/
│   ├── base.py                  # AstrolabeFunctor base class
│   ├── __init__.py              # scan + register
│   ├── signature_crud/
│   │   └── router.py            # POST/GET/PATCH/DELETE /api/signature/*
│   ├── mdx_docs/
│   │   └── router.py            # GET /api/docs/list, /api/docs/read
│   ├── math_domain/
│   │   └── __init__.py          # defaults, validation (pipeline hook)
│   ├── ilean_parser/
│   │   ├── import_functor.py
│   │   └── router.py            # POST /api/functors/lean/import
│   ├── network_analysis/
│   │   ├── router.py            # GET /api/project/analysis/*
│   │   └── *.py                 # algorithm modules
│   ├── timestamp/
│   │   └── __init__.py          # on_create, on_update (pipeline hook)
│   ├── file_browser/
│   │   └── router.py            # GET /api/project/files, file-content
│   └── viewport/
│       └── router.py            # GET/PATCH /api/canvas/viewport
```

### Frontend

```
src/functors/
├── registry.ts                  # collects all functor components
│
├── mdx_docs/
│   ├── MarkdownRenderer.tsx     # KaTeX + remark + rehype
│   ├── ObjBlock.tsx             # <div class="objblock"> rendering
│   ├── ObjRef.tsx               # <objref> inline rendering
│   └── index.ts
│
├── math_domain/
│   ├── ObjCard.tsx              # renders name, sort, statement, proof, notes
│   ├── MorCard.tsx              # renders source → target, notes
│   ├── MorList.tsx              # incoming/outgoing morphisms
│   ├── sortConfig.ts            # theorem→gold, definition→blue, etc.
│   └── index.ts
│
├── ilean_parser/
│   ├── ObjCard.tsx              # lean declaration card style
│   ├── sortConfig.ts            # lean-theorem, lean-definition colors
│   └── index.ts
│
├── network_analysis/
│   ├── SizeMapping.tsx          # size options (pagerank, betweenness, etc.)
│   ├── ColorMapping.tsx         # color options (community, spectral, etc.)
│   ├── ClusterMapping.tsx       # clustering options
│   ├── Settings.tsx             # physics + labels
│   └── index.ts
│
├── layout/
│   ├── ForceSimulation.ts       # d3-force setup
│   ├── CanvasRenderer.tsx       # draw nodes + edges on canvas
│   ├── NodeRenderer.ts          # how to draw one node
│   ├── EdgeRenderer.ts          # how to draw one edge
│   └── index.ts
│
├── timestamp/
│   ├── TimeDisplay.tsx          # format timestamps on cards
│   └── index.ts
│
└── file_browser/
    ├── FileTree.tsx             # directory tree component
    ├── FileViewer.tsx           # file content display
    └── index.ts
```

### server.py after refactor (~30 lines)

```python
app = FastAPI()
app.add_middleware(CORSMiddleware, ...)

# Collect all functor routers
from .functors.signature_crud.router import router as sig_router
from .functors.mdx_docs.router import router as docs_router
from .functors.network_analysis.router import router as analysis_router
from .functors.ilean_parser.router import router as lean_router
from .functors.file_browser.router import router as files_router
from .functors.viewport.router import router as viewport_router

app.include_router(sig_router)
app.include_router(docs_router)
app.include_router(analysis_router)
app.include_router(lean_router)
app.include_router(files_router)
app.include_router(viewport_router)

# Scan user-installed functors
from .functors import scan_and_mount
scan_and_mount(app)
```

## Phases

### Phase 0: Backend — Extract routers from server.py
1. Create `functors/signature_crud/router.py` — move all `/api/signature/*` routes
2. Create `functors/mdx_docs/router.py` — move `/api/docs/*` routes
3. Create `functors/file_browser/router.py` — move `/api/project/files`, `/api/project/file-content`
4. Create `functors/viewport/router.py` — move `/api/canvas/viewport`
5. server.py becomes ~30 lines: just mount routers
6. Test: all API endpoints still work

### Phase 1: Frontend — Registry + Infrastructure
1. Create `src/functors/registry.ts` — component registry interface
2. Define: `registerObjCard`, `registerDocRenderer`, `registerNodeRenderer`, etc.
3. No panel changes yet

### Phase 2: Inspector Panel (cards)
1. Move ObjCard, MorCard, MorList → `src/functors/math_domain/`
2. Create `src/functors/ilean_parser/ObjCard.tsx`
3. Inspector queries registry
4. Delete `components/shared/ObjCard.tsx`, `MorCard.tsx`, `MorList.tsx`

### Phase 3: ReadView Panel (MDX rendering)
1. Move MarkdownRenderer → `src/functors/mdx_docs/`
2. Move ObjBlock, ObjRef → `src/functors/mdx_docs/`
3. ReadView: fetch + pass to registry
4. Delete old files

### Phase 4: NetworkView Panel (graph rendering)
1. Create `src/functors/layout/` — d3-force + canvas
2. Move NetworkSettings → `src/functors/network_analysis/`
3. Split sortConfig → math_domain + ilean_parser
4. Delete old files

### Phase 5: DetailView + File Browser
1. DetailView queries registry
2. Create `src/functors/file_browser/` from ExplorerPanel

### Phase 6: Cleanup
1. Delete `src/components/shared/`
2. Delete `src/components/MarkdownRenderer.tsx`
3. Verify: panels import only from registry
4. Verify: server.py has no business logic

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
5. server.py has no business logic — only router mounting
6. Each phase: delete old code, write new code, test
7. One functor = one responsibility
8. Frontend functor declares which API endpoints it uses
