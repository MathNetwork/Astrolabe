<p align="center">
  <a href="https://github.com/factorin-dev/Astrolabe">
    <img src="src-tauri/icons/128x128@2x.png" alt="Astrolabe" width="80" />
  </a>
</p>

<h1 align="center">Astrolabe</h1>

<p align="center">
  A desktop application for reading, visualizing, and interacting with <code>astrolabe.json</code> knowledge networks.
</p>

<p align="center">
  <a href="https://github.com/factorin-dev/Astrolabe/blob/main/LICENSE"><img alt="License: AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-blue" /></a>
</p>

---

## What is Astrolabe?

Astrolabe works with `astrolabe.json` — a content-addressable data format where entries can have arbitrary-length references, forming higher-dimensional semantic structures. Each entry is a triple of hash, ref, and record, where the record is a free-form string for semantic annotation.

Astrolabe provides an interactive environment to read, browse, and analyze these structures:

- **ReadView** — render `.astrolabe/docs/*.mdx` with LaTeX, entry blocks, and cross-references
- **NetworkView** — visualize the entry graph with d3-force simulation
- **DetailView** — inspect entries with structured record rendering
- **AI Chat** — Claude-powered assistant (via Tauri IPC)
- **Plugin system** — extensible analysis and visualization

## astrolabe.json

```json
{
  "<12-char-hash>": {
    "ref": ["<hash>", ...],
    "record": "<string>"
  }
}
```

- **ref** — an ordered list of hashes, any length. `|ref|` defines the degree of the entry.
  - degree 0: `ref = [self_hash]` — an atom (base unit)
  - degree 1: `ref = [A, B]` — a binary relation
  - degree k: `ref = [h₀, h₁, ..., hₖ]` — a k-simplex (higher-dimensional semantic relation)
- **record** — a plain string. The core layer does not interpret it. Plugins define conventions for structured content (JSON with `sort`, `source`, `title`, `notes`, etc.)
- **hash** — `SHA256(ref₁ ‖ 0x00 ‖ ref₂ ‖ ... ‖ record)[:12 hex]`, content-addressable
- **propagation** — changing a record automatically updates all references everywhere (in `ref` arrays and record text)

The format is general-purpose. Any domain — mathematics, software, biology, legal — can use it by defining its own record conventions.

## LaTeX Macros

Astrolabe defines LaTeX macros that work in both PDF compilation and in-app rendering:

| Macro | In Astrolabe | In LaTeX PDF |
|-------|-------------|--------------|
| `\entryref{hash}{text}` | Clickable link to entry, colored by sort | Renders as plain text |
| `\entryblock{hash}` | Fetches and displays the entry as a block | No-op |
| `\entryblock{hash}{collapsible}` | Collapsible entry block | No-op |

To use in LaTeX, define the macros in your preamble:

```latex
\newcommand{\entryref}[2]{#2}
\newcommand{\entryblock}[1]{}
```

This way, the same source file compiles to a normal PDF and renders interactively in Astrolabe.

### Nesting

Blocks can be nested with brace matching:

```
\entryblock{theorem_hash}{
\entryblock{proof_hash}{collapsible}
}
```

### Where they work

- `.astrolabe/docs/*.mdx` files (ReadView)
- Inside entry `notes` fields (DetailView, EntryBlock)
- Standard `$...$` and `$$...$$` LaTeX math is rendered everywhere via KaTeX

## Plugins

Plugins extend Astrolabe with custom analysis, visualization, and UI. They can:
- Transform network data (filter, merge, compute metrics)
- Add sections to the detail panel
- Define record conventions and rendering

### MathNetwork

The built-in plugin for network analysis. It focuses on **degree 0 (atoms) and degree 1 (edges)** of the astrolabe data, treating them as a directed graph.

When enabled:

- **NETWORK mode** — atoms become nodes, degree-1 entries become directed edges
- **Source filter** — view subnetworks by source type (e.g. `tex`, `lean`, `bib`), analysis runs independently per source
- **Size by** — node radius from: degree, PageRank, betweenness, Katz, HITS, DAG depth, reachability
- **Color by** — node color from: sort, community, layer, gradient metrics (propagates to all UI)
- **Cluster** — group nodes by: Louvain, sort, source, stage, spectral, curvature
- **Merge proofs** — collapse proof entries into their parent statements
- **State rings** — green (proven), yellow (sorry), red (error) indicators on nodes
- **Lean syntax highlighting** — keyword/tactic/type coloring for Lean 4 code
- **Cross-source edges** — rendered as gray with source badges

See [`src/plugins/mathnetwork/README.md`](src/plugins/mathnetwork/README.md) for the full specification.

## Build

```bash
npm install
cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]"

# Run (backend + Tauri desktop app)
npm run dev:all

# Tests
npm test                                    # frontend (vitest)
cd backend && python3 -m pytest             # backend (pytest)
```

## License

[AGPL-3.0](LICENSE)
