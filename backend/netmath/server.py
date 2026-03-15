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

import networkx as nx
from .analysis import (
    build_networkx_graph,
    compute_degree_statistics,
    compute_pagerank,
    compute_betweenness_centrality,
    detect_communities_louvain,
    compute_clustering_coefficients,
    compute_von_neumann_entropy,
    compute_structure_entropy,
)
from .analysis.entropy import random_graph_baseline
from .analysis.degree import compute_degree_shannon_entropy


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
    """Create knowledge node (object) request. Accepts both sort and legacy kind."""
    path: str
    node_id: Optional[str] = None
    name: str
    sort: str = "theorem"
    kind: Optional[str] = None  # Legacy, mapped to sort
    status: str = "stated"
    statement: str = ""
    proof: str = ""
    intuition: str = ""
    notes: str = ""
    position: Optional[dict] = None

    def model_post_init(self, __context):
        if self.kind is not None and self.sort == "theorem":
            self.sort = self.kind


class KnowledgeNodeUpdateRequest(BaseModel):
    """Update knowledge node (object) request."""
    path: str
    name: Optional[str] = None
    sort: Optional[str] = None
    kind: Optional[str] = None  # Legacy, mapped to sort
    status: Optional[str] = None
    statement: Optional[str] = None
    proof: Optional[str] = None
    intuition: Optional[str] = None
    notes: Optional[str] = None
    position: Optional[dict] = None

    def model_post_init(self, __context):
        if self.kind is not None and self.sort is None:
            self.sort = self.kind


class KnowledgeEdgeRequest(BaseModel):
    """Create knowledge edge (morphism) request. No sort — meaning is in notes."""
    path: str
    edge_id: Optional[str] = None
    source: str
    target: str
    strict: bool = True
    label: str = ""
    notes: str = ""
    # Legacy fields (ignored)
    sort: Optional[str] = None
    relation: Optional[str] = None


class KnowledgeEdgeUpdateRequest(BaseModel):
    """Update knowledge edge (morphism) request."""
    path: str
    strict: Optional[bool] = None
    label: Optional[str] = None
    notes: Optional[str] = None
    # Legacy fields (ignored)
    sort: Optional[str] = None
    relation: Optional[str] = None


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
            sort=request.sort,
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
        updates = {k: v for k, v in request.model_dump().items() if k not in ("path", "kind") and v is not None}
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
        updates = {k: v for k, v in request.model_dump().items() if k not in ("path", "sort", "relation") and v is not None}
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
# Analysis Routes (migrated from Astrolabe)
# ============================================

_graph_cache: dict[str, tuple[nx.DiGraph, float]] = {}  # path -> (graph, timestamp)
GRAPH_CACHE_TTL = 60  # seconds


def _get_or_build_graph(path: str) -> nx.DiGraph:
    """Get cached NetworkX graph or build a new one from knowledge storage"""
    import time as time_module
    now = time_module.time()

    # Check cache
    if path in _graph_cache:
        cached_graph, timestamp = _graph_cache[path]
        if now - timestamp < GRAPH_CACHE_TTL:
            return cached_graph

    # Build new graph from knowledge storage
    storage = _get_knowledge_store(path)
    nodes = storage.get_all_nodes()
    edges = storage.get_all_edges()
    G = build_networkx_graph(nodes, edges, directed=True)

    # Cache it
    _graph_cache[path] = (G, now)
    return G


@app.get("/api/project/analysis/degree")
async def get_degree_analysis(
    path: str = Query(..., description="Project path"),
    top_k: int = Query(20, description="Number of top nodes to return"),
):
    """
    Get degree distribution analysis for the project graph.

    Returns:
        - inDegree: Incoming edge statistics (how many dependencies each node has)
        - outDegree: Outgoing edge statistics (how many nodes depend on each)
        - totalDegree: Combined degree statistics
        - topInDegree: Nodes with most incoming edges (most dependencies)
        - topOutDegree: Nodes with most outgoing edges (most depended upon)
        - shannonEntropy: Entropy of the degree distribution
    """
    G = _get_or_build_graph(path)
    stats = compute_degree_statistics(G, top_k=top_k)

    return {
        "status": "ok",
        "analysis": "degree",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": stats.to_dict(),
    }


@app.get("/api/project/analysis/pagerank")
async def get_pagerank_analysis(
    path: str = Query(..., description="Project path"),
    alpha: float = Query(0.85, description="Damping factor (0-1)"),
    top_k: int = Query(20, description="Number of top nodes to return"),
    include_all: bool = Query(False, description="Include all node values (can be large)"),
):
    """
    Get PageRank centrality analysis for the project graph.

    PageRank identifies the most "important" nodes based on link structure.
    In Lean projects, high PageRank indicates foundational theorems/lemmas
    that are referenced by many other important results.

    Args:
        path: Project path
        alpha: Damping factor (default 0.85, higher = more weight on link structure)
        top_k: Number of top nodes to return
        include_all: If True, include centrality values for all nodes

    Returns:
        - topNodes: List of top k nodes by PageRank
        - mean: Mean PageRank value
        - maxValue: Maximum PageRank value
        - minValue: Minimum PageRank value
        - values: (optional) All node PageRank values
    """
    G = _get_or_build_graph(path)
    result = compute_pagerank(G, alpha=alpha, top_k=top_k)

    response_data = {
        "topNodes": [{"nodeId": n, "value": v} for n, v in result.top_nodes],
        "mean": result.mean,
        "maxValue": result.max_value,
        "minValue": result.min_value,
    }

    if include_all:
        response_data["values"] = result.values

    return {
        "status": "ok",
        "analysis": "pagerank",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "alpha": alpha,
        "data": response_data,
    }


