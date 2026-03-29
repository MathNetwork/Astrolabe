# 1-Skeleton Plugin — Development Plan

## Status

- [x] Phase 1: Plugin infrastructure (registry, toggle, ExplorerPanel)
- [x] Phase 2: Graph transformation (entry → skeleton mode switch)
- [x] Phase 3: Edge rendering (colored directed edges in skeleton mode)
- [x] Phase 4: DetailEdges (edges grouped by sort, clickable)
- [ ] Phase 5: Network analysis — By Size
- [ ] Phase 6: Network analysis — By Color
- [ ] Phase 7: Network analysis — Clustering

---

## UI Location

All analysis controls live in the **NetworkSettings panel** (⚙ button).
They appear **only when SKELETON mode is active**. When SKELETON is off,
only Physics and Labels are shown (current behavior).

```
┌─ NetworkSettings ──────────────────────────────────┐
│                                                     │
│  PHYSICS                                            │
│    Gravity ═══○═══  50                               │
│    Repulsion ═══○═══  100                            │
│    Link Distance ═══○═══  30                         │
│    Friction ═══○═══  40                              │
│                                                     │
│  LABELS                                             │
│    Hidden                                           │
│                                                     │
│  ── below only when SKELETON mode is active ──      │
│                                                     │
│  SIZE BY                                            │
│    [Uniform ▾]                                       │
│                                                     │
│  COLOR BY                                           │
│    [Sort ▾]                                          │
│                                                     │
│  CLUSTER                                            │
│    [None ▾]                                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Phase 5: By Size

Node size controlled by a selectable metric.

**Size metrics:**
| Metric | Source | Description |
|--------|--------|-------------|
| Uniform | — | All nodes same size (default) |
| Degree | degree.py | Total degree (in + out) |
| In-degree | degree.py | Number of incoming edges |
| Out-degree | degree.py | Number of outgoing edges |
| PageRank | centrality.py | Influence-weighted importance |
| Betweenness | centrality.py | Bridge/bottleneck importance |
| DAG depth | dag.py | Longest path from any root |
| Reachability | dag.py | Number of reachable descendants |

**TDD steps:**
1. Test: `graph_builder.py` — build DiGraph from entries, verify node/edge counts
2. Test: `degree.py` — degree stats on sample graph
3. Test: `centrality.py` — PageRank/betweenness on sample graph
4. Test: `dag.py` — depth/reachability on sample DAG
5. Test: frontend normalize function (values → radius range)
6. Implement backend endpoint
7. Implement frontend dropdown + radius mapping

**Implementation:**
- [ ] Backend: `graph_builder.py` — build networkx DiGraph from 1-skeleton
- [ ] Backend: restore `degree.py`, `centrality.py`, `dag.py` (adapted)
- [ ] Backend: `POST /api/plugins/skeleton/analyze` endpoint
- [ ] Frontend: `NetworkSettings` — "SIZE BY" dropdown (skeleton mode only)
- [ ] Frontend: normalize metric values → node radius
- [ ] Tests first for each module

---

## Phase 6: By Color

Node color controlled by a selectable mode.

**Color modes:**
| Mode | Source | Description |
|------|--------|-------------|
| By Sort | sortColors.ts | Current default — hash(sort) → HSL |
| By Community | community.py | Louvain community → color per community |
| By PageRank | centrality.py | Gradient: low (cool) → high (warm) |
| By Depth | dag.py | Gradient: shallow (light) → deep (dark) |
| By Stage | storage.py | Existing stage decomposition |
| By Entropy | entropy.py | Local structural entropy per node |
| By Curvature | optimal_transport.py | Ricci curvature: positive → negative |

**TDD steps:**
1. Test: `community.py` — Louvain on sample graph, verify partition
2. Test: gradient color mapping function (value → HSL)
3. Test: edge color inheritance from endpoints
4. Implement backend community/entropy/curvature endpoints
5. Implement frontend dropdown + color mapping

**Implementation:**
- [ ] Backend: restore `community.py`, `entropy.py`, `optimal_transport.py`
- [ ] Frontend: `NetworkSettings` — "COLOR BY" dropdown (skeleton mode only)
- [ ] Frontend: gradient interpolation (value → cool/warm HSL)
- [ ] Frontend: legend component showing color scale
- [ ] Tests first for each module

---

## Phase 7: Clustering

Visual grouping of nodes by detected communities.

**Clustering methods:**
| Method | Source | Description |
|--------|--------|-------------|
| None | — | No clustering (default) |
| Louvain | community.py | Modularity-based community detection |
| Spectral | advanced.py | Eigenvalue-based k-clustering |
| By Sort | — | Group by atom sort |
| By Stage | storage.py | Group by topological stage |

**TDD steps:**
1. Test: cluster assignment on sample graph
2. Test: convex hull computation from node positions
3. Test: force modifier pulls nodes toward cluster center
4. Implement backend cluster endpoint
5. Implement frontend overlay rendering

**Implementation:**
- [ ] Backend: `/api/plugins/skeleton/clusters` endpoint
- [ ] Frontend: `NetworkSettings` — "CLUSTER" dropdown (skeleton mode only)
- [ ] Frontend: canvas overlay (convex hull / background shading per cluster)
- [ ] Frontend: cluster label at centroid
- [ ] Frontend: d3-force cluster attraction modifier
- [ ] Tests first for each module

---

## Backend Module Structure

Restore from git history (`6b3f3c2^`) into `backend/astrolabe_app/analysis/`:

```
backend/astrolabe_app/analysis/
├── __init__.py
├── graph_builder.py     ← build networkx DiGraph from 1-skeleton
├── degree.py            ← degree distribution, statistics
├── centrality.py        ← PageRank, betweenness
├── dag.py               ← depth, layers, bottleneck, critical path
├── community.py         ← Louvain community detection
├── entropy.py           ← Von Neumann entropy
├── optimal_transport.py ← Ricci curvature
├── advanced.py          ← transitive reduction, spectral clustering
└── router.py            ← FastAPI endpoints for analysis
```

**Key adaptation:**
- Old code worked on signature graph (obj as nodes, mor as edges)
- New code works on 1-skeleton (atoms as nodes, degree-1 entries as edges)
- `graph_builder.py` needs rewrite; analysis modules mostly unchanged

**Dependencies:**
- networkx (required for all)
- python-louvain (community detection)
- scipy + numpy (spectral methods, entropy)
- Optional: GraphRicciCurvature, powerlaw, gudhi

---

## Development Rules

1. **TDD**: write failing test first, then implement, then refactor
2. **Backend tests**: `pytest` in `backend/tests/test_analysis_*.py`
3. **Frontend tests**: `vitest` in `src/plugins/skeleton/__tests__/`
4. **One metric at a time**: don't implement all metrics in one PR
5. **Incremental**: each sub-phase (5a, 5b, ...) is a separate commit

---

## Execution Order

1. **Phase 5a**: `graph_builder.py` + `degree.py` → "Size by: Degree" (test first)
2. **Phase 5b**: `centrality.py` → "Size by: PageRank / Betweenness" (test first)
3. **Phase 5c**: `dag.py` → "Size by: Depth / Reachability" (test first)
4. **Phase 6a**: "Color by: Sort" already works → add dropdown to Settings
5. **Phase 6b**: `community.py` → "Color by: Community" (test first)
6. **Phase 6c**: gradient mapping → "Color by: PageRank / Depth" (test first)
7. **Phase 7a**: cluster overlay rendering in canvas (test first)
8. **Phase 7b**: force-directed cluster grouping (test first)
