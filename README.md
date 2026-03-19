# NetMath

Build and explore **knowledge networks** — interactive graphs where nodes are concepts and edges are relationships, paired with a structured document reader.

Not just for math. Use it for any domain: law, biology, philosophy, software architecture, or anything that benefits from structured knowledge.

## Features

### Knowledge Graph Visualization
- **2D force-directed graph** with pan, zoom, and drag physics
- **Node selection** with highlight, connected-edge flow animation
- **Size mapping** — PageRank, betweenness, in-degree, Katz centrality, and more
- **Color mapping** — by type, community, spectral cluster, Ricci curvature, or anomaly
- **Clustering** — group nodes by community, layer, or spectral cluster with adjustable strength

### Document Reader
- **MDX rendering** with full LaTeX math support (KaTeX)
- **Cross-references** — embed node details with `<objblock>` or link inline with `<objref>`
- **Multi-document navigation** with table of contents and heading tracking
- **Adjustable font size** (14–24px)

### Network Analysis
17 analysis modules run automatically on project load:
- Centrality: PageRank, betweenness, Katz, HITS (hub/authority)
- Structure: Louvain communities, spectral clustering, bridges, articulation points
- Geometry: Ricci curvature, spectral embedding, persistent homology
- Anomaly detection, link prediction, entropy measures, and more

### AI Assistant
Built-in Claude integration for knowledge editing:
- `/add-node`, `/add-edge` — create concepts and relationships
- `/explain`, `/summarize` — understand your network
- Image drag-drop and paste for visual context
- Streaming responses with tool use display

### Custom Types
Define your own object types (sorts) with custom colors. Math projects get theorem/definition/lemma. A legal project might use statute/case/opinion. A biology project: gene/protein/pathway.

## Quick Start

```bash
# Install
npm install
pip install -e backend/

# Run (development)
npm run backend &    # Backend on port 8765
npm run dev          # Frontend on port 3000

# Or run as desktop app
npm run tauri dev
```

Create or open a project folder. NetMath stores all data in a `.netmath/` directory inside your project.

## How It Works

Your knowledge lives in a `.netmath/` folder:

```
my-project/
├── .netmath/
│   ├── knowledge.json    # Nodes and edges
│   ├── sorts.json        # Custom type definitions (optional)
│   ├── docs/
│   │   └── index.mdx     # Your notes
│   └── config.json
└── README.md
```

**Nodes** (objects) have a name, type, and optional fields — statement, proof, intuition, notes.
**Edges** (morphisms) connect two nodes with a description.

Reference nodes in your MDX documents:

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
| Math | KaTeX |
| Backend | FastAPI, NetworkX |
| Analysis | SciPy, scikit-learn, GraphRicciCurvature |

## License

MIT
