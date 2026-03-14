"""
NetMath API Server

FastAPI server providing:
- Knowledge graph CRUD API
- Canvas/viewport state persistence
- File reading for Monaco editor
- Project status/creation
"""

from typing import Optional
from contextlib import asynccontextmanager
from pathlib import Path
import json
import time

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .knowledge_storage import KnowledgeStorage


# ============================================
# Project templates
# ============================================

_NETWORK_MDX_TEMPLATE = """\
# Knowledge Network

Welcome to your NetMath knowledge network.

This file is rendered in the **READ** tab. You can use Markdown with $\\LaTeX$ support:

$$
\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}
$$

<theorem env="theorem" number="1" title="Example">
Every bounded sequence in $\\mathbb{R}^n$ has a convergent subsequence.
</theorem>

<proof>
This follows from the Bolzano–Weierstrass theorem. $\\square$
</proof>

Edit this file at `.netmath/network.mdx` to document your knowledge network.
"""

_DOCS_INDEX_TEMPLATE = """\
# Welcome to your knowledge network

Start by creating nodes in the **NETWORK** view, then write your mathematical narrative here.

Use `<NodeRef id="node-hash" />` to reference nodes from your network.

Math works: $E = mc^2$

$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$
"""

_README_TEMPLATE = """\
# {name}

A math knowledge network built with [NetMath](https://github.com/MathNetwork/NetMath).

## Getting Started

1. Open this folder in NetMath
2. Switch to the **NETWORK** tab to visualize the knowledge graph
3. Double-click to create nodes, click to inspect them
4. Edit `.netmath/network.mdx` to write documentation

## Structure

- `.netmath/knowledge.json` — nodes and edges
- `.netmath/meta.json` — canvas layout and viewport
- `.netmath/network.mdx` — documentation (READ tab)
"""

# ============================================
# Storage helpers
# ============================================

_knowledge_stores: dict[str, KnowledgeStorage] = {}


def _get_knowledge_store(path: str) -> KnowledgeStorage:
    """Get or create a KnowledgeStorage for the given project path."""
    if path not in _knowledge_stores:
        _knowledge_stores[path] = KnowledgeStorage(Path(path))
    return _knowledge_stores[path]


def _meta_path(project_path: str) -> Path:
    """Return the .netmath/meta.json path for a project."""
    return Path(project_path) / ".netmath" / "meta.json"


def _load_meta(project_path: str) -> dict:
    """Load .netmath/meta.json, returning default structure if missing."""
    mp = _meta_path(project_path)
    if mp.exists():
        try:
            return json.loads(mp.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, IOError):
            pass
    return {"canvas": {"visible_nodes": [], "positions": {}}, "viewport": {}}


def _save_meta(project_path: str, data: dict):
    """Save data to .netmath/meta.json."""
    mp = _meta_path(project_path)
    mp.parent.mkdir(parents=True, exist_ok=True)
    mp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