@app.get("/api/project/analysis/betweenness")
async def get_betweenness_analysis(
    path: str = Query(..., description="Project path"),
    k: int = Query(1000, description="Number of samples for approximation (0 = exact)"),
    top_k: int = Query(20, description="Number of top nodes to return"),
    include_all: bool = Query(False, description="Include all node values (can be large)"),
):
    """
    Get Betweenness centrality analysis for the project graph.

    Betweenness measures how often a node lies on shortest paths between other nodes.
    High betweenness indicates "bridge" nodes that connect different parts of the graph.

    In Lean projects, high betweenness indicates lemmas that bridge different
    mathematical domains - "connector" results that link different areas.

    Args:
        path: Project path
        k: Number of random samples for approximation (default 1000, 0 = exact calculation)
        top_k: Number of top nodes to return
        include_all: If True, include centrality values for all nodes

    Returns:
        - topNodes: List of top k nodes by betweenness
        - mean: Mean betweenness value
        - maxValue: Maximum betweenness value
        - minValue: Minimum betweenness value
        - values: (optional) All node betweenness values
    """
    G = _get_or_build_graph(path)

    # k=0 means exact calculation
    sample_k = k if k > 0 else None
    result = compute_betweenness_centrality(G, k=sample_k, top_k=top_k)

    response_data = {
        "topNodes": [{"nodeId": n, "value": v} for n, v in result.top_nodes],
        "mean": result.mean,
        "maxValue": result.max_value,
        "minValue": result.min_value,
    }

    if include_all:
        response_data["values"] = result.values

    return {
        "status": "ok",
        "analysis": "betweenness",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "sampled": sample_k is not None,
        "sampleSize": sample_k,
        "data": response_data,
    }


@app.get("/api/project/analysis/communities")
async def get_community_detection(
    path: str = Query(..., description="Project path"),
    resolution: float = Query(1.0, description="Resolution parameter (higher = more communities)"),
    include_partition: bool = Query(False, description="Include full node->community mapping"),
    include_members: bool = Query(True, description="Include community member lists"),
    top_k: int = Query(10, description="Number of top communities to show members for"),
):
    """
    Detect communities using the Louvain algorithm.

    Communities are groups of densely connected nodes. In Lean projects,
    they represent clusters of related mathematical concepts.

    Args:
        path: Project path
        resolution: Higher = more smaller communities, lower = fewer larger communities
        include_partition: If True, include full node->community_id mapping
        include_members: If True, include member lists for top communities
        top_k: Number of top communities to include member lists for

    Returns:
        - numCommunities: Total number of communities found
        - modularity: Quality score (0-1, higher = better separation)
        - sizes: List of community sizes (sorted descending)
        - communities: (optional) Top k communities with member lists
        - partition: (optional) Full node->community_id mapping
    """
    G = _get_or_build_graph(path)
    result = detect_communities_louvain(G, resolution=resolution)

    # Build response
    response_data = {
        "numCommunities": result.num_communities,
        "modularity": result.modularity,
        "sizes": result.sizes,
    }

    # Include top k communities with members
    if include_members:
        # Sort communities by size
        sorted_communities = sorted(
            result.communities.items(),
            key=lambda x: len(x[1]),
            reverse=True
        )
        top_communities = []
        for comm_id, members in sorted_communities[:top_k]:
            top_communities.append({
                "id": comm_id,
                "size": len(members),
                "members": members,
            })
        response_data["topCommunities"] = top_communities

    if include_partition:
        response_data["partition"] = result.partition

    return {
        "status": "ok",
        "analysis": "communities",
        "algorithm": "louvain",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "resolution": resolution,
        "data": response_data,
    }


@app.get("/api/project/analysis/clustering")
async def get_clustering_analysis(
    path: str = Query(..., description="Project path"),
    top_k: int = Query(20, description="Number of top nodes to return"),
    include_local: bool = Query(False, description="Include all local coefficients (can be large)"),
    include_namespaces: bool = Query(True, description="Include clustering by namespace"),
):
    """
    Get clustering coefficient analysis for the project graph.

    The clustering coefficient measures how much nodes tend to cluster together.
    - Global (transitivity): Fraction of possible triangles that exist
    - Local: For each node, what fraction of its neighbors are also connected
    - By namespace: Average clustering within each namespace

    In Lean projects, high clustering indicates tightly interconnected groups
    of lemmas representing cohesive mathematical topics.

    Args:
        path: Project path
        top_k: Number of top clustered nodes to return
        include_local: If True, include local coefficients for all nodes
        include_namespaces: If True, include clustering breakdown by namespace

    Returns:
        - globalCoefficient: Graph-wide transitivity
        - averageCoefficient: Mean of local coefficients
        - topNodes: Nodes with highest local clustering
        - byNamespace: (optional) Average clustering per namespace
        - local: (optional) All local coefficients
    """
    G = _get_or_build_graph(path)
    result = compute_clustering_coefficients(G, include_local=True)

    # Get top-k nodes by local clustering (filter out nodes with degree < 2)
    G_undirected = G.to_undirected() if G.is_directed() else G
    degrees = dict(G_undirected.degree())

    # Sort nodes by clustering, filter by min degree
    sorted_nodes = sorted(
        [(n, c) for n, c in result.local.items() if degrees.get(n, 0) >= 2],
        key=lambda x: x[1],
        reverse=True
    )
    top_nodes = [{"nodeId": n, "value": c, "degree": degrees.get(n, 0)}
                 for n, c in sorted_nodes[:top_k]]

    # Build response
    response_data = {
        "globalCoefficient": result.global_coefficient,
        "averageCoefficient": result.average_coefficient,
        "topNodes": top_nodes,
    }

    if include_namespaces:
        # Sort namespaces by clustering coefficient
        sorted_ns = sorted(
            result.by_namespace.items(),
            key=lambda x: x[1],
            reverse=True
        )
        response_data["byNamespace"] = [
            {"namespace": ns, "avgClustering": c, "nodeCount": sum(1 for n in result.local if n.startswith(ns + "."))}
            for ns, c in sorted_ns[:50]  # Top 50 namespaces
        ]

    if include_local:
        response_data["local"] = result.local

    return {
        "status": "ok",
        "analysis": "clustering",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": response_data,
    }


