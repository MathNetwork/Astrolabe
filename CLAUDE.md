# Astrolabe — Knowledge Network Visualizer

## Architecture

- **Frontend**: Next.js + React + d3-force (2D Canvas), **Tauri desktop app**
- **Backend**: Python (FastAPI/uvicorn), port 8765, JSON persistence
- **Communication**: REST API between frontend and backend
- **Plugins**: `src/plugins/` — modular analysis plugins (e.g. MathNetwork)

## Core Data Model

`astrolabe.json` is a content-addressable flat store:
- key = `SHA256(ref₁ || 0x00 || ref₂ || ... || record)[:12 hex]`
- value = `{ "ref": [...], "record": "<JSON string>" }`
- **record** is a JSON string with `sort` and `source` fields
- `ref = [self_hash]` (atom, degree 0) or `ref = [h0, h1, ..., hk]` (degree ≥ 1)
- `__self__` sentinel: client sends `ref: ["__self__"]`, backend replaces with `ref: [computed_hash]`
- Entry is immutable: modify = delete old + create new + propagate hash changes

### Record Convention

| Field | Required | Description |
|-------|----------|-------------|
| `sort` | yes | Mathematical role: `definition`, `theorem`, `lemma`, `proposition`, `corollary`, `proof`, `instance`, `citation` |
| `source` | yes | Source file type: `tex`, `lean`, `bib` |
| `title` | no | Display name |
| `notes` | no | Content text (LaTeX + `\entryref{hash}{text}`) |
| `content` | no | Source code (Lean entries) |
| `state` | no | `proven` / `sorry` (Lean entries) |
| `key` | no | Citation key (bib entries) |

### Hash Propagation

When an entry's record changes → hash changes → all entries containing the old hash (in ref OR record text) are automatically updated and re-hashed recursively.

## Directory Structure

```
src/
├── app/                         ← Next.js pages
├── stores/                      ← zustand stores (selectObj, selectMor, data, view, physics, claudeChat)
├── panels/workspace/            ← ReadView, NetworkView, NetworkSettings, DetailView, WorkspacePanel
├── components/
│   ├── detail/EntryDetail.tsx   ← hash + ref + record viewer
│   ├── mdx/                     ← EntryBlock, EntryLink, InlineMath, preprocess
│   ├── ai-chat/                 ← ChatPanel (right side panel)
│   └── MarkdownRenderer.tsx     ← MDX rendering with KaTeX + custom components
├── plugins/
│   ├── types.ts                 ← AstrolabePlugin interface
│   ├── registry.ts              ← zustand store for plugin enable/disable/mode
│   └── mathnetwork/             ← MathNetwork plugin (network analysis)
├── lib/
│   ├── sortColors.ts            ← deterministic hash(sort) → color
│   ├── entryColor.ts            ← unified color lookup (skeleton override → sort fallback)
│   ├── refView.ts               ← ForceNode/ForceLink types, d3 mapping
│   └── normalize.ts             ← value → radius/gradient mapping
└── hooks/                       ← useProjectLoader, useClaudeEvents, useKeyboardShortcuts

backend/astrolabe_app/
├── storage.py                   ← AstrolabeStorage (CRUD, hash, propagation)
├── astrolabe_router.py          ← /api/astrolabe/* endpoints
├── server.py                    ← FastAPI app
├── routes/                      ← docs, files, project, viewport
└── analysis/                    ← MathNetwork backend (graph_builder, degree, centrality, dag, community, cluster, skeleton_graph)
```

## API Endpoints

### Core (`/api/astrolabe`)
| Method | Path | Function |
|--------|------|----------|
| GET | `/entries` | All entries (optional `?degree=k`) |
| GET | `/entries/{id}` | Single entry |
| POST | `/entries` | Create (ref + record) |
| PATCH | `/entries/{id}` | Update record (re-hashes + propagates) |
| DELETE | `/entries/{id}` | Cascade delete |
| GET | `/stages` | Stage decomposition |
| GET | `/profile/{id}` | Multiplicity profile |
| GET | `/ref-graph` | Full reference graph |

### MathNetwork Plugin (`/api/plugins/skeleton`)
| Method | Path | Function |
|--------|------|----------|
| GET | `/graph` | Skeleton graph with computed size/color/cluster |
| GET | `/analyze` | Individual metric computation |

### Other
- `/api/docs/{list,read}` — MDX documentation
- `/api/project/{status,create,files,file-content}` — Project management
- `/api/health` — Health check

## MathNetwork Plugin

Transforms astrolabe.json into a directed network:
- **ENTRY mode**: all entries as nodes, refs as links
- **NETWORK mode**: atoms as nodes, degree-1 entries as directed edges
- **Settings**: Size by (11 metrics), Color by (7 modes), Cluster (5 methods), Tightness slider
- **Color propagation**: chosen colors propagate to EntryBlock, EntryLink, EntryDetail via `entryColor.ts`

## MDX Components

- `\entryblock{hash}` — block-level entry display
- `\entryblock{hash}{collapsible}` — collapsible block
- `\entryblock{hash}{\entryblock{child}{collapsible}}` — nested
- `\entryref{hash}{display text}` — inline clickable entry link

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Escape` | Deselect |
| `Cmd+1/2/3` | Switch Read/Network/Detail |

## Rules

- Astrolabe is a **general-purpose** knowledge network tool, not math-specific
- Never describe it as "mathematical" — it works for any domain
- Use `python3` / `python3 -m pytest`, not `python` (macOS Homebrew)
- Communicate with user in Chinese
