# MathNetwork Plugin

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
| \`notes\` | \`tex\`, \`lean\` | Natural language description, may contain LaTeX and \`\\entryref\` |
| \`content\` | \`lean\` | Full source code (type signature or tactic proof) |
| \`state\` | \`lean\` | Proof status: \`proven\` / \`sorry\` |
| \`key\` | \`bib\` | Citation identifier |

---

## Source: tex

Extracted from LaTeX sources. Sort is derived from the LaTeX environment name (\`\\begin{theorem}\` → \`theorem\`).

\`\`\`json
{
  "sort": "theorem",
  "source": "tex",
  "title": "<display name>",
  "notes": "<statement in LaTeX notation>"
}
\`\`\`

\`\`\`json
{
  "sort": "proof",
  "source": "tex",
  "notes": "<proof text, may reference other entries via \\entryref{hash}{text}>"
}
\`\`\`

---

## Source: lean

Parsed from Lean 4 source files. Sort is derived from the declaration keyword (\`def\` → \`definition\`, \`theorem\` → \`theorem\`, etc.). Statements and proofs are separate atoms.

\`\`\`json
{
  "sort": "theorem",
  "source": "lean",
  "title": "<fully qualified name>",
  "state": "proven",
  "content": "<type signature>",
  "notes": "<optional natural language description>"
}
\`\`\`

\`\`\`json
{
  "sort": "proof",
  "source": "lean",
  "title": "<name> (proof)",
  "content": "<tactic body>"
}
\`\`\`

---

## Source: bib

Bibliographic references.

\`\`\`json
{
  "sort": "citation",
  "source": "bib",
  "key": "<citation key>",
  "notes": "<formatted reference string>"
}
\`\`\`

---

## Edges

Sort is auto-derived from endpoints: \`(sort_A, sort_B)\`

| Edge sort | Meaning |
|-----------|---------|
| \`(theorem, proof)\` | A theorem linked to its proof |
| \`(theorem, definition)\` | A theorem depends on a definition |
| \`(proof, lemma)\` | A proof cites a lemma |
| \`(theorem, theorem)\` | Correspondence between entries (e.g. tex ↔ lean) |

---

## Network Analysis

### Size

| Metric | Description |
|--------|-------------|
| \`uniform\` | All nodes same size |
| \`degree\` | Total degree (in + out) |
| \`in-degree\` / \`out-degree\` | Directional degree |
| \`pagerank\` | Eigenvector-based importance |
| \`betweenness\` | Shortest-path bottleneck score |
| \`katz\` | Attenuated walk count centrality |
| \`hub\` / \`authority\` | HITS hub and authority scores |
| \`depth\` | Longest path from roots (cycles removed) |
| \`reachability\` | Number of reachable descendants |

### Color

| Mode | Description |
|------|-------------|
| \`sort\` | Deterministic color per sort |
| \`community\` | Greedy modularity community detection |
| \`layer\` / \`depth\` | DAG depth gradient |
| \`pagerank\` | Value gradient (cool → warm) |
| \`spectral\` | Spectral clustering colors |
| \`curvature\` | Betweenness-based curvature proxy |

Colors propagate to: network nodes, entry blocks, entry links, detail panel.

### Cluster

| Method | Description |
|--------|-------------|
| \`louvain\` | Greedy modularity communities |
| \`sort\` | Group by sort string |
| \`stage\` | Group by DAG depth from roots |
| \`spectral\` | k-means on Laplacian eigenvectors |

**Tightness** (0–100): controls cluster attraction strength.