@app.get("/api/project/analysis/entropy")
async def get_project_entropy(
    path: str = Query(..., description="Project path"),
    num_eigenvalues: int = Query(100, description="Number of eigenvalues for Von Neumann entropy"),
    random_samples: int = Query(5, description="Number of random graph samples for baseline"),
):
    """
    Compute entropy metrics for the project's dependency graph.

    Returns:
        - vonNeumann: Von Neumann entropy (based on graph Laplacian)
        - shannon: Shannon entropy (based on degree distribution)
        - effectiveDimension: exp(Von Neumann entropy)
        - randomBaseline: Entropy of equivalent random graph (same n, m)
        - normalizedEntropy: Von Neumann entropy / random baseline entropy
    """
    G = _get_or_build_graph(path)
    n = G.number_of_nodes()
    m = G.number_of_edges()

    # Compute Von Neumann entropy
    vn_result = compute_von_neumann_entropy(G, num_eigenvalues=num_eigenvalues)
    vn_entropy = vn_result["vonNeumannEntropy"]
    vn_effective_dim = vn_result["effectiveDimension"]
    vn_num_eigenvalues = len(vn_result["eigenvalues"])

    # Compute Shannon entropy from degree distribution
    shannon_entropy = compute_degree_shannon_entropy(G)

    # Compute random graph baseline
    baseline = random_graph_baseline(n, m, num_samples=random_samples)
    baseline_vn_mean = baseline["vonNeumann"]["mean"]
    baseline_vn_std = baseline["vonNeumann"]["std"]

    # Normalized entropy (compared to random graph)
    normalized = vn_entropy / baseline_vn_mean if baseline_vn_mean > 0 else 0.0

    return {
        "status": "ok",
        "analysis": "entropy",
        "numNodes": n,
        "numEdges": m,
        "data": {
            "vonNeumann": {
                "entropy": vn_entropy,
                "numEigenvalues": vn_num_eigenvalues,
                "effectiveDimension": vn_effective_dim,
            },
            "shannon": {
                "entropy": shannon_entropy,
                "description": "Entropy of degree distribution",
            },
            "randomBaseline": {
                "meanEntropy": baseline_vn_mean,
                "stdEntropy": baseline_vn_std,
                "numSamples": baseline["numSamples"],
            },
            "normalizedEntropy": normalized,
            "interpretation": (
                "low" if normalized < 0.8 else
                "medium" if normalized < 1.2 else
                "high"
            ),
        },
    }


@app.get("/api/project/analysis/dag")
async def get_dag_analysis(
    path: str = Query(..., description="Project path"),
    include_all_depths: bool = Query(False, description="Include depth for all nodes"),
    include_all_scores: bool = Query(False, description="Include bottleneck scores for all nodes"),
    top_k: int = Query(20, description="Number of top nodes to return for each metric"),
):
    """
    Get DAG-specific analysis for the project dependency graph.

    DAG analysis is specialized for formal mathematics dependency structures,
    providing insights into proof depth, bottlenecks, and critical paths.

    Returns:
        - sources: Root nodes (axioms, definitions with no dependencies)
        - sinks: Terminal nodes (not used by other theorems)
        - graphDepth: Length of the longest dependency chain
        - criticalPath: The longest dependency chain (node IDs)
        - layers: Number of topological layers
        - topDeepNodes: Nodes with highest dependency depth
        - topBottlenecks: Nodes with highest bottleneck score
        - topReachability: Nodes that can reach the most other nodes
    """
    from .analysis.dag import (
        analyze_dag,
        compute_dependency_depth,
        compute_bottleneck_scores,
        compute_reachability_count,
    )

    G = _get_or_build_graph(path)

    # Run full DAG analysis
    result = analyze_dag(G)

    if not result.get("is_dag", False):
        return {
            "status": "error",
            "analysis": "dag",
            "error": result.get("error", "Graph contains cycles"),
            "numNodes": G.number_of_nodes(),
            "numEdges": G.number_of_edges(),
        }

    # Prepare top nodes by depth
    depths = result["depths"]
    sorted_by_depth = sorted(depths.items(), key=lambda x: -x[1])[:top_k]

    # Prepare top bottlenecks
    bottlenecks = result["bottleneck_scores"]
    sorted_bottlenecks = sorted(bottlenecks.items(), key=lambda x: -x[1])[:top_k]

    # Prepare top reachability
    reachability = result["reachability"]
    sorted_reachability = sorted(reachability.items(), key=lambda x: -x[1])[:top_k]

    response_data = {
        "isDAG": True,
        "sources": result["sources"],
        "sinks": result["sinks"],
        "numSources": result["num_sources"],
        "numSinks": result["num_sinks"],
        "graphDepth": result["graph_depth"],
        "numLayers": result["num_layers"],
        "criticalPath": result["critical_path"],
        "topDeepNodes": [{"nodeId": n, "depth": d} for n, d in sorted_by_depth],
        "topBottlenecks": [{"nodeId": n, "score": s} for n, s in sorted_bottlenecks],
        "topReachability": [{"nodeId": n, "count": c} for n, c in sorted_reachability],
    }

    if include_all_depths:
        response_data["allDepths"] = depths

    if include_all_scores:
        response_data["allBottleneckScores"] = bottlenecks
        response_data["allReachability"] = reachability

    return {
        "status": "ok",
        "analysis": "dag",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": response_data,
    }


@app.get("/api/project/analysis/critical-path")
async def get_critical_path_to_node(
    path: str = Query(..., description="Project path"),
    target: str = Query(..., description="Target node ID"),
):
    """
    Find the critical path (longest dependency chain) to a specific node.

    This answers: "What is the deepest dependency chain to understand this theorem?"

    Returns:
        - path: List of node IDs forming the longest path to target
        - length: Number of edges in the path
    """
    from .analysis.dag import find_critical_path_to

    G = _get_or_build_graph(path)

    try:
        critical_path = find_critical_path_to(G, target)
        return {
            "status": "ok",
            "analysis": "critical-path",
            "target": target,
            "data": {
                "path": critical_path,
                "length": len(critical_path) - 1 if critical_path else 0,
            },
        }
    except ValueError as e:
        return {
            "status": "error",
            "analysis": "critical-path",
            "target": target,
            "error": str(e),
        }