# ============================================
# Lifespan & App
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management"""
    yield


app = FastAPI(
    title="NetMath API",
    description="Knowledge Graph Visualization Tool",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# Pydantic Models
# ============================================


class PositionsUpdateRequest(BaseModel):
    """Node positions update request"""
    path: str
    positions: dict[str, dict]  # {node_id: {x, y, z}}


class CanvasSaveRequest(BaseModel):
    """Canvas save request"""
    path: str
    visible_nodes: list[str] = []
    positions: dict[str, dict] = {}


class CanvasAddNodeRequest(BaseModel):
    """Add node to canvas"""
    path: str
    node_id: str


class CanvasAddNodesRequest(BaseModel):
    """Batch add nodes to canvas"""
    path: str
    node_ids: list[str]


class FilterOptionsData(BaseModel):
    """Filter options for graph display"""
    hideTechnical: bool = False
    hideOrphaned: bool = False
    transitiveReduction: bool = True


class ViewportUpdateRequest(BaseModel):
    """Viewport state update request"""
    path: str
    camera_position: Optional[list[float]] = None
    camera_target: Optional[list[float]] = None
    zoom: Optional[float] = None
    selected_node_id: Optional[str] = None
    selected_edge_id: Optional[str] = None
    filter_options: Optional[FilterOptionsData] = None
    ui_preferences: Optional[dict] = None


# Knowledge Graph Models

class KnowledgeNodeRequest(BaseModel):
    """Create knowledge node request"""
    path: str
    node_id: Optional[str] = None
    name: str
    kind: str = "theorem"
    status: str = "stated"
    statement: str = ""
    proof: str = ""
    intuition: str = ""
    notes: str = ""
    position: Optional[dict] = None


class KnowledgeNodeUpdateRequest(BaseModel):
    """Update knowledge node request"""
    path: str
    name: Optional[str] = None
    kind: Optional[str] = None
    status: Optional[str] = None
    statement: Optional[str] = None
    proof: Optional[str] = None
    intuition: Optional[str] = None
    notes: Optional[str] = None
    position: Optional[dict] = None


class KnowledgeEdgeRequest(BaseModel):
    """Create knowledge edge request"""
    path: str
    edge_id: Optional[str] = None
    source: str
    target: str
    relation: str = "related"
    strict: bool = True
    label: str = ""
    notes: str = ""


class KnowledgeEdgeUpdateRequest(BaseModel):
    """Update knowledge edge request"""
    path: str
    relation: Optional[str] = None
    strict: Optional[bool] = None
    label: Optional[str] = None
    notes: Optional[str] = None


# ============================================
# Health & Project endpoints
# ============================================


@app.get("/api/health")
async def health():
    """Health check"""
    return {"status": "ok", "version": "0.2.0"}


@app.get("/api/project/status")
async def check_project_status(path: str = Query(..., description="Project path")):
    """
    Check project status.

    Returns whether the path exists and whether .netmath/ is set up.
    Auto-creates .netmath/ if the directory exists but .netmath/ does not.
    """
    project_path = Path(path)

    if not project_path.exists():
        return {
            "exists": False,
            "hasNetmath": False,
            "isKnowledgeProject": False,
            "message": "Directory does not exist",
        }

    netmath_dir = project_path / ".netmath"

    # Auto-create .netmath/ if it doesn't exist (requirement: open any folder → auto-init)
    if not netmath_dir.exists():
        netmath_dir.mkdir(exist_ok=True)
        # Initialize empty knowledge.json
        knowledge_file = netmath_dir / "knowledge.json"
        knowledge_file.write_text(
            json.dumps({"nodes": {}, "edges": {}}, indent=2),
            encoding="utf-8",
        )
        # Initialize meta.json
        meta_file = netmath_dir / "meta.json"
        meta_file.write_text(
            json.dumps({"canvas": {"visible_nodes": [], "positions": {}}, "viewport": {}}, indent=2),
            encoding="utf-8",
        )
        # Initialize config.json
        config_file = netmath_dir / "config.json"
        config_file.write_text(
            json.dumps({
                "type": "knowledge",
                "created": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }, indent=2),
            encoding="utf-8",
        )
        # Initialize network.mdx template
        mdx_file = netmath_dir / "network.mdx"
        mdx_file.write_text(_NETWORK_MDX_TEMPLATE, encoding="utf-8")
        # Initialize README.md in project root
        readme_file = project_path / "README.md"
        if not readme_file.exists():
            project_name = project_path.name
            readme_file.write_text(
                _README_TEMPLATE.format(name=project_name),
                encoding="utf-8",
            )

    # Auto-create docs/ directory with index.mdx if missing
    docs_dir = netmath_dir / "docs"
    if not docs_dir.exists():
        docs_dir.mkdir(exist_ok=True)
        index_file = docs_dir / "index.mdx"
        index_file.write_text(_DOCS_INDEX_TEMPLATE, encoding="utf-8")

    return {
        "exists": True,
        "isKnowledgeProject": True,
        "message": "Ready.",
    }


@app.post("/api/project/create")
async def create_project(data: dict):
    """
    Create a new empty knowledge graph project.
    Creates .netmath/ directory with knowledge.json and config.json.
    """
    path = data.get("path")
    if not path:
        raise HTTPException(status_code=400, detail="Missing 'path'")

    project_path = Path(path)
    if not project_path.exists():
        raise HTTPException(status_code=400, detail="Directory does not exist")

    netmath_dir = project_path / ".netmath"
    netmath_dir.mkdir(exist_ok=True)

    # Initialize empty knowledge.json
    knowledge_file = netmath_dir / "knowledge.json"
    if not knowledge_file.exists():
        knowledge_file.write_text(
            json.dumps({"nodes": {}, "edges": {}}, indent=2),
            encoding="utf-8",
        )

    # Initialize meta.json
    meta_file = netmath_dir / "meta.json"
    if not meta_file.exists():
        meta_file.write_text(
            json.dumps({"canvas": {"visible_nodes": [], "positions": {}}, "viewport": {}}, indent=2),
            encoding="utf-8",
        )

    # Initialize config.json
    config_file = netmath_dir / "config.json"
    if not config_file.exists():
        config_file.write_text(
            json.dumps({
                "type": "knowledge",
                "created": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }, indent=2),
            encoding="utf-8",
        )

    # Initialize network.mdx template
    mdx_file = netmath_dir / "network.mdx"
    if not mdx_file.exists():
        mdx_file.write_text(_NETWORK_MDX_TEMPLATE, encoding="utf-8")

    # Initialize README.md in project root
    readme_file = project_path / "README.md"
    if not readme_file.exists():
        project_name = project_path.name
        readme_file.write_text(
            _README_TEMPLATE.replace("{project_name}", project_name),
            encoding="utf-8",
        )

    # Initialize docs/ directory with index.mdx
    docs_dir = netmath_dir / "docs"
    if not docs_dir.exists():
        docs_dir.mkdir(exist_ok=True)
        index_file = docs_dir / "index.mdx"
        index_file.write_text(_DOCS_INDEX_TEMPLATE, encoding="utf-8")

    return {"status": "ok", "path": path, "type": "knowledge"}


@app.post("/api/reset")
async def reset_project(path: str = Query(..., description="Project path")):
    """
    Reset all project data.
    Deletes the entire .netmath directory.
    """
    import shutil

    project_path = Path(path)
    netmath_dir = project_path / ".netmath"

    # Clear in-memory caches
    if path in _knowledge_stores:
        del _knowledge_stores[path]

    if netmath_dir.exists():
        shutil.rmtree(netmath_dir)

    return {"status": "ok"}


# ============================================
# Docs API
# ============================================


@app.get("/api/docs/list")
async def list_docs(path: str = Query(..., description="Project path")):
    """List MDX files in .netmath/docs/ directory."""
    docs_dir = Path(path) / ".netmath" / "docs"
    if not docs_dir.exists():
        return {"files": []}

    files = []
    for f in sorted(docs_dir.iterdir()):
        if f.suffix in (".mdx", ".md") and f.is_file():
            files.append({
                "name": f.name,
                "path": str(f),
                "title": _extract_mdx_title(f),
            })
    # Put index.mdx first in the list
    files.sort(key=lambda x: (0 if x["name"] in ("index.mdx", "_index.mdx") else 1, x["name"]))
    return {"files": files}


@app.get("/api/docs/read")
async def read_doc(path: str = Query(..., description="Absolute path to the MDX file")):
    """Read a single MDX file."""
    file_path = Path(path)
    if not file_path.exists():
        raise HTTPException(404, f"File not found: {path}")
    content = file_path.read_text(encoding="utf-8")
    return {"content": content, "name": file_path.name}


def _extract_mdx_title(file_path: Path) -> str:
    """Extract first H1 title from MDX file, or fallback to filename."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("# "):
                    return line[2:].strip()
                if line and not line.startswith("---"):
                    break
    except Exception:
        pass
    return file_path.stem


