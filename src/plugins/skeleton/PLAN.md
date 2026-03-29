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

## Phase 5: By Size

Node size controlled by a selectable metric. Dropdown in NetworkSettings (only in skeleton mode).

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

**Implementation:**
- [ ] Backend: `POST /api/plugins/skeleton/analyze` endpoint
  - Input: project path + metric name
  - Output: `{ node_id: value }` mapping
  - Reuse old `degree.py`, `centrality.py`, `dag.py` (adapted for 1-skeleton)
- [ ] Backend: `graph_builder.py` — build networkx graph from astrolabe entries (atoms as nodes, degree-1 as edges)
- [ ] Frontend: size metric dropdown in NetworkSettings
- [ ] Frontend: normalize values → node radius mapping
- [ ] Tests: verify metric computation on sample graph

---

## Phase 6: By Color

Node color controlled by a selectable mode. Dropdown in NetworkSettings (only in skeleton mode).

**Color modes:**
| Mode | Source | Description |
|------|--------|-------------|
| By Sort | sortColors.ts | Current default — hash(sort) → HSL |
| By Community | community.py | Louvain community detection → color per community |
| By PageRank | centrality.py | Gradient: low (cool) → high (warm) |
| By Depth | dag.py | Gradient: shallow (light) → deep (dark) |
| By Stage | storage.py | Existing stage decomposition |
| By Entropy | entropy.py | Local structural entropy per node |
| By Curvature | optimal_transport.py | Ricci curvature: positive (blue) → negative (red) |

**Implementation:**
- [ ] Backend: extend `/api/plugins/skeleton/analyze` to return color metrics
- [ ] Frontend: color mode dropdown in NetworkSettings
- [ ] Frontend: gradient color mapping (value → HSL interpolation)
- [ ] Frontend: legend showing color scale
- [ ] Edge color inherits from source node color (or blend of endpoints)
- [ ] Tests: verify color assignment consistency

---

## Phase 7: Clustering

Visual grouping of nodes by detected communities.

**Clustering methods:**
| Method | Source | Description |
|--------|--------|-------------|
| Louvain | community.py | Modularity-based community detection |
| Spectral | advanced.py | Eigenvalue-based k-clustering |
| Sort groups | — | Group by atom sort (definition, theorem, etc.) |
| Stage layers | storage.py | Group by topological stage |

**Implementation:**
- [ ] Backend: `/api/plugins/skeleton/clusters` endpoint
  - Input: project path + method
  - Output: `{ node_id: cluster_id }` + `{ cluster_id: { label, color } }`
- [ ] Frontend: cluster overlay in NetworkView
  - Convex hull or background shading per cluster
  - Cluster label at centroid
  - Nodes pulled toward cluster center (force modifier)
- [ ] Frontend: cluster toggle in NetworkSettings
- [ ] DetailView: show which cluster the selected node belongs to
- [ ] Tests: verify cluster assignment on sample graph

---

## Backend Module Recovery Plan

Restore from git history (`6b3f3c2^`) into `backend/astrolabe_app/analysis/`:

```
backend/astrolabe_app/analysis/
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

## UI Flow

```
┌─ NetworkSettings (skeleton mode) ─────────────────┐
│                                                     │
│  Size by: [Uniform ▾]  ← dropdown                  │
│    Uniform / Degree / PageRank / Betweenness / ...  │
│                                                     │
│  Color by: [Sort ▾]    ← dropdown                   │
│    Sort / Community / PageRank / Depth / Curvature   │
│                                                     │
│  Cluster: [None ▾]     ← dropdown                   │
│    None / Louvain / Spectral / Sort / Stage          │
│                                                     │
│  Physics: gravity ═══○═══ repulsion                  │
│           friction ═══○═══ linkDistance               │
└─────────────────────────────────────────────────────┘
```

---

## Execution Order

1. **Phase 5a**: Restore `graph_builder.py` + `degree.py` → "By Size: Degree"
2. **Phase 5b**: Restore `centrality.py` → "By Size: PageRank / Betweenness"
3. **Phase 5c**: Restore `dag.py` → "By Size: Depth / Reachability"
4. **Phase 6a**: "By Color: Sort" already works → add dropdown
5. **Phase 6b**: Restore `community.py` → "By Color: Community"
6. **Phase 6c**: Gradient color mapping → "By Color: PageRank / Depth"
7. **Phase 7a**: Cluster overlay rendering in canvas
8. **Phase 7b**: Force-directed cluster grouping