@app.get("/api/project/analysis/structural")
async def get_structural_analysis(
    path: str = Query(..., description="Project path"),
    top_k: int = Query(20, description="Number of top nodes to return"),
):
    """
    Get structural analysis: bridges, articulation points, HITS scores.

    Identifies critical structural elements in the dependency graph:
    - Bridges: edges whose removal disconnects the graph
    - Articulation points: nodes whose removal disconnects the graph
    - HITS: hub and authority scores

    Returns:
        - bridges: List of bridge edges
        - articulationPoints: List of articulation point node IDs
        - topHubs: Nodes with highest hub scores (comprehensive proofs)
        - topAuthorities: Nodes with highest authority scores (fundamental theorems)
    """
    from .analysis.structural import (
        find_bridges,
        find_articulation_points,
        get_top_hubs,
        get_top_authorities,
    )

    G = _get_or_build_graph(path)

    bridges = find_bridges(G)
    ap = find_articulation_points(G)
    top_hubs = get_top_hubs(G, k=top_k)
    top_authorities = get_top_authorities(G, k=top_k)

    return {
        "status": "ok",
        "analysis": "structural",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": {
            "bridges": [{"source": s, "target": t} for s, t in bridges],
            "numBridges": len(bridges),
            "articulationPoints": ap,
            "numArticulationPoints": len(ap),
            "topHubs": [{"nodeId": n, "score": s} for n, s in top_hubs],
            "topAuthorities": [{"nodeId": n, "score": s} for n, s in top_authorities],
        },
    }


@app.get("/api/project/analysis/katz")
async def get_katz_centrality(
    path: str = Query(..., description="Project path"),
    alpha: float = Query(0.1, description="Attenuation factor"),
    top_k: int = Query(20, description="Number of top nodes to return"),
    include_all: bool = Query(False, description="Include all node values"),
):
    """
    Get Katz centrality analysis.

    Katz centrality measures influence based on total walks from a node.
    Better suited for DAGs than PageRank as it handles sink nodes.

    Args:
        alpha: Attenuation factor (lower = less influence from distant nodes)
        top_k: Number of top nodes to return

    Returns:
        - topNodes: Nodes with highest Katz centrality
        - values: (optional) All node values
    """
    from .analysis.structural import compute_katz_centrality

    G = _get_or_build_graph(path)

    katz = compute_katz_centrality(G, alpha=alpha)
    sorted_katz = sorted(katz.items(), key=lambda x: -x[1])[:top_k]

    response_data = {
        "topNodes": [{"nodeId": n, "value": v} for n, v in sorted_katz],
    }

    if include_all:
        response_data["values"] = katz

    return {
        "status": "ok",
        "analysis": "katz",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "alpha": alpha,
        "data": response_data,
    }


@app.get("/api/project/analysis/transitive-reduction")
async def get_transitive_reduction(
    path: str = Query(..., description="Project path"),
):
    """
    Get transitive reduction of the dependency graph.

    Identifies redundant (transitive) edges that can be removed
    without changing reachability. Useful for simplifying visualization.

    Returns:
        - transitiveEdges: List of edges that are redundant
        - numTransitiveEdges: Count of transitive edges
        - reductionRatio: Percentage of edges that are transitive
    """
    from .analysis.advanced import get_transitive_edges

    G = _get_or_build_graph(path)

    transitive = get_transitive_edges(G)
    total_edges = G.number_of_edges()
    reduction_ratio = len(transitive) / total_edges if total_edges > 0 else 0

    return {
        "status": "ok",
        "analysis": "transitive-reduction",
        "numNodes": G.number_of_nodes(),
        "numEdges": total_edges,
        "data": {
            "transitiveEdges": [{"source": s, "target": t} for s, t in transitive],
            "numTransitiveEdges": len(transitive),
            "reductionRatio": reduction_ratio,
            "essentialEdges": total_edges - len(transitive),
        },
    }


@app.get("/api/project/analysis/spectral")
async def get_spectral_clustering(
    path: str = Query(..., description="Project path"),
    n_clusters: int = Query(5, description="Number of clusters"),
):
    """
    Perform spectral clustering on the dependency graph.

    Uses graph Laplacian eigenvectors for clustering.
    May reveal structure that Louvain misses.

    Returns:
        - clusters: Mapping of node ID to cluster ID
        - numClusters: Number of clusters found
        - fiedlerVector: (optional) 2nd eigenvector for 2-way partitioning
    """
    from .analysis.advanced import compute_spectral_clustering, compute_fiedler_vector

    G = _get_or_build_graph(path)

    clusters = compute_spectral_clustering(G, n_clusters=n_clusters)

    # Group nodes by cluster
    cluster_members = {}
    for node, cid in clusters.items():
        if cid not in cluster_members:
            cluster_members[cid] = []
        cluster_members[cid].append(node)

    return {
        "status": "ok",
        "analysis": "spectral",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "nClusters": n_clusters,
        "data": {
            "clusters": clusters,
            "numClusters": len(cluster_members),
            "clusterSizes": {cid: len(members) for cid, members in cluster_members.items()},
        },
    }


@app.get("/api/project/analysis/hierarchical")
async def get_hierarchical_clustering(
    path: str = Query(..., description="Project path"),
    n_clusters: int = Query(5, description="Number of clusters to cut"),
):
    """
    Perform hierarchical clustering on the dependency graph.

    Produces nested community structure (dendrogram).

    Returns:
        - clusters: Flat clustering at specified level
        - numClusters: Number of clusters
    """
    from .analysis.advanced import compute_hierarchical_clustering, cut_dendrogram

    G = _get_or_build_graph(path)

    result = compute_hierarchical_clustering(G)

    if len(result["labels"]) <= 1:
        clusters = {label: 0 for label in result["labels"]}
    else:
        clusters = cut_dendrogram(
            result["dendrogram"],
            result["labels"],
            n_clusters=n_clusters
        )

    # Group nodes by cluster
    cluster_members = {}
    for node, cid in clusters.items():
        if cid not in cluster_members:
            cluster_members[cid] = []
        cluster_members[cid].append(node)

    return {
        "status": "ok",
        "analysis": "hierarchical",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "nClusters": n_clusters,
        "data": {
            "clusters": clusters,
            "numClusters": len(cluster_members),
            "clusterSizes": {cid: len(members) for cid, members in cluster_members.items()},
        },
    }


# ============================================
# Advanced Analysis API (Statistics, Curvature, Geometry, Topology)
# ============================================


