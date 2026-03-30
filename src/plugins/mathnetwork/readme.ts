export default `# MathNetwork Plugin

Transforms \`astrolabe.json\` into a directed network for graph analysis.

## Architecture

$$
\\\\text{astrolabe.json} \\\\longrightarrow \\\\text{Backend} \\\\longrightarrow \\\\text{NetworkView} \\\\longrightarrow \\\\text{UI}
$$

| Layer | Components |
|-------|-----------|
| **Data** | \`astrolabe.json\` — entries with \`ref\` and \`record\` |
| **Backend** | \`graph_builder\` · \`degree\` · \`centrality\` · \`dag\` · \`community\` · \`cluster\` |
| **API** | \`GET /api/plugins/skeleton/graph?size=&color=&cluster=\` |
| **Network** | d3-force simulation + cluster attraction force |
| **Color** | \`entryColor.ts\` → EntryBlock · EntryLink · EntryDetail |

## Data Model

Each entry: \`{ "ref": [...], "record": "<JSON>" }\`

- **Atoms** (degree 0): \`ref = [self_hash]\` → **nodes**
- **Edges** (degree 1): \`ref = [A, B]\` → **directed edge** $A \\\\to B$
- **Hash**: $h = \\\\mathrm{SHA256}(r_1 \\\\,\\\\|\\\\, 0\\\\!\\\\times\\\\!00 \\\\,\\\\|\\\\, r_2 \\\\,\\\\|\\\\, \\\\cdots \\\\,\\\\|\\\\, \\\\text{record})[:12]$

## Record Convention

Two required fields for every atom:

| Field | Values |
|-------|--------|
| \`sort\` | \`definition\` · \`theorem\` · \`lemma\` · \`proposition\` · \`corollary\` · \`proof\` · \`instance\` · \`citation\` |
| \`source\` | \`tex\` · \`lean\` · \`bib\` (future: \`rocq\` · \`agda\` · \`hm\`) |

Optional fields by source:

| Field | Source | Description |
|-------|--------|-------------|
| \`title\` | all | Display name |
| \`notes\` | \`tex\` \`lean\` | Natural language, may contain \`$LaTeX$\` and \`\\\\entryref{hash}{text}\` |
| \`content\` | \`lean\` | Source code (type signature or tactic body) |
| \`state\` | \`lean\` | \`proven\` or \`sorry\` |
| \`key\` | \`bib\` | Citation identifier |

---

## Source: tex

Sort derived from LaTeX environment: \`\\\\begin{theorem}\` → \`sort: "theorem"\`

\`\`\`json
{ "sort": "theorem", "source": "tex", "title": "...", "notes": "..." }
{ "sort": "proof", "source": "tex", "notes": "..." }
\`\`\`

## Source: lean

Sort derived from declaration keyword: \`def\` → \`definition\`, \`theorem\` → \`theorem\`

\`\`\`json
{ "sort": "theorem", "source": "lean", "title": "...", "state": "proven", "content": "..." }
{ "sort": "proof", "source": "lean", "title": "... (proof)", "content": "..." }
\`\`\`

## Source: bib

\`\`\`json
{ "sort": "citation", "source": "bib", "key": "...", "notes": "..." }
\`\`\`

## Edges

Auto-derived sort: \`(sort_A, sort_B)\`. Record is minimal.

| Edge | Meaning |
|------|---------|
| \`(theorem, proof)\` | Statement ↔ proof |
| \`(theorem, definition)\` | Depends on definition |
| \`(proof, lemma)\` | Proof cites lemma |
| \`(theorem, theorem)\` | Cross-source correspondence |

---

## Network Analysis

### Size — node radius

Controls $r_v$ for each node $v$:

| Metric | Formula |
|--------|---------|
| uniform | $r_v = c$ |
| degree | $r_v \\\\propto \\\\deg^+(v) + \\\\deg^-(v)$ |
| in-degree | $r_v \\\\propto \\\\deg^-(v)$ |
| out-degree | $r_v \\\\propto \\\\deg^+(v)$ |
| pagerank | $\\\\boldsymbol{\\\\pi} = \\\\alpha M \\\\boldsymbol{\\\\pi} + \\\\frac{1-\\\\alpha}{n}\\\\mathbf{1}$ |
| betweenness | $c_B(v) = \\\\displaystyle\\\\sum_{s \\\\neq v \\\\neq t} \\\\frac{\\\\sigma_{st}(v)}{\\\\sigma_{st}}$ |
| katz | $c_K(v) = \\\\displaystyle\\\\sum_{k=1}^{\\\\infty} \\\\alpha^k (A^k \\\\mathbf{1})_v$ |
| hub | $\\\\mathbf{h} = A\\\\mathbf{a}, \\\\quad \\\\mathbf{a} = A^\\\\top \\\\mathbf{h}$ (iterate) |
| authority | $\\\\mathbf{a} = A^\\\\top \\\\mathbf{h}, \\\\quad \\\\mathbf{h} = A\\\\mathbf{a}$ (iterate) |
| depth | $d(v) = \\\\max_{r \\\\in \\\\text{roots}} \\\\text{longest-path}(r, v)$ |
| reachability | $|\\\\{u : v \\\\rightsquigarrow u\\\\}|$ |

All values normalized to $[r_{\\\\min}, r_{\\\\max}]$.

### Color — node color

| Mode | Method |
|------|--------|
| sort | $\\\\text{hue}(v) = \\\\text{hash}(\\\\text{sort}_v) \\\\bmod 360$ |
| community | Greedy modularity maximization on $G^{\\\\text{undirected}}$ |
| layer | $\\\\text{color}(v) = \\\\text{gradient}(d(v) / d_{\\\\max})$, blue → red |
| pagerank | $\\\\text{color}(v) = \\\\text{gradient}(\\\\pi_v / \\\\pi_{\\\\max})$ |
| depth | Same as layer |
| spectral | Communities from eigenvectors of $L = D - A$ |
| curvature | $\\\\text{gradient}(c_B(v) / c_{B,\\\\max})$ as curvature proxy |

Colors propagate to all UI: nodes, entry blocks, entry links, detail panel.

### Cluster — node grouping

| Method | Algorithm |
|--------|-----------|
| louvain | Greedy modularity on $G^{\\\\text{undirected}}$ |
| sort | Partition by $\\\\text{sort}_v$ |
| stage | Partition by $d(v)$ |
| spectral | $k$-means on eigenvectors of $L$, $k$ chosen by eigengap $\\\\max_i (\\\\lambda_{i+1} - \\\\lambda_i)$ |

Cluster force:

$$
\\\\mathbf{f}_v = s \\\\cdot \\\\alpha \\\\cdot (\\\\mathbf{c}_{k(v)} - \\\\mathbf{x}_v)
$$

where $s \\\\in [0,1]$ is tightness, $\\\\alpha$ is simulation cooling, $\\\\mathbf{c}_{k(v)}$ is the centroid of cluster $k(v)$.
`
