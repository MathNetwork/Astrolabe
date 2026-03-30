export default `# MathNetwork Plugin

Transforms \`astrolabe.json\` into a directed network for graph analysis.

## Architecture

\`\`\`
astrolabe.json
     │
     ▼
┌─────────────────────────────┐
│  Backend: skeleton_graph.py │
│    ├─ graph_builder.py      │  atoms → nodes
│    ├─ degree.py             │  degree metrics
│    ├─ centrality.py         │  PageRank, betweenness, Katz, HITS
│    ├─ dag.py                │  depth, reachability
│    ├─ community.py          │  community detection
│    └─ cluster.py            │  clustering
└─────────────┬───────────────┘
              │  /api/plugins/skeleton/graph
              ▼
┌─────────────────────────────┐
│  Frontend: NetworkView      │
│    d3-force + cluster force │
└─────────────┬───────────────┘
              │  entryColor.ts
              ▼
  EntryBlock · EntryLink · EntryDetail
\`\`\`

## Data Model

\`\`\`json
{
  "<12-char-hash>": {
    "ref": ["<hash>", ...],
    "record": "<JSON string>"
  }
}
\`\`\`

- **Atoms** (degree 0): \`ref = [self_hash]\` → **nodes**
- **Edges** (degree 1): \`ref = [A, B]\` → **directed edge** A → B
- **Hash**: \`SHA256(ref₁ || 0x00 || ref₂ || ... || record)[:12 hex]\`

## Record Convention

Every atom record is a JSON string with two required fields:

| Field | Description |
|-------|-------------|
| \`sort\` | Mathematical role: \`definition\`, \`theorem\`, \`lemma\`, \`proposition\`, \`corollary\`, \`proof\`, \`instance\`, \`citation\` |
| \`source\` | Source file type: \`tex\`, \`lean\`, \`bib\` (future: \`rocq\`, \`agda\`, \`hm\`) |

Additional fields depend on \`source\`:

| Field | Source | Description |
|-------|--------|-------------|
| \`title\` | all | Display name |
| \`notes\` | \`tex\`, \`lean\` | Content text with LaTeX (\`$...$\`) and \`\\\\entryref{hash}{text}\` |
| \`content\` | \`lean\` | Full source code (signature or tactic body) |
| \`state\` | \`lean\` | Proof status: \`proven\` / \`sorry\` |
| \`key\` | \`bib\` | Citation key |

---

## Source: tex (Informal Mathematics)

Extracted from LaTeX sources. Sort is derived from the LaTeX environment.

### definition

\`\`\`json
{
  "sort": "definition",
  "source": "tex",
  "title": "Support digraph",
  "notes": "Given $Q\\\\in\\\\mathbb{R}^{n\\\\times n}$, its *support digraph* $D(Q)$ is the directed graph on $[n]$, where arc $(i,j)$ exists iff $Q_{ij}\\\\neq 0$."
}
\`\`\`

### theorem

\`\`\`json
{
  "sort": "theorem",
  "source": "tex",
  "title": "Rigidity",
  "notes": "If $|S|\\\\ge 2$, then $\\\\mathrm{Aut}(D_n(S))$ is trivial."
}
\`\`\`

### proof

\`\`\`json
{
  "sort": "proof",
  "source": "tex",
  "notes": "Any automorphism $\\\\varphi$ maps \\\\entryref{b8e5da5e7ed4}{the unique Hamilton cycle} to itself..."
}
\`\`\`

---

## Source: lean (Formal Mathematics)

Parsed from Lean 4 source files. Sort is derived from the declaration keyword (\`def\`, \`theorem\`, \`lemma\`, \`instance\`). Statements and proofs are separate atoms.

### theorem (statement)

\`\`\`json
{
  "sort": "theorem",
  "source": "lean",
  "title": "HessenbergDigraphs.loopless_iff",
  "state": "proven",
  "content": "theorem loopless_iff (n : ℕ) ...",
  "notes": "Loopless iff S ⊆ {2,...,n-2} with no consecutive elements."
}
\`\`\`

### proof (tactic body)

\`\`\`json
{
  "sort": "proof",
  "source": "lean",
  "title": "HessenbergDigraphs.loopless_iff (proof)",
  "content": "constructor <;> intro h; ..."
}
\`\`\`

### definition

\`\`\`json
{
  "sort": "definition",
  "source": "lean",
  "title": "HessenbergDigraphs.Arc",
  "state": "proven",
  "content": "def Arc (n : ℕ) (S : Finset ℕ) (i j : ℕ) : Prop := ..."
}
\`\`\`

---

## Source: bib (Citations)

\`\`\`json
{
  "sort": "citation",
  "source": "bib",
  "key": "Gragg1986",
  "notes": "W. B. Gragg. The QR algorithm for unitary Hessenberg matrices. J. Comput. Appl. Math. 16 (1986) 1-8."
}
\`\`\`

---

## Edges

Edges connect two atoms. Sort is auto-derived from endpoints:

\`\`\`json
{ "sort": "(theorem, proof)" }
\`\`\`

Semantics come from the pair:
- \`(theorem, proof)\` — a theorem and its proof
- \`(theorem, definition)\` — depends on a definition
- \`(proof, lemma)\` — proof cites a lemma
- \`(theorem, theorem)\` — informal ↔ formal correspondence (same sort, different source)

---

## Network Analysis

### Size

| Metric | Formula |
|--------|---------|
| \`uniform\` | $r = c$ |
| \`degree\` | $r \\\\propto \\\\deg(v)$ |
| \`pagerank\` | $\\\\pi = \\\\alpha M\\\\pi + (1{-}\\\\alpha)\\\\mathbf{1}/n$ |
| \`betweenness\` | $c_B(v) = \\\\sum_{s \\\\neq v \\\\neq t} \\\\sigma_{st}(v)/\\\\sigma_{st}$ |
| \`katz\` | $c_K = \\\\sum_{k=1}^{\\\\infty} \\\\alpha^k A^k \\\\mathbf{1}$ |
| \`hub\` / \`authority\` | HITS: $h = Aa$, $a = A^Th$ |
| \`depth\` | Longest path from roots (cycles removed) |
| \`reachability\` | $|\\\\text{descendants}(v)|$ |

### Color

| Mode | Method |
|------|--------|
| \`sort\` | $\\\\text{hash}(\\\\text{sort}) \\\\to \\\\text{HSL}$ |
| \`community\` | Greedy modularity |
| \`layer\` / \`depth\` | DAG depth → gradient |
| \`pagerank\` | Value → gradient |
| \`spectral\` | Laplacian eigenvector communities |
| \`curvature\` | Betweenness proxy |

### Cluster

| Method | Algorithm |
|--------|-----------|
| \`louvain\` | Greedy modularity |
| \`sort\` | Group by sort string |
| \`stage\` | Group by DAG depth |
| \`spectral\` | $k$-means on eigenvectors of $L = D - A$ |

**Tightness**: $\\\\mathbf{f} = s \\\\cdot \\\\alpha \\\\cdot (\\\\mathbf{c} - \\\\mathbf{x})$, $s \\\\in [0,1]$
`
