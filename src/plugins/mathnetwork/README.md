# MathNetwork Plugin

Transforms `astrolabe.json` into a directed network for graph analysis. Works with both informal mathematics and Lean 4 formalizations.

## Data Model

Astrolabe entries have `ref` (ordered hash list) and `record` (JSON string).

- **Atoms** (degree 0): `ref = [self_hash]` → become **nodes**
- **Edges** (degree 1): `ref = [A, B]` → become **directed edges** A → B
- Edge sort is auto-derived as `(sort_A, sort_B)`

## Atom Sorts

| Category | Sorts |
|----------|-------|
| Informal math | `definition` `theorem` `lemma` `proposition` `corollary` `proof` |
| Lean 4 | `lean-definition` `lean-theorem` `lean-lemma` `lean-instance` `lean-proof` |
| Reference | `citation` |

## Record Fields

| Field | Description |
|-------|-------------|
| `sort` | Entry type (required) |
| `title` | Display name |
| `notes` | Content text — may contain LaTeX (`$...$`) and `\entryref{hash}{text}` |
| `content` | Source code (Lean entries) |
| `state` | Lean proof status: `proven` / `sorry` |
| `key` | Citation key (citation entries) |

## Network Analysis

### Size

Control node radius by a metric:

| Metric | Description |
|--------|-------------|
| `uniform` | All nodes same size |
| `degree` | Total degree (in + out) |
| `in-degree` | Incoming edges only |
| `out-degree` | Outgoing edges only |
| `pagerank` | Influence-weighted importance |
| `betweenness` | Bridge/bottleneck importance |
| `katz` | Katz centrality |
| `hub` | HITS hub score |
| `authority` | HITS authority score |
| `depth` | DAG depth from roots |
| `reachability` | Number of reachable descendants |

### Color

Control node color by a mode:

| Mode | Description |
|------|-------------|
| `sort` | Hash of sort string → distinct color per type |
| `community` | Louvain community detection |
| `layer` | DAG depth gradient (shallow → deep) |
| `pagerank` | PageRank gradient (low → high) |
| `depth` | DAG depth gradient |
| `spectral` | Spectral clustering colors |
| `curvature` | Betweenness-based curvature proxy |

Colors propagate to all UI components: network nodes, entry blocks in ReadView, entry links, and the detail panel.

### Cluster

Group nodes by detected communities with adjustable tightness:

| Method | Description |
|--------|-------------|
| `none` | No clustering |
| `louvain` | Greedy modularity community detection |
| `sort` | Group by atom sort |
| `stage` | Group by topological stage (DAG depth) |
| `spectral` | Spectral clustering via Laplacian eigenvectors |

**Tightness** (0–100): controls how strongly same-cluster nodes attract each other.

## Convention

Any project can use MathNetwork as long as its `astrolabe.json` follows this convention:

1. Each entry is `{ "ref": [...], "record": "<JSON string>" }`
2. Atoms have `ref = [own_hash]`, record contains at least `{"sort": "..."}`
3. Edges have `ref = [hash_A, hash_B]`, record contains `{"sort": "(sort_A, sort_B)"}`
4. Hash = `SHA256(ref₁ || 0x00 || ref₂ || 0x00 || ... || record)[:12 hex]`

The plugin does not interpret record content beyond `sort` — all other fields (`title`, `notes`, `content`, `state`, `key`) are optional and used only for display.