@app.get("/api/project/analysis/statistics")
async def get_statistics_analysis(
    path: str = Query(..., description="Project path"),
    fit_distribution: bool = Query(True, description="Fit power law to degree distribution"),
    compute_correlations: bool = Query(True, description="Compute metric correlations"),
    detect_anomalies_flag: bool = Query(True, description="Detect anomalous nodes"),
    anomaly_threshold: float = Query(3.0, description="Z-score threshold for anomaly detection"),
    top_k: int = Query(20, description="Number of top anomalies to return"),
):
    """
    Comprehensive statistical analysis of the graph.

    Returns:
        - powerLaw: Power law fit results (alpha, xmin, p-value)
        - correlations: Correlation matrix between centrality metrics
        - assortativity: Degree correlation coefficient
        - anomalies: Nodes with unusual metric combinations
    """
    from .analysis.statistics import (
        fit_degree_distribution,
        compute_metric_correlations,
        compute_degree_assortativity,
        detect_zscore_anomalies,
    )

    G = _get_or_build_graph(path)
    result = {}

    # Power law fit
    if fit_distribution:
        result["powerLaw"] = fit_degree_distribution(G)

    # Metric correlations
    if compute_correlations:
        pagerank = nx.pagerank(G)
        betweenness = nx.betweenness_centrality(G)
        in_degree = dict(G.in_degree()) if G.is_directed() else dict(G.degree())
        out_degree = dict(G.out_degree()) if G.is_directed() else dict(G.degree())

        metrics = {
            "pagerank": pagerank,
            "betweenness": betweenness,
            "in_degree": in_degree,
            "out_degree": out_degree,
        }
        result["correlations"] = compute_metric_correlations(metrics)

    # Assortativity
    result["assortativity"] = compute_degree_assortativity(G)

    # Anomaly detection
    if detect_anomalies_flag:
        pagerank = nx.pagerank(G)
        betweenness = nx.betweenness_centrality(G)
        in_degree = dict(G.in_degree()) if G.is_directed() else dict(G.degree())

        metrics = {
            "pagerank": pagerank,
            "betweenness": betweenness,
            "in_degree": in_degree,
        }
        anomaly_result = detect_zscore_anomalies(metrics, threshold=anomaly_threshold)

        # Collect anomalies from all metrics
        all_anomalies = []
        if "by_metric" in anomaly_result:
            for metric_name, metric_data in anomaly_result["by_metric"].items():
                for a in metric_data.get("anomalies", [])[:top_k]:
                    all_anomalies.append({
                        "nodeId": a["node"],
                        "metric": metric_name,
                        "zScore": a["z_score"],
                        "value": a["value"],
                        "direction": a["direction"],
                    })

        # Sort by absolute z-score
        all_anomalies.sort(key=lambda x: abs(x["zScore"]), reverse=True)
        result["anomalies"] = all_anomalies[:top_k]
        result["multiAnomalyNodes"] = anomaly_result.get("multi_anomaly_nodes", [])

    return {
        "status": "ok",
        "analysis": "statistics",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": result,
    }


@app.get("/api/project/analysis/link-prediction")
async def get_link_prediction(
    path: str = Query(..., description="Project path"),
    method: str = Query("adamic_adar", description="Prediction method: common_neighbors, adamic_adar, jaccard, resource_allocation, preferential_attachment"),
    top_k: int = Query(50, description="Number of top predictions to return"),
):
    """
    Predict missing edges in the dependency graph.

    Identifies potential dependencies that may be missing or could be added.
    This is useful for discovering implicit relationships between theorems.

    Returns:
        - predictions: List of predicted edges with scores
    """
    from .analysis.link_prediction import predict_links

    G = _get_or_build_graph(path)
    predictions = predict_links(G, method=method, top_k=top_k)

    return {
        "status": "ok",
        "analysis": "link-prediction",
        "method": method,
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": {
            "predictions": predictions,
            "numPredictions": len(predictions),
        },
    }


@app.get("/api/project/analysis/curvature")
async def get_curvature_analysis(
    path: str = Query(..., description="Project path"),
    method: str = Query("forman", description="Curvature method: forman (fast) or ollivier (accurate)"),
    include_edge_curvatures: bool = Query(False, description="Include all edge curvatures"),
    include_node_curvatures: bool = Query(True, description="Include node curvatures"),
    top_k: int = Query(20, description="Number of extreme nodes/edges to return"),
):
    """
    Compute Ricci curvature of the dependency graph.

    Geometric analysis using optimal transport theory:
    - Positive curvature: Tightly clustered regions
    - Negative curvature: Branching points, fundamental lemmas
    - Zero curvature: Linear chains

    Args:
        method: "forman" (O(E), fast) or "ollivier" (O(V*E), accurate)

    Returns:
        - statistics: Mean, std, min, max curvature
        - interpretation: Structural interpretation
        - mostClustered: Nodes/edges with highest positive curvature
        - mostBranching: Nodes/edges with highest negative curvature
    """
    from .analysis.optimal_transport import analyze_curvature

    G = _get_or_build_graph(path)
    result = analyze_curvature(G, method=method)

    response_data = {
        "method": result["curvature"].get("method", method),
        "statistics": result["curvature"].get("statistics", {}),
        "interpretation": result["curvature"].get("interpretation", {}),
    }

    # Add highlights
    if "highlights" in result:
        response_data["mostClusteredEdges"] = result["highlights"].get("most_clustered_edges", [])[:top_k]
        response_data["mostBranchingEdges"] = result["highlights"].get("most_branching_edges", [])[:top_k]
        response_data["mostClusteredNodes"] = result["highlights"].get("most_clustered_nodes", [])[:top_k]
        response_data["mostBranchingNodes"] = result["highlights"].get("most_branching_nodes", [])[:top_k]

    if include_node_curvatures and "node_curvatures" in result["curvature"]:
        response_data["nodeCurvatures"] = result["curvature"]["node_curvatures"]

    if include_edge_curvatures and "edge_curvatures" in result["curvature"]:
        response_data["edgeCurvatures"] = result["curvature"]["edge_curvatures"]

    return {
        "status": "ok",
        "analysis": "curvature",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": response_data,
    }


