# NetMath

A desktop tool for building and exploring **math knowledge networks** — interactive 3D graphs where nodes represent mathematical concepts (theorems, definitions, lemmas, ...) and edges capture their relationships.

Built with **Next.js + Three.js** (frontend), **FastAPI + NetworkX** (backend), and **Tauri** (desktop shell).

![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **3D Knowledge Graph** — Navigate math concepts in an interactive 3D force-directed graph with multiple layout algorithms (force, hierarchical, radial)
- **Rich Node Types** — 13 mathematical concept kinds, each with a distinct 3D shape:
  - theorem (sphere), lemma (octahedron), definition (box), axiom (tetrahedron), conjecture (torus), proposition, corollary, insight, open\_question, example, technique, heuristic, analogy
- **Relationship Modeling** — 7 edge relation types: *proves, uses, generalizes, specializes, motivates, contradicts, related*
- **Knowledge Editor** — Edit statements, proofs, intuition, notes, tags, and status (stated → wip → review → proven) per node
- **Graph Analysis** — 16 analysis modules: centrality, community detection, clustering, entropy, topology, embedding, link prediction, Ricci curvature, optimal transport, and more
- **Lens System** — Modular filter/aggregation pipeline to focus on subgraphs
- **LaTeX Support** — KaTeX rendering for mathematical notation
- **Undo/Redo** — Full history system for graph operations
- **2D & 3D Views** — Switch between Sigma.js 2D and Three.js 3D visualization

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **Python** >= 3.11
- **Rust** toolchain (for Tauri desktop build, optional for dev)

### Development

```bash
# Install frontend dependencies
npm install

# Install backend
pip install -e backend/

# Start both backend and frontend
npm run dev:all
```

Or start them separately:

```bash
# Terminal 1: Backend (FastAPI on port 8765)
npm run backend

# Terminal 2: Frontend (Next.js on port 3000)
npm run dev
```

Open http://localhost:3000, select any folder — NetMath auto-creates a `.netmath/` directory and you're ready to go.

### Desktop App (Tauri)

```bash
npm run tauri dev     # Development
npm run tauri build   # Production build
```

## Project Structure

```
NetMath/
├── src/                    # Next.js frontend
│   ├── app/                # App routes (landing page, editor)
│   ├── components/
│   │   ├── graph3d/        # Three.js 3D visualization
│   │   ├── graph/          # Sigma.js 2D visualization
│   │   ├── inspector/      # Node/edge inspection panels
│   │   └── canvas/         # Viewport and toolbar
│   ├── hooks/              # React hooks (graph data, actions, viewport)
│   ├── lib/
│   │   ├── layout/         # Layout algorithms (ELK, ForceAtlas2, Force3D)
│   │   ├── lenses/         # Filter/aggregation pipeline
│   │   ├── history/        # Undo/redo system
│   │   ├── canvasStore.ts  # Canvas state (Zustand)
│   │   └── store.ts        # Global UI state (Zustand)
│   └── workers/            # Web workers for layout computation
├── backend/
│   └── netmath/
│       ├── server.py           # FastAPI server
│       ├── knowledge_storage.py # Knowledge graph CRUD
│       └── analysis/           # 16 graph analysis modules
├── src-tauri/              # Tauri desktop shell (Rust)
└── public/                 # Static assets and themes
```

## Data Model

All data lives in `.netmath/` inside your project folder:

| File | Purpose |
|------|---------|
| `knowledge.json` | Nodes and edges — the knowledge graph |
| `meta.json` | Canvas positions, viewport state, visual overrides |
| `config.json` | Project configuration |

### Node Schema

```json
{
  "id": "kn-abc123",
  "name": "Bolzano-Weierstrass",
  "kind": "theorem",
  "status": "proven",
  "confidence": 4,
  "statement": "Every bounded sequence has a convergent subsequence",
  "proof": "...",
  "intuition": "...",
  "notes": "...",
  "tags": ["analysis", "sequences"],
  "position": { "x": 0, "y": 0, "z": 0 }
}
```

### Edge Schema

```json
{
  "id": "ke-def456",
  "source": "kn-abc123",
  "target": "kn-xyz789",
  "relation": "uses",
  "strict": true,
  "label": "",
  "notes": ""
}
```

## Analysis Modules

The backend includes 16 independent graph analysis modules, all operating on NetworkX graphs:

| Module | Capabilities |
|--------|-------------|
| centrality | PageRank, betweenness, closeness, Katz, HITS |
| community | Louvain, spectral clustering |
| clustering | Coefficient analysis |
| dag | Topological sort, layers, critical paths |
| degree | In/out degree distributions, power law fitting |
| embedding | Node2Vec, UMAP projections |
| entropy | Graph entropy, structural information |
| geometry | Ricci curvature (Ollivier, Forman) |
| link\_prediction | Common neighbors, Jaccard, Adamic-Adar |
| optimal\_transport | Wasserstein distance, transport plans |
| pattern | Motif detection (chains, forks, diamonds) |
| statistics | Degree correlation, assortativity |
| structural | Bridges, components, robustness |
| topology | Betti numbers, persistent homology |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Tauri 2 (Rust) |
| Frontend | Next.js 15, React 19, TypeScript |
| 3D Rendering | Three.js, React Three Fiber |
| 2D Graph | Sigma.js, Graphology |
| State | Zustand |
| Styling | Tailwind CSS |
| Math | KaTeX |
| Backend | FastAPI, Uvicorn |
| Analysis | NetworkX, SciPy, scikit-learn |
| Curvature | GraphRicciCurvature, POT |

## License

MIT
