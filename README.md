# NetMath

A tool for building and exploring **math knowledge networks** — interactive 2D force-directed graphs where nodes represent mathematical concepts and edges capture their relationships, paired with an MDX reader for structured mathematical notes.

Built with **Next.js + d3-force** (frontend) and **FastAPI + NetworkX** (backend). Runs as a **Tauri desktop app** or in the **browser**.

![License](https://img.shields.io/badge/license-MIT-blue)

## What It Does

- **2D Knowledge Graph** — Force-directed layout with pan/zoom, drag physics, node selection, and edge flow animation
- **MDX Reader** — Render mathematical notes with KaTeX, cross-reference nodes via `<objblock>` and `<objref>` tags
- **Node Detail** — View statement, proof, intuition, notes for each concept, with collapsible sections
- **Network Analysis** — PageRank, betweenness, communities, spectral clustering, Ricci curvature, and more — auto-computed, mapped to node size/color
- **Categorical Schema** — Knowledge modeled as a category: objects (nodes) have sorts (theorem, definition, lemma, ...), morphisms (edges) carry notes

## Quick Start

```bash
# Install
npm install
pip install -e backend/

# Run
npm run backend &    # Backend on port 8765
npm run dev          # Frontend on port 3000
```

Open http://localhost:3000, click a project to enter.

### Desktop App (Tauri)

```bash
npm run tauri dev
```

## Architecture

```
page.tsx (two-panel layout)
┌──────────────────────────────────┬──────────────────┐
│        Workspace (70%)           │  Inspector (30%) │
│                                  │                  │
│  Read / Network / Detail         │  CardStack       │
│                                  │  (obj cards)     │
│  Network has ⚙ settings overlay  │                  │
└──────────────────────────────────┴──────────────────┘
                    │
             stores (zustand)
```

**6 stores** communicate between panels:

| Store | Purpose | Undo |
|-------|---------|------|
| `selectObjStore` | Selected node | ✅ |
| `selectMorStore` | Selected edge | ✅ |
| `dataStore` | Knowledge data | read-only |
| `viewStore` | Layout, mappings, clustering | ✅ |
| `physicsStore` | Force parameters | ✅ |
| `analysisStore` | Analysis results | computed |

**Self-contained components** — shared components receive an `id` and subscribe to stores internally. Views only handle layout.

## Project Structure

```
src/
├── stores/                  # 6 zustand stores
├── panels/
│   ├── workspace/           # ReadView, NetworkView, NetworkSettings, DetailView
│   └── inspector/           # CardStack
├── components/shared/       # ObjCard, MorCard, MorList, ObjBlock, ObjRef
├── lib/graph2d.ts           # 2D graph pure functions (testable)
├── hooks/                   # useProjectLoader, useKeyboardShortcuts, useAnalysisData
└── assets/                  # Sort → color config

backend/
└── netmath/
    ├── server.py            # FastAPI (port 8765)
    ├── knowledge_storage.py # Knowledge CRUD
    └── analysis/            # 14 analysis modules
```

## Data Model

All data lives in `.netmath/` inside your project folder:

```json
// Object (node)
{
  "id": "abc123",
  "name": "Bolzano-Weierstrass",
  "sort": "theorem",
  "statement": "Every bounded sequence...",
  "proof": "...",
  "intuition": "...",
  "notes": "..."
}

// Morphism (edge)
{
  "id": "def456",
  "source": "abc123",
  "target": "xyz789",
  "notes": "uses compactness argument"
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Escape` | Deselect |
| `Cmd+1/2/3` | Switch Read/Network/Detail |

## Deployment

See [deploy/README.md](deploy/README.md) for hosting as a website (Vercel + Render).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Tauri 2 |
| Frontend | Next.js 15, React, TypeScript |
| 2D Graph | d3-force, Canvas 2D |
| State | Zustand + zundo (undo) |
| Math | KaTeX, remark-math |
| Backend | FastAPI, NetworkX |
| Analysis | SciPy, scikit-learn, GraphRicciCurvature |

## License

MIT