# ============================================
# File Read API (for Monaco editor)
# ============================================


@app.get("/api/file")
async def read_file(
    path: str = Query(..., description="File absolute path"),
    line: int = Query(1, description="Target line number (1-indexed)"),
    context: int = Query(20, description="Context line count"),
):
    """
    Read file content (with context around a target line).
    """
    file_path = Path(path)

    if not file_path.exists():
        raise HTTPException(404, f"File not found: {path}")

    try:
        content = file_path.read_text(encoding="utf-8")
        lines = content.split("\n")
        total_lines = len(lines)

        start_line = max(1, line - context)
        end_line = min(total_lines, line + context)

        selected_lines = lines[start_line - 1 : end_line]
        selected_content = "\n".join(selected_lines)

        return {
            "content": selected_content,
            "startLine": start_line,
            "endLine": end_line,
            "totalLines": total_lines,
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to read file: {e}")


# ============================================
# Canvas API (stores in .netmath/meta.json)
# ============================================


@app.get("/api/canvas")
async def get_canvas(path: str = Query(..., description="Project path")):
    """Load canvas state"""
    meta = _load_meta(path)
    canvas = meta.get("canvas", {"visible_nodes": [], "positions": {}})
    return {
        "visible_nodes": canvas.get("visible_nodes", []),
        "positions": canvas.get("positions", {}),
    }


@app.post("/api/canvas")
async def save_canvas(request: CanvasSaveRequest):
    """Save canvas state"""
    meta = _load_meta(request.path)
    meta["canvas"] = {
        "visible_nodes": request.visible_nodes,
        "positions": request.positions,
    }
    _save_meta(request.path, meta)
    return {"status": "ok", "nodes": len(request.visible_nodes)}


@app.post("/api/canvas/add")
async def add_to_canvas(request: CanvasAddNodeRequest):
    """Add node to canvas"""
    meta = _load_meta(request.path)
    canvas = meta.setdefault("canvas", {"visible_nodes": [], "positions": {}})
    visible = canvas.setdefault("visible_nodes", [])
    if request.node_id not in visible:
        visible.append(request.node_id)
    _save_meta(request.path, meta)
    return {
        "status": "ok",
        "visible_nodes": canvas["visible_nodes"],
        "positions": canvas.get("positions", {}),
    }


@app.post("/api/canvas/add-batch")
async def add_batch_to_canvas(request: CanvasAddNodesRequest):
    """Batch add nodes to canvas"""
    meta = _load_meta(request.path)
    canvas = meta.setdefault("canvas", {"visible_nodes": [], "positions": {}})
    visible = canvas.setdefault("visible_nodes", [])
    for nid in request.node_ids:
        if nid not in visible:
            visible.append(nid)
    _save_meta(request.path, meta)
    return {
        "status": "ok",
        "visible_nodes": canvas["visible_nodes"],
        "positions": canvas.get("positions", {}),
    }


@app.post("/api/canvas/remove")
async def remove_from_canvas(request: CanvasAddNodeRequest):
    """Remove node from canvas"""
    meta = _load_meta(request.path)
    canvas = meta.setdefault("canvas", {"visible_nodes": [], "positions": {}})
    visible = canvas.setdefault("visible_nodes", [])
    if request.node_id in visible:
        visible.remove(request.node_id)
    # Also remove position
    canvas.get("positions", {}).pop(request.node_id, None)
    _save_meta(request.path, meta)
    return {
        "status": "ok",
        "visible_nodes": canvas["visible_nodes"],
        "positions": canvas.get("positions", {}),
    }


@app.post("/api/canvas/positions")
async def update_canvas_positions(request: PositionsUpdateRequest):
    """Update canvas node 3D positions"""
    meta = _load_meta(request.path)
    canvas = meta.setdefault("canvas", {"visible_nodes": [], "positions": {}})
    positions = canvas.setdefault("positions", {})
    positions.update(request.positions)
    _save_meta(request.path, meta)
    return {
        "status": "ok",
        "updated": len(request.positions),
        "positions": canvas["positions"],
    }


@app.post("/api/canvas/clear")
async def clear_canvas(path: str = Query(..., description="Project path")):
    """Clear canvas"""
    meta = _load_meta(path)
    meta["canvas"] = {"visible_nodes": [], "positions": {}}
    _save_meta(path, meta)
    return {"status": "ok"}


@app.get("/api/canvas/viewport")
async def get_viewport(path: str = Query(..., description="Project path")):
    """Get viewport state (camera position, selected nodes, etc.)"""
    meta = _load_meta(path)
    return meta.get("viewport", {})


@app.patch("/api/canvas/viewport")
async def update_viewport(request: ViewportUpdateRequest):
    """Update viewport state (incremental merge)"""
    meta = _load_meta(request.path)
    viewport = meta.setdefault("viewport", {})

    if request.camera_position is not None:
        viewport["camera_position"] = request.camera_position
    if request.camera_target is not None:
        viewport["camera_target"] = request.camera_target
    if request.zoom is not None:
        viewport["zoom"] = request.zoom
    if request.selected_node_id is not None:
        viewport["selected_node_id"] = request.selected_node_id
    if request.selected_edge_id is not None:
        viewport["selected_edge_id"] = request.selected_edge_id if request.selected_edge_id else None
    if request.filter_options is not None:
        viewport["filter_options"] = request.filter_options.model_dump()
    if request.ui_preferences is not None:
        existing = viewport.get("ui_preferences", {})
        existing.update(request.ui_preferences)
        viewport["ui_preferences"] = existing

    _save_meta(request.path, meta)
    return {"status": "ok", "viewport": viewport}


# ============================================
# Knowledge Graph API
# ============================================


@app.get("/api/knowledge/graph")
async def get_knowledge_graph(path: str = Query(..., description="Project path")):
    """Get the full knowledge graph (all nodes and edges)."""
    store = _get_knowledge_store(path)
    return store.get_graph()


@app.post("/api/knowledge/node")
async def create_knowledge_node(request: KnowledgeNodeRequest):
    """Create a knowledge node."""
    store = _get_knowledge_store(request.path)
    try:
        node = store.create_node(
            name=request.name,
            kind=request.kind,
            status=request.status,
            statement=request.statement,
            proof=request.proof,
            intuition=request.intuition,
            notes=request.notes,
            position=request.position,
            node_id=request.node_id,
        )
        return {"status": "ok", "node": node}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/knowledge/node/{node_id}")
async def get_knowledge_node(
    node_id: str,
    path: str = Query(..., description="Project path"),
):
    """Get a single knowledge node."""
    store = _get_knowledge_store(path)
    node = store.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Knowledge node not found: {node_id}")
    return node


@app.get("/api/knowledge/nodes")
async def get_knowledge_nodes(path: str = Query(..., description="Project path")):
    """Get all knowledge nodes."""
    store = _get_knowledge_store(path)
    return store.get_all_nodes()


@app.patch("/api/knowledge/node/{node_id}")
async def update_knowledge_node(
    node_id: str,
    request: KnowledgeNodeUpdateRequest,
):
    """Update a knowledge node."""
    store = _get_knowledge_store(request.path)
    try:
        updates = {k: v for k, v in request.model_dump().items() if k != "path" and v is not None}
        node = store.update_node(node_id, **updates)
        if not node:
            raise HTTPException(status_code=404, detail=f"Knowledge node not found: {node_id}")
        return {"status": "ok", "node": node}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/knowledge/node/{node_id}")
async def delete_knowledge_node(
    node_id: str,
    path: str = Query(..., description="Project path"),
):
    """Delete a knowledge node (cascades to connected edges)."""
    store = _get_knowledge_store(path)
    if not store.delete_node(node_id):
        raise HTTPException(status_code=404, detail=f"Knowledge node not found: {node_id}")
    return {"status": "ok", "nodeId": node_id}


@app.post("/api/knowledge/edge")
async def create_knowledge_edge(request: KnowledgeEdgeRequest):
    """Create a knowledge edge."""
    store = _get_knowledge_store(request.path)
    try:
        edge = store.create_edge(
            source=request.source,
            target=request.target,
            relation=request.relation,
            strict=request.strict,
            label=request.label,
            notes=request.notes,
            edge_id=request.edge_id,
        )
        return {"status": "ok", "edge": edge}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/knowledge/edge/{edge_id}")
async def get_knowledge_edge(
    edge_id: str,
    path: str = Query(..., description="Project path"),
):
    """Get a single knowledge edge."""
    store = _get_knowledge_store(path)
    edge = store.get_edge(edge_id)
    if not edge:
        raise HTTPException(status_code=404, detail=f"Knowledge edge not found: {edge_id}")
    return edge


@app.get("/api/knowledge/edges")
async def get_knowledge_edges(path: str = Query(..., description="Project path")):
    """Get all knowledge edges."""
    store = _get_knowledge_store(path)
    return store.get_all_edges()


@app.patch("/api/knowledge/edge/{edge_id}")
async def update_knowledge_edge(
    edge_id: str,
    request: KnowledgeEdgeUpdateRequest,
):
    """Update a knowledge edge."""
    store = _get_knowledge_store(request.path)
    try:
        updates = {k: v for k, v in request.model_dump().items() if k != "path" and v is not None}
        edge = store.update_edge(edge_id, **updates)
        if not edge:
            raise HTTPException(status_code=404, detail=f"Knowledge edge not found: {edge_id}")
        return {"status": "ok", "edge": edge}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/knowledge/edge/{edge_id}")
async def delete_knowledge_edge(
    edge_id: str,
    path: str = Query(..., description="Project path"),
):
    """Delete a knowledge edge."""
    store = _get_knowledge_store(path)
    if not store.delete_edge(edge_id):
        raise HTTPException(status_code=404, detail=f"Knowledge edge not found: {edge_id}")
    return {"status": "ok", "edgeId": edge_id}


# ============================================
# Main Entry Point
# ============================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8765)