@app.get("/api/project/analysis/geometry")
async def get_geometry_analysis(
    path: str = Query(..., description="Project path"),
    include_spectrum: bool = Query(True, description="Include Laplacian spectrum"),
    include_hks: bool = Query(True, description="Include Heat Kernel Signatures"),
    num_eigenvalues: int = Query(10, description="Number of eigenvalues to compute"),
):
    """
    Geometric analysis using the graph Laplacian.

    Returns:
        - spectrum: Laplacian eigenvalues and Fiedler vector
        - hks: Heat Kernel Signature for multi-scale node analysis
        - algebraicConnectivity: Fiedler value (2nd smallest eigenvalue)
    """
    from .analysis.geometry import compute_laplacian_spectrum, compute_heat_kernel_signature

    G = _get_or_build_graph(path)
    response_data = {}

    if include_spectrum:
        spectrum = compute_laplacian_spectrum(G, k=num_eigenvalues)
        response_data["spectrum"] = spectrum

    if include_hks and G.number_of_nodes() <= 2000:
        hks = compute_heat_kernel_signature(G)
        # Only include statistics and top nodes, not full HKS
        if "error" not in hks:
            response_data["hks"] = {
                "timeScales": hks.get("time_scales", []),
                "statistics": hks.get("statistics", {}),
                "interpretation": hks.get("interpretation", ""),
            }
        else:
            response_data["hks"] = hks
    elif include_hks:
        response_data["hks"] = {"note": "Skipped for large graph (>2000 nodes)"}

    return {
        "status": "ok",
        "analysis": "geometry",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": response_data,
    }


@app.get("/api/project/analysis/topology")
async def get_topology_analysis(
    path: str = Query(..., description="Project path"),
    include_persistent_homology: bool = Query(True, description="Include persistent homology (requires gudhi)"),
    filtration: str = Query("degree", description="Filtration type: degree, centrality, distance"),
):
    """
    Topological analysis using TDA methods.

    Returns:
        - bettiNumbers: β₀ (components) and β₁ (cycles)
        - eulerCharacteristic: V - E
        - cyclomaticComplexity: Number of independent cycles
        - persistentHomology: (optional) Persistence diagrams
    """
    from .analysis.topology import compute_betti_numbers, compute_persistent_homology

    G = _get_or_build_graph(path)
    response_data = {}

    # Betti numbers (always available)
    betti = compute_betti_numbers(G)
    response_data["bettiNumbers"] = betti

    # Persistent homology (if gudhi available and graph not too large)
    # Note: For graphs with >4000 nodes, computation can be very slow
    max_nodes_for_ph = 4000
    if include_persistent_homology and G.number_of_nodes() <= max_nodes_for_ph:
        ph = compute_persistent_homology(G, filtration=filtration)
        if "error" not in ph and "warning" not in ph:
            response_data["persistentHomology"] = {
                "filtration": ph.get("filtration"),
                "summary": ph.get("summary", {}),
                "bettiCurve": ph.get("betti_curve", []),
                # Include raw diagrams for visualization (P2)
                "diagrams": ph.get("persistence_diagrams", {}),
            }
        else:
            response_data["persistentHomology"] = ph
    elif include_persistent_homology:
        response_data["persistentHomology"] = {"note": f"Skipped: graph too large ({G.number_of_nodes()} > {max_nodes_for_ph} nodes)"}

    return {
        "status": "ok",
        "analysis": "topology",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": response_data,
    }


@app.get("/api/project/analysis/mapper")
async def get_mapper_analysis(
    path: str = Query(..., description="Project path"),
    filter_func: str = Query("degree", description="Filter function: degree, pagerank, closeness, depth"),
    num_intervals: int = Query(10, description="Number of intervals"),
    overlap: float = Query(0.3, description="Overlap fraction (0-0.5)"),
):
    """
    Compute Mapper graph - a simplified topological skeleton. (P2)

    Mapper creates a simplified representation by:
    1. Applying a filter function for 1D projection
    2. Covering with overlapping intervals
    3. Clustering within each interval
    4. Connecting clusters that share points

    Returns:
        - mapperNodes: List of Mapper nodes with members
        - mapperEdges: List of edges between Mapper nodes
        - summary: Statistics about the Mapper graph
    """
    from .analysis.topology import compute_mapper

    G = _get_or_build_graph(path)

    if G.number_of_nodes() > 5000:
        return {
            "status": "error",
            "analysis": "mapper",
            "error": "Graph too large for Mapper (>5000 nodes)",
        }

    result = compute_mapper(G, filter_func=filter_func, num_intervals=num_intervals, overlap=overlap)

    if "error" in result:
        return {
            "status": "error",
            "analysis": "mapper",
            "error": result["error"],
        }

    return {
        "status": "ok",
        "analysis": "mapper",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": {
            "filterFunction": result.get("filter_function"),
            "mapperNodes": result.get("mapper_nodes", []),
            "mapperEdges": result.get("mapper_edges", []),
            "summary": result.get("summary", {}),
            "interpretation": result.get("interpretation", ""),
        },
    }


@app.get("/api/project/analysis/correlations")
async def get_metric_correlations(
    path: str = Query(..., description="Project path"),
):
    """
    Compute correlation matrix between graph metrics. (P2)

    Returns:
        - metrics: List of metric names
        - matrix: Correlation matrix (NxN)
        - significantPairs: Pairs with p < 0.05
    """
    from .analysis import (
        compute_pagerank,
        compute_betweenness_centrality,
        compute_clustering_coefficients,
    )
    from .analysis.dag import analyze_dag
    from .analysis.statistics import compute_metric_correlations

    G = _get_or_build_graph(path)

    # Collect metrics
    metrics = {}

    # PageRank
    pr_result = compute_pagerank(G)
    metrics["pagerank"] = pr_result.values

    # Betweenness
    bc_result = compute_betweenness_centrality(G)
    metrics["betweenness"] = bc_result.values

    # Clustering
    try:
        clustering_result = compute_clustering_coefficients(G)
        metrics["clustering"] = clustering_result.local
    except Exception as e:
        import logging
        logging.warning(f"Clustering failed in correlations: {e}")

    # In-degree
    metrics["indegree"] = {n: G.in_degree(n) for n in G.nodes()}

    # Out-degree
    metrics["outdegree"] = {n: G.out_degree(n) for n in G.nodes()}

    # DAG metrics
    dag_result = analyze_dag(G)
    if dag_result.get("is_dag", False):
        metrics["depth"] = dag_result.get("depths", {})
        metrics["bottleneck"] = dag_result.get("bottleneck_scores", {})
        metrics["reachability"] = dag_result.get("reachability", {})

    # Compute correlations
    corr_result = compute_metric_correlations(metrics, method="spearman")

    if "error" in corr_result:
        return {
            "status": "error",
            "analysis": "correlations",
            "error": corr_result["error"],
        }

    return {
        "status": "ok",
        "analysis": "correlations",
        "numNodes": G.number_of_nodes(),
        "data": {
            "metrics": corr_result.get("metric_names", []),
            "matrix": corr_result.get("correlation_matrix", []),
            "significantPairs": corr_result.get("significant_pairs", []),
        },
    }


