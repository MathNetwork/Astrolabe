export default `# MathNetwork Plugin

Transforms \`astrolabe.json\` into a directed network for graph analysis. Works with both informal mathematics and Lean 4 formalizations.

## Data Model

Astrolabe entries have \`ref\` (ordered hash list) and \`record\` (JSON string).

- **Atoms** (degree 0): \`ref = [self_hash]\` → become **nodes**
- **Edges** (degree 1): \`ref = [A, B]\` → become **directed edges** A → B
- Edge sort is auto-derived as \`(sort_A, sort_B)\`

## Atom Sorts

| Category | Sorts |
|----------|-------|
| Informal math | \`definition\` \`theorem\` \`lemma\` \`proposition\` \`corollary\` \`proof\` |
| Lean 4 | \`lean-definition\` \`lean-theorem\` \`lean-lemma\` \`lean-instance\` \`lean-proof\` |
| Reference | \`citation\` |

## Record Fields

| Field | Description |
|-------|-------------|
| \`sort\` | Entry type (required) |
| \`title\` | Display name |
| \`notes\` | Content text — may contain LaTeX (\`$...$\`) and \`\\entryref{hash}{text}\` |
| \`content\` | Source code (Lean entries) |
| \`state\` | Lean proof status: \`proven\` / \`sorry\` |
| \`key\` | Citation key (citation entries) |

## Network Analysis

### Size

Control node radius by a metric: \`uniform\`, \`degree\`, \`in-degree\`, \`out-degree\`, \`pagerank\`, \`betweenness\`, \`katz\`, \`hub\`, \`authority\`, \`depth\`, \`reachability\`

### Color

Control node color by a mode: \`sort\`, \`community\`, \`layer\`, \`pagerank\`, \`depth\`, \`spectral\`, \`curvature\`

Colors propagate to all UI: network nodes, entry blocks, entry links, detail panel.

### Cluster

Group nodes with adjustable tightness: \`none\`, \`louvain\`, \`sort\`, \`stage\`, \`spectral\`

## Convention

Any project can use MathNetwork if its \`astrolabe.json\` follows:

1. Each entry: \`{ "ref": [...], "record": "<JSON string>" }\`
2. Atoms: \`ref = [own_hash]\`, record has at least \`{"sort": "..."}\`
3. Edges: \`ref = [hash_A, hash_B]\`, record has \`{"sort": "(sort_A, sort_B)"}\`
4. Hash = \`SHA256(ref₁ || 0x00 || ref₂ || 0x00 || ... || record)[:12 hex]\`
`
