<p align="center">
  <a href="https://github.com/factorin-dev/Astrolabe">
    <img src="src-tauri/icons/128x128@2x.png" alt="Astrolabe" width="80" />
  </a>
</p>

<h1 align="center">Astrolabe</h1>

<p align="center">
  A desktop reader and visualizer for <code>astrolabe.json</code> knowledge networks.
</p>

<p align="center">
  <a href="https://github.com/factorin-dev/Astrolabe/blob/main/LICENSE"><img alt="License: AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-blue" /></a>
</p>

---

## What is Astrolabe?

Astrolabe is a desktop application that opens any folder containing an `astrolabe.json` file and provides:

- **ReadView** — render `.astrolabe/docs/*.mdx` files with LaTeX math, entry blocks, and cross-references
- **NetworkView** — visualize the knowledge graph with d3-force simulation
- **DetailView** — inspect individual entries with structured record rendering
- **AI Chat** — Claude-powered assistant (via Tauri IPC)

## astrolabe.json

The core data format is a content-addressable flat store:

```json
{
  "<12-char-hash>": {
    "ref": ["<hash>", ...],
    "record": "<JSON string>"
  }
}
```

- **Atoms** (degree 0): `ref = [self_hash]` — base knowledge units
- **Edges** (degree 1): `ref = [A, B]` — directed relationships between atoms
- **Hash**: `SHA256(ref₁ ‖ 0x00 ‖ ref₂ ‖ ... ‖ record)[:12 hex]`
- Hash propagation: changing a record automatically updates all references (in `ref` and record text)

## MDX Components

Documents in `.astrolabe/docs/` support:

- `\entryblock{hash}` — display an entry as a block
- `\entryblock{hash}{collapsible}` — collapsible block
- `\entryblock{hash}{\entryblock{child}{collapsible}}` — nesting
- `\entryref{hash}{display text}` — inline clickable link to an entry

## Plugins

Astrolabe has a plugin system. Plugins can transform network data, add UI sections, and provide analysis tools.

### MathNetwork

The built-in plugin for network analysis. When enabled, it adds:

- **NETWORK mode** — transforms atoms into nodes, degree-1 entries into directed edges
- **Source filter** — view `tex` / `lean` / `bib` networks independently (analysis runs per-source)
- **Size by** — node radius from: degree, PageRank, betweenness, Katz, HITS, DAG depth, reachability
- **Color by** — node color from: sort, community, layer, gradient metrics
- **Cluster** — group nodes by: Louvain, sort, source, stage, spectral, curvature
- **Merge proofs** — collapse proof atoms into their statements
- **Lean syntax highlighting** — code blocks with keyword/tactic/type coloring
- **Color propagation** — chosen colors propagate to entry blocks, links, and detail panel

See [`src/plugins/mathnetwork/README.md`](src/plugins/mathnetwork/README.md) for full documentation.

## Build

```bash
# Install
npm install
cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]"

# Run (starts backend + Tauri app)
npm run dev:all

# Tests
npm test                                    # frontend (vitest)
cd backend && python3 -m pytest             # backend (pytest)
```

## License

[AGPL-3.0](LICENSE)