@app.get("/api/project/analysis/embedding")
async def get_embedding_analysis(
    path: str = Query(..., description="Project path"),
    method: str = Query("spectral", description="Embedding method: spectral, diffusion"),
    n_components: int = Query(3, description="Number of dimensions"),
):
    """
    Compute graph embedding for visualization or clustering.

    Methods:
    - spectral: Based on Laplacian eigenvectors
    - diffusion: Based on diffusion process on graph

    Returns:
        - embedding: Dict mapping node -> [x, y, z] coordinates
    """
    from .analysis.embedding import compute_spectral_embedding, compute_diffusion_map

    G = _get_or_build_graph(path)

    if method == "spectral":
        result = compute_spectral_embedding(G, n_components=n_components)
    elif method == "diffusion":
        result = compute_diffusion_map(G, n_components=n_components)
    else:
        return {
            "status": "error",
            "analysis": "embedding",
            "error": f"Unknown method: {method}",
        }

    return {
        "status": "ok",
        "analysis": "embedding",
        "method": method,
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": result,
    }


@app.get("/api/project/analysis/patterns")
async def get_pattern_analysis(
    path: str = Query(..., description="Project path"),
    include_motifs: bool = Query(True, description="Count network motifs"),
    include_proof_patterns: bool = Query(True, description="Find proof-specific patterns"),
    sample_size: int = Query(1000, description="Sample size for motif significance"),
):
    """
    Pattern recognition in the dependency graph.

    Identifies structural patterns common in mathematical proofs:
    - Motifs: 3-node and 4-node subgraph patterns
    - Proof patterns: chains, forks, joins, diamonds

    Returns:
        - motifs: Counts and z-scores for each motif type
        - proofPatterns: List of found patterns with locations
    """
    from .analysis.pattern import count_motifs_3node, compute_motif_significance, find_proof_patterns

    G = _get_or_build_graph(path)
    response_data = {}

    if include_motifs:
        motif_counts = count_motifs_3node(G)
        if "error" not in motif_counts:
            significance = compute_motif_significance(G, n_random=sample_size)
            response_data["motifs"] = {
                "counts": motif_counts,
                "significance": significance.get("3_node", {}),
            }
        else:
            response_data["motifs"] = motif_counts

    if include_proof_patterns:
        proof_patterns = find_proof_patterns(G)
        response_data["proofPatterns"] = proof_patterns

    return {
        "status": "ok",
        "analysis": "patterns",
        "numNodes": G.number_of_nodes(),
        "numEdges": G.number_of_edges(),
        "data": response_data,
    }


@app.get("/api/project/analysis/embedding-clusters")
async def get_embedding_clusters(
    path: str = Query(..., description="Project path"),
    n_clusters: int = Query(8, description="Number of clusters"),
):
    """
    Compute embedding-based node clusters. (P2)

    Uses spectral embedding + k-means to cluster nodes.

    Returns:
        - clusters: Dict mapping node_id to cluster_id
        - clusterSizes: Size of each cluster
    """
    from .analysis.embedding import compute_spectral_embedding
    from sklearn.cluster import KMeans
    import numpy as np

    G = _get_or_build_graph(path)

    # Get spectral embedding
    embedding_result = compute_spectral_embedding(G, n_components=min(10, G.number_of_nodes() - 1))

    if "error" in embedding_result:
        return {
            "status": "error",
            "analysis": "embedding-clusters",
            "error": embedding_result["error"],
        }

    # Extract embeddings
    embedding = embedding_result.get("embedding", {})
    if not embedding:
        return {
            "status": "error",
            "analysis": "embedding-clusters",
            "error": "No embedding computed",
        }

    nodes = list(embedding.keys())
    X = np.array([embedding[n] for n in nodes])

    # K-means clustering
    n_clusters = min(n_clusters, len(nodes))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X)

    # Build result
    clusters = {nodes[i]: int(labels[i]) for i in range(len(nodes))}
    cluster_sizes = {}
    for label in labels:
        cluster_sizes[int(label)] = cluster_sizes.get(int(label), 0) + 1

    return {
        "status": "ok",
        "analysis": "embedding-clusters",
        "numNodes": G.number_of_nodes(),
        "data": {
            "clusters": clusters,
            "numClusters": n_clusters,
            "clusterSizes": cluster_sizes,
        },
    }


@app.get("/api/project/analysis/motif-participation")
async def get_motif_participation(
    path: str = Query(..., description="Project path"),
    max_instances: int = Query(500, description="Max pattern instances to find"),
):
    """
    Compute motif participation for each node. (P2)

    Identifies which patterns each node participates in.

    Returns:
        - nodeMotifs: Dict mapping node_id to {pattern_type: count}
        - dominantMotif: Dict mapping node_id to most common motif type
    """
    from .analysis.pattern import find_pattern_instances

    G = _get_or_build_graph(path)

    # Find instances of each pattern
    patterns = ["chain", "fork", "join", "diamond"]
    node_participation = {n: {} for n in G.nodes()}

    for pattern in patterns:
        instances = find_pattern_instances(G, pattern, max_instances=max_instances)
        for instance in instances:
            for node in instance.get("nodes", []):
                if node in node_participation:
                    node_participation[node][pattern] = node_participation[node].get(pattern, 0) + 1

    # Compute dominant motif for each node
    dominant_motif = {}
    for node, counts in node_participation.items():
        if counts:
            dominant_motif[node] = max(counts, key=counts.get)
        else:
            dominant_motif[node] = "none"

    return {
        "status": "ok",
        "analysis": "motif-participation",
        "numNodes": G.number_of_nodes(),
        "data": {
            "nodeMotifs": node_participation,
            "dominantMotif": dominant_motif,
        },
    }


