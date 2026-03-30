# MathNetwork Plugin

Transforms \`astrolabe.json\` into a directed network for graph analysis. Works with both informal mathematics and Lean 4 formalizations.

## Architecture

\`\`\`
astrolabe.json
     │
     ▼
┌─────────────────────────────┐
│  Backend: skeleton_graph.py │
│  build_skeleton_view()      │
│    ├─ graph_builder.py      │  atoms → nodes
│    ├─ degree.py             │  degree metrics
│    ├─ centrality.py         │  PageRank, betweenness, Katz, HITS
│    ├─ dag.py                │  depth, reachability
│    ├─ community.py          │  Louvain community detection
│    └─ cluster.py            │  clustering (Louvain, spectral, sort, stage)
└─────────────┬───────────────┘
              │  GET /api/plugins/skeleton/graph?size=&color=&cluster=
              ▼
┌─────────────────────────────┐
│  Frontend: NetworkView      │
│    nodes[] with radius/color│
│    edges[] with color       │
│    d3-force simulation      │
│    cluster attraction force │
└─────────────┬───────────────┘
              │  window.__skeletonColors
              ▼
┌─────────────────────────────┐
│  Color Propagation          │
│    entryColor.ts            │
│    ├─ EntryBlock            │
│    ├─ EntryLink             │
│    ├─ EntryDetail           │
│    └─ DetailEdges           │
└─────────────────────────────┘
\`\`\`

## Data Model

Each entry in \`astrolabe.json\`:

\`\`\`json
{
  "<12-char-hash>": {
    "ref": ["<hash>", ...],
    "record": "<JSON string>"
  }
}
\`\`\`

- **Atoms** (degree 0): \`ref = [self_hash]\` → become **nodes**
- **Edges** (degree 1): \`ref = [A, B]\` → become **directed edges** A → B
- **Hash**: \`SHA256(ref₁ || 0x00 || ref₂ || ... || record)[:12 hex]\`

## Record Examples

### Informal math — theorem

\`\`\`json
{
  "sort": "theorem",
  "title": "Rigidity",
  "notes": "If $|S|\\ge 2$, then $\\mathrm{Aut}(D_n(S))$ is trivial."
}
\`\`\`

### Informal math — proof

\`\`\`json
{
  "sort": "proof",
  "notes": "Any automorphism $\\varphi$ maps \\entryref{b8e5da5e7ed4}{the unique Hamilton cycle} $H$ to itself..."
}
\`\`\`

### Informal math — definition

\`\`\`json
{
  "sort": "definition",
  "title": "Support digraph",
  "notes": "Given $Q\\in\\mathbb{R}^{n\\times n}$, its *support digraph* $D(Q)$ is..."
}
\`\`\`

### Lean 4 — theorem (statement only)

\`\`\`json
{
  "sort": "lean-theorem",
  "title": "HessenbergDigraphs.loopless_iff",
  "state": "proven",
  "content": "theorem loopless_iff (n : ℕ) (S : Finset ℕ) (hn : 3 ≤ n) (hS : ValidS n S) :\n    (∀ v, 1 ≤ v → v ≤ n → ¬Loop n S v) ↔\n    ((∀ k ∈ S, 2 ≤ k ∧ k ≤ n - 2) ∧ NoConsecutive S)",
  "notes": "A subset S yields a loopless D_n(S) iff S ⊆ {2,...,n-2} and S has no consecutive elements."
}
\`\`\`

### Lean 4 — proof (tactic body)

\`\`\`json
{
  "sort": "lean-proof",
  "title": "HessenbergDigraphs.loopless_iff (proof)",
  "content": "constructor <;> intro h;\n  · constructor;\n    · intro k hk; ..."
}
\`\`\`

### Citation

\`\`\`json
{
  "sort": "citation",
  "key": "Gragg1986",
  "notes": "W. B. Gragg. The QR algorithm for unitary Hessenberg matrices. J. Comput. Appl. Math. 16 (1986) 1-8."
}
\`\`\`

### Degree-1 edge (auto-derived sort)

\`\`\`json
{
  "sort": "(theorem, proof)"
}
\`\`\`

## Network Analysis

### Size — node radius

| Metric | Formula | Description |
|--------|---------|-------------|
| \`uniform\` | $r = 6$ | All nodes same size |
| \`degree\` | $r \\propto \\deg(v)$ | Total degree (in + out) |
| \`in-degree\` | $r \\propto \\deg^-(v)$ | Incoming edges only |
| \`out-degree\` | $r \\propto \\deg^+(v)$ | Outgoing edges only |
| \`pagerank\` | $r \\propto \\pi(v)$ where $\\pi = \\alpha M\\pi + (1-\\alpha)\\mathbf{1}/n$ | Influence-weighted importance |
| \`betweenness\` | $r \\propto \\sum_{s \\neq v \\neq t} \\frac{\\sigma_{st}(v)}{\\sigma_{st}}$ | Fraction of shortest paths through $v$ |
| \`katz\` | $r \\propto \\sum_{k=1}^{\\infty} \\alpha^k (A^k \\mathbf{1})_v$ | Attenuated path count centrality |
| \`hub\` | $r \\propto h(v)$ where $h = A \\cdot a$, $a = A^T \\cdot h$ | HITS hub score |
| \`authority\` | $r \\propto a(v)$ where $a = A^T \\cdot h$, $h = A \\cdot a$ | HITS authority score |
| \`depth\` | $r \\propto \\max\\text{-path from roots}$ | DAG depth (cycles removed) |
| \`reachability\` | $r \\propto |\\text{descendants}(v)|$ | Reachable node count |

### Color — node color

| Mode | Method |
|------|--------|
| \`sort\` | $\\text{hue} = \\text{hash}(\\text{sort}) \\mod 360$ — deterministic color per type |
| \`community\` | Greedy modularity maximization (Louvain-like) |
| \`layer\` | DAG depth → cool (blue) to warm (red) gradient |
| \`pagerank\` | PageRank value → cool to warm gradient |
| \`depth\` | DAG depth → cool to warm gradient |
| \`spectral\` | Community detection via spectral method |
| \`curvature\` | Betweenness centrality as curvature proxy |

Colors propagate to: network nodes, entry blocks, entry links, detail panel.

### Cluster — node grouping

| Method | Algorithm |
|--------|-----------|
| \`none\` | No clustering |
| \`louvain\` | Greedy modularity communities on undirected graph |
| \`sort\` | Group by atom sort string |
| \`stage\` | Group by topological stage (DAG depth from roots) |
| \`spectral\` | $k$-means on Laplacian eigenvectors $L = D - A$, $k$ from eigengap |

**Tightness** (0–100): cluster attraction force strength $f = \\text{tightness} \\cdot \\alpha \\cdot (c - x)$ where $c$ = cluster centroid.

## Convention

Any project can use MathNetwork if its \`astrolabe.json\` follows:

1. Entry: \`{ "ref": [...], "record": "<JSON string>" }\`
2. Atom: \`ref = [own_hash]\`, record has \`{"sort": "..."}\`
3. Edge: \`ref = [hash_A, hash_B]\`, record has \`{"sort": "(sort_A, sort_B)"}\`
4. Hash: \`SHA256(ref₁ || 0x00 || ref₂ || 0x00 || ... || record)[:12 hex]\`

The plugin does not interpret record beyond \`sort\` — all other fields are optional and used for display only.
