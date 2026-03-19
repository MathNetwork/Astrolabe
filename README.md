<p align="center">
  <a href="https://github.com/MathNetwork/Astrolabe">
    <img src="src-tauri/icons/128x128@2x.png" alt="Astrolabe" width="80" />
  </a>
</p>

<h1 align="center">Astrolabe</h1>

<p align="center">
  Navigate your knowledge network
</p>

<p align="center">
  <a href="https://github.com/MathNetwork/Astrolabe/blob/main/LICENSE"><img alt="License: AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-blue" /></a>
  <a href="https://github.com/MathNetwork/Astrolabe/releases"><img alt="Release" src="https://img.shields.io/github/v/release/MathNetwork/Astrolabe?display_name=tag" /></a>
</p>

<p align="center">
  <a href="#features">Features</a> |
  <a href="#download">Download</a> |
  <a href="#quick-start">Quick Start</a> |
  <a href="#how-it-works">How It Works</a> |
  <a href="#contributing">Contributing</a>
</p>

---

## What is Astrolabe?

Astrolabe turns structured knowledge into interactive, explorable networks. Instead of reading a linear document from start to finish, you navigate a web of interconnected concepts — seeing how ideas depend on each other, which ones are central, and where the gaps are.

It's not a note-taking app. It's a **publication tool** — for anyone who wants to present complex, structured knowledge as a navigable network rather than a flat document.

**Use it for any domain:** mathematics, law, biology, philosophy, software architecture, or anything with concepts and relationships.

## Features

**Knowledge Graph** — 2D force-directed graph with pan, zoom, drag physics, node/edge selection, and flow animation. Map node size to PageRank, betweenness, or Katz centrality. Color by type, community, spectral cluster, or Ricci curvature.

**Document Reader** — MDX rendering with full LaTeX support (KaTeX). Cross-reference nodes inline with `<objref>` or embed full details with `<objblock>`. Multi-document navigation with table of contents.

**Network Analysis** — 17 analysis modules run automatically: centrality metrics, Louvain communities, spectral clustering, anomaly detection, link prediction, persistent homology, and more.

**AI Assistant** — Built-in Claude integration. Create and edit nodes/edges via natural language. Slash commands (`/add-node`, `/explain`, `/summarize`). Image drag-drop for visual context.

**Custom Types** — Define your own object types with custom colors. A math project uses theorem/definition/lemma. A legal project: statute/case/opinion. A biology project: gene/protein/pathway.

**Local-first** — Your data lives in a `.astrolabe/` folder inside your project. Plain JSON files, version-controllable, no cloud dependency.

## Download

> Coming soon — desktop builds for macOS, Windows, and Linux.

For now, run from source (see [Quick Start](#quick-start)).

## Quick Start

```bash
# Clone
git clone https://github.com/MathNetwork/Astrolabe.git
cd Astrolabe

# Install dependencies
npm install
pip install -e backend/

# Run in development
npm run backend &    # Backend on port 8765
npm run dev          # Frontend on port 3000

# Or run as desktop app (requires Rust toolchain)
npm run tauri dev
```

## How It Works

Your knowledge lives in a `.astrolabe/` folder:

```
my-project/
├── .astrolabe/
│   ├── knowledge.json    # Nodes and edges
│   ├── sorts.json        # Custom type definitions (optional)
│   ├── docs/
│   │   └── index.mdx     # Your structured documents
│   └── config.json
└── README.md
```

**Nodes** have a name, type, and optional fields — statement, proof, intuition, notes.
**Edges** connect two nodes with a description of their relationship.

Reference nodes in your documents:

```mdx
The key result is:

<div class="objblock">node-id</div>

See also <objref id="other-node">this concept</objref>.
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Escape` | Deselect |
| `Cmd+1/2/3` | Switch Read / Network / Detail |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Tauri 2 |
| Frontend | Next.js, React, TypeScript |
| Graph | d3-force, Canvas 2D |
| State | Zustand (with undo/redo) |
| Math rendering | KaTeX |
| Backend | Python, FastAPI, NetworkX |
| Analysis | SciPy, scikit-learn, GraphRicciCurvature |

## Contributing

We welcome contributions! Please see our [contributing guide](CONTRIBUTING.md) for details.

All contributors are required to sign a CLA (Contributor License Agreement) before their pull requests can be merged.

## Acknowledgments

Astrolabe is inspired by the idea that knowledge has structure — and that structure should be visible, explorable, and analyzable. Special thanks to:

- [d3-force](https://github.com/d3/d3-force) for the graph layout engine
- [KaTeX](https://katex.org/) for fast LaTeX rendering
- [NetworkX](https://networkx.org/) for graph algorithms
- [Tauri](https://tauri.app/) for the lightweight desktop runtime
- [Claude](https://claude.ai/) for AI-powered knowledge editing

## License

[AGPL-3.0](LICENSE) — free to use, modify, and distribute. Any derivative work or network service must also be open source.