# ============================================
# Lean-Specific Analysis Endpoints
# ============================================

@app.get("/api/project/analysis/metrics/all")
async def get_all_metrics(
    path: str = Query(..., description="Project path"),
):
    """
    Get aggregated metrics for all nodes in a single request.

    This endpoint combines multiple analysis results to minimize frontend requests.
    Returns per-node metrics and global statistics.

    Returns:
        - nodeMetrics: Dict mapping node_id to metric values
          - pagerank, betweenness, depth, bottleneck, reachability, clustering
        - globalStats: Graph-wide statistics
          - graphDepth, modularity, vonNeumannEntropy, density, etc.
        - kindDistribution: Declaration kind counts (Lean-specific)
    """
    from .analysis import (
        compute_pagerank,
        compute_betweenness_centrality,
        compute_clustering_coefficients,
        compute_von_neumann_entropy,
        detect_communities_louvain,
    )
    from .analysis.dag import analyze_dag
    from .analysis.lean_types import declaration_kind_distribution

    G = _get_or_build_graph(path)
    nodes = list(project.nodes.values())
    num_nodes = G.number_of_nodes()
    num_edges = G.number_of_edges()

    # Initialize node metrics dict
    node_metrics: dict[str, dict] = {n: {} for n in G.nodes()}

    # 1. PageRank (always include all values)
    pagerank_result = compute_pagerank(G, top_k=10)
    for node_id, value in pagerank_result.values.items():
        if node_id in node_metrics:
            node_metrics[node_id]["pagerank"] = value

    # 2. Betweenness (sample-based for large graphs)
    sample_k = min(1000, num_nodes) if num_nodes > 100 else None
    betweenness_result = compute_betweenness_centrality(G, k=sample_k, top_k=10)
    for node_id, value in betweenness_result.values.items():
        if node_id in node_metrics:
            node_metrics[node_id]["betweenness"] = value

    # 3. Clustering coefficients
    clustering_result = compute_clustering_coefficients(G)
    for node_id, value in clustering_result.local.items():
        if node_id in node_metrics:
            node_metrics[node_id]["clustering"] = value

    # 4. DAG analysis (depth, bottleneck, reachability)
    dag_result = analyze_dag(G)
    if dag_result.get("is_dag", False):
        depths = dag_result.get("depths", {})
        bottlenecks = dag_result.get("bottleneck_scores", {})
        reachability = dag_result.get("reachability", {})

        for node_id in node_metrics:
            node_metrics[node_id]["depth"] = depths.get(node_id, 0)
            node_metrics[node_id]["bottleneck"] = bottlenecks.get(node_id, 0)
            node_metrics[node_id]["reachability"] = reachability.get(node_id, 0)

    # 5. In-degree (for size mapping)
    for node_id in node_metrics:
        node_metrics[node_id]["indegree"] = G.in_degree(node_id)

    # 6. Katz centrality (P2)
    try:
        from .analysis.structural import compute_katz_centrality
        katz = compute_katz_centrality(G, alpha=0.05)  # Lower alpha for better convergence
        if katz:
            for node_id, value in katz.items():
                if node_id in node_metrics:
                    node_metrics[node_id]["katz"] = value
    except Exception as e:
        import logging
        logging.warning(f"Katz centrality failed: {e}")

    # 7. HITS (hub and authority scores) (P2)
    try:
        from .analysis.structural import compute_hits
        hubs, authorities = compute_hits(G)
        if hubs:
            for node_id, value in hubs.items():
                if node_id in node_metrics:
                    node_metrics[node_id]["hub"] = value
        if authorities:
            for node_id, value in authorities.items():
                if node_id in node_metrics:
                    node_metrics[node_id]["authority"] = value
    except Exception as e:
        import logging
        logging.warning(f"HITS failed: {e}")

    # Global statistics
    global_stats = {
        "numNodes": num_nodes,
        "numEdges": num_edges,
        "density": nx.density(G) if num_nodes > 1 else 0,
    }

    # DAG-specific global stats
    if dag_result.get("is_dag", False):
        global_stats["graphDepth"] = dag_result.get("graph_depth", 0)
        global_stats["numLayers"] = dag_result.get("num_layers", 0)
        global_stats["numSources"] = dag_result.get("num_sources", 0)
        global_stats["numSinks"] = dag_result.get("num_sinks", 0)

    # Community detection for modularity
    try:
        community_result = detect_communities_louvain(G.to_undirected())
        global_stats["modularity"] = community_result.modularity
        global_stats["numCommunities"] = community_result.num_communities
    except Exception:
        global_stats["modularity"] = 0
        global_stats["numCommunities"] = 0

    # Von Neumann entropy
    try:
        entropy_result = compute_von_neumann_entropy(G)
        global_stats["vonNeumannEntropy"] = entropy_result.get("entropy", 0)
    except Exception:
        global_stats["vonNeumannEntropy"] = 0

    # Lean-specific: Declaration kind distribution
    kind_distribution = {}
    try:
        kind_dist = declaration_kind_distribution(nodes)
        kind_distribution = kind_dist.get("counts", {})
        global_stats["totalDeclarations"] = kind_dist.get("total", num_nodes)
    except Exception:
        pass

    return {
        "status": "ok",
        "analysis": "metrics_all",
        "numNodes": num_nodes,
        "numEdges": num_edges,
        "data": {
            "nodeMetrics": node_metrics,
            "globalStats": global_stats,
            "kindDistribution": kind_distribution,
        },
    }


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
            confidence=request.confidence,
            statement=request.statement,
            proof=request.proof,
            intuition=request.intuition,
            notes=request.notes,
            tags=request.tags,
            scope=request.scope,
            source=request.source,
            style=request.style,
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
