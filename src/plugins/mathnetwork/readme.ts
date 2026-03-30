export default `# MathNetwork Plugin

Transforms \`astrolabe.json\` into a directed network for graph analysis.

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
              │  entryColor.ts
              ▼
┌─────────────────────────────┐
│  Color Propagation          │
│    ├─ EntryBlock (ReadView) │
│    ├─ EntryLink  (ReadView) │
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
- Edge sort is auto-derived as \`(sort_A, sort_B)\`

---

## Informal Mathematics

Natural language mathematics with LaTeX notation.

### Sorts

\`definition\` \`theorem\` \`lemma\` \`proposition\` \`corollary\` \`proof\`

### Record: definition

\`\`\`json
{
  "sort": "definition",
  "title": "Support digraph",
  "notes": "Given $Q\\\\in\\\\mathbb{R}^{n\\\\times n}$, its *support digraph* $D(Q)$ is the directed graph on $[n]$, where arc $(i,j)$ exists iff $Q_{ij}\\\\neq 0$."
}
\`\`\`

### Record: theorem / lemma / proposition / corollary

\`\`\`json
{
  "sort": "theorem",
  "title": "Rigidity",
  "notes": "If $|S|\\\\ge 2$, then $\\\\mathrm{Aut}(D_n(S))$ is trivial. Hence $D_n(S)\\\\cong D_n(S')$ implies $S=S'$."
}
\`\`\`

### Record: proof

\`\`\`json
{
  "sort": "proof",
  "notes": "Any automorphism $\\\\varphi$ maps \\\\entryref{b8e5da5e7ed4}{the unique Hamilton cycle} $H$ to itself, so $\\\\varphi$ is a cyclic rotation. By \\\\entryref{1f57ae8911a9}{Proposition 2}, vertex $s_{m-1}$ has unique in-degree $m$..."
}
\`\`\`

Notes may contain:
- LaTeX: \`$...$\` for inline, \`$$...$$\` for display
- Entry references: \`\\\\entryref{hash}{display text}\`
- Markdown: \`*italic*\`, \`**bold**\`, lists

---

## Formal Mathematics (Lean 4)

Machine-checked formalizations. Statements and proofs are separate atoms.

### Sorts

\`lean-definition\` \`lean-theorem\` \`lean-lemma\` \`lean-instance\` \`lean-proof\`

### Record: lean-theorem (statement)

\`\`\`json
{
  "sort": "lean-theorem",
  "title": "HessenbergDigraphs.loopless_iff",
  "state": "proven",
  "content": "theorem loopless_iff (n : ℕ) (S : Finset ℕ) (hn : 3 ≤ n) (hS : ValidS n S) :\\n    (∀ v, 1 ≤ v → v ≤ n → ¬Loop n S v) ↔\\n    ((∀ k ∈ S, 2 ≤ k ∧ k ≤ n - 2) ∧ NoConsecutive S)",
  "notes": "A subset S yields a loopless D_n(S) iff S ⊆ {2,...,n-2} and S has no consecutive elements."
}
\`\`\`

### Record: lean-proof (tactic body)

\`\`\`json
{
  "sort": "lean-proof",
  "title": "HessenbergDigraphs.loopless_iff (proof)",
  "content": "constructor <;> intro h;\\n  · constructor;\\n    · intro k hk; ..."
}
\`\`\`

### Record: lean-definition

\`\`\`json
{
  "sort": "lean-definition",
  "title": "HessenbergDigraphs.Arc",
  "state": "proven",
  "content": "def Arc (n : ℕ) (S : Finset ℕ) (i j : ℕ) : Prop :=\\n  (1 ≤ j ∧ j + 1 ≤ n ∧ i = j + 1) ∨\\n  (i ∈ R S ∧ j ∈ C n S ∧ i ≤ j)",
  "notes": "Arc relation for D_n(S) with 1-indexed vertices."
}
\`\`\`

Fields:
- \`content\` — full Lean source code (signature for statements, tactic body for proofs)
- \`notes\` — optional natural language description
- \`state\` — \`proven\` or \`sorry\` (statements only)

---

## Citations

Bibliographic references.

### Sort

\`citation\`

### Record: citation

\`\`\`json
{
  "sort": "citation",
  "key": "Gragg1986",
  "notes": "W. B. Gragg. The QR algorithm for unitary Hessenberg matrices. J. Comput. Appl. Math. 16 (1986) 1-8."
}
\`\`\`

---

## Edges (degree 1)

Edges connect two atoms. Their sort is auto-derived.

\`\`\`json
{
  "sort": "(theorem, proof)"
}
\`\`\`

The record is minimal — the edge's semantics come from the sorts of its endpoints:
- \`(theorem, proof)\` — a theorem and its proof
- \`(theorem, definition)\` — a theorem depends on a definition
- \`(proof, lemma)\` — a proof cites a lemma
- \`(theorem, lean-theorem)\` — informal ↔ formal correspondence

---

## Network Analysis

### Size — node radius

| Metric | Formula | Description |
|--------|---------|-------------|
| \`uniform\` | $r = c$ | All nodes same size |
| \`degree\` | $r \\\\propto \\\\deg(v)$ | Total degree (in + out) |
| \`in-degree\` | $r \\\\propto \\\\deg^-(v)$ | Incoming edges |
| \`out-degree\` | $r \\\\propto \\\\deg^+(v)$ | Outgoing edges |
| \`pagerank\` | $\\\\pi = \\\\alpha M\\\\pi + (1{-}\\\\alpha)\\\\mathbf{1}/n$ | Eigenvector of modified adjacency |
| \`betweenness\` | $c_B(v) = \\\\sum_{s \\\\neq v \\\\neq t} \\\\sigma_{st}(v)/\\\\sigma_{st}$ | Shortest-path bottleneck |
| \`katz\` | $c_K(v) = \\\\sum_{k=1}^{\\\\infty} \\\\alpha^k (A^k \\\\mathbf{1})_v$ | Attenuated walk count |
| \`hub\` | $h = A \\\\cdot a$, iterate with $a = A^T \\\\cdot h$ | HITS hub score |
| \`authority\` | $a = A^T \\\\cdot h$, iterate with $h = A \\\\cdot a$ | HITS authority score |
| \`depth\` | $d(v) = \\\\max_{\\\\text{root } r} \\\\text{longest-path}(r, v)$ | DAG depth (cycles removed) |
| \`reachability\` | $|\\\\text{descendants}(v)|$ | Forward reachable count |

### Color — node color

| Mode | Method |
|------|--------|
| \`sort\` | $\\\\text{hue} = \\\\text{hash}(\\\\text{sort}) \\\\bmod 360$ — deterministic per type |
| \`community\` | Greedy modularity maximization |
| \`layer\` | DAG depth → blue (shallow) to red (deep) |
| \`pagerank\` | PageRank → blue (low) to red (high) |
| \`depth\` | DAG depth → gradient |
| \`spectral\` | Community via Laplacian eigenvectors |
| \`curvature\` | Betweenness as curvature proxy |

Colors propagate to: network nodes, entry blocks, entry links, detail panel.

### Cluster — node grouping

| Method | Algorithm |
|--------|-----------|
| \`none\` | No clustering |
| \`louvain\` | Greedy modularity on undirected graph |
| \`sort\` | Group by sort string |
| \`stage\` | Group by DAG depth from roots |
| \`spectral\` | $k$-means on eigenvectors of $L = D - A$, $k$ from eigengap |

**Tightness** (0–100): $\\\\mathbf{f}_v = s \\\\cdot \\\\alpha \\\\cdot (\\\\mathbf{c} - \\\\mathbf{x}_v)$ where $s$ = tightness/100, $\\\\mathbf{c}$ = cluster centroid.

---

## Convention

Any project can use MathNetwork if its \`astrolabe.json\` follows:

1. Entry: \`{ "ref": [...], "record": "<JSON string>" }\`
2. Atom: \`ref = [own_hash]\`, record has \`{"sort": "..."}\`
3. Edge: \`ref = [hash_A, hash_B]\`, record has \`{"sort": "(sort_A, sort_B)"}\`
4. Hash: \`SHA256(ref₁ || 0x00 || ref₂ || 0x00 || ... || record)[:12 hex]\`
`
