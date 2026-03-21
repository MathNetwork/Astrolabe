"""
Astrolabe API Server

FastAPI server providing:
- Signature CRUD API
- Canvas/viewport state persistence
- File reading for Monaco editor
- Project status/creation
"""

from typing import Optional
from contextlib import asynccontextmanager
from pathlib import Path
import json

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .signature_storage import SignatureStorage
from .functors import scan_functors, register_builtin_functors, BUILTIN_FUNCTORS
from .functors.network_analysis.router import router as analysis_router, set_signature_store_getter
from .functors.math_domain import apply_obj_defaults, apply_mor_defaults, validate_obj
from .functors.timestamp import on_create as timestamp_on_create, on_update as timestamp_on_update


# ============================================
# Project templates
# ============================================

_NETWORK_MDX_TEMPLATE = """\
# Astrolabe Category

Welcome to your Astrolabe category.

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

Edit this file at `.astrolabe/network.mdx` to document your astrolabe category.
"""

_DOCS_INDEX_TEMPLATE = """\
# Welcome to your astrolabe category

Start by creating objects in the **NETWORK** view, then write your mathematical narrative here.

Use `<ObjRef id="obj-hash" />` to reference objects from your network.

Math works: $E = mc^2$

$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$
"""

_README_TEMPLATE = """\
# {name}

A math astrolabe category built with [Astrolabe](https://github.com/MathNetwork/Astrolabe).

## Getting Started

1. Open this folder in Astrolabe
2. Switch to the **NETWORK** tab to visualize the signature
3. Double-click to create objects, click to inspect them
4. Edit `.astrolabe/network.mdx` to write documentation

## Structure

- `.astrolabe/signature.json` — objects and morphisms
- `.astrolabe/meta.json` — viewport state
- `.astrolabe/network.mdx` — documentation (READ tab)
"""

# ============================================
# Storage helpers
# ============================================

_signature_stores: dict[str, SignatureStorage] = {}
_loaded_functors: dict[str, list] = {}  # project_path → list of AstrolabeFunctor


def _get_signature_store(path: str) -> SignatureStorage:
    """Get or create a SignatureStorage for the given project path."""
    if path not in _signature_stores:
        _signature_stores[path] = SignatureStorage(Path(path))
    return _signature_stores[path]


def _meta_path(project_path: str) -> Path:
    """Return the .astrolabe/meta.json path for a project."""
    return Path(project_path) / ".astrolabe" / "meta.json"


def _load_meta(project_path: str) -> dict:
    """Load .astrolabe/meta.json, returning default structure if missing."""
    mp = _meta_path(project_path)
    if mp.exists():
        try:
            return json.loads(mp.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, IOError):
            pass
    return {"viewport": {}}


def _save_meta(project_path: str, data: dict):
    """Save data to .astrolabe/meta.json."""
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
    title="Astrolabe API",
    description="Signature Visualization Tool",
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

# Register analysis router and inject signature store getter
set_signature_store_getter(lambda path: _get_signature_store(path))
app.include_router(analysis_router)

# Register built-in functors
register_builtin_functors(app)


# ============================================
# Pydantic Models
# ============================================




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
    selected_obj_id: Optional[str] = None
    selected_mor_id: Optional[str] = None
    filter_options: Optional[FilterOptionsData] = None
    ui_preferences: Optional[dict] = None


# Signature Models — field-agnostic

class ObjRequest(BaseModel):
    """Create obj request. Accepts arbitrary info fields."""
    model_config = {"extra": "allow"}
    path: str
    obj_id: Optional[str] = None


class ObjUpdateRequest(BaseModel):
    """Update obj request. Accepts arbitrary info fields."""
    model_config = {"extra": "allow"}
    path: str


class MorRequest(BaseModel):
    """Create mor request. source and target are structural, rest is info."""
    model_config = {"extra": "allow"}
    path: str
    source: str
    target: str
    mor_id: Optional[str] = None


class MorUpdateRequest(BaseModel):
    """Update mor request. Accepts arbitrary info fields."""
    model_config = {"extra": "allow"}
    path: str


# ============================================
# Health & Project endpoints
# ============================================


def _load_functors_for_project(path: str):
    """Load functors for a project path (idempotent). Includes built-in + scanned."""
    if path in _loaded_functors:
        return _loaded_functors[path]
    scanned = scan_functors(Path(path))
    # Mount scanned functor routers
    for functor in scanned:
        if functor.router:
            prefix = f"/api/functors/{functor.name}"
            app.include_router(functor.router, prefix=prefix)
    functors = list(BUILTIN_FUNCTORS) + scanned
    _loaded_functors[path] = functors
    return functors


@app.get("/api/functors/list")
async def list_functors(path: str = Query(..., description="Project path")):
    """List loaded functors and their skills."""
    functors = _load_functors_for_project(path)
    return [
        {
            "name": p.name,
            "version": p.version,
            "description": p.description,
            "signature": p.signature,
            "author": p.author,
            "updated_at": p.updated_at,
            "icon": p.icon,
            "skills": p.skills,
            "analysis_endpoints": [
                {**ep, "url": ep["path"]}
                for ep in p.analysis_endpoints
            ],
        }
        for p in functors
    ]


@app.get("/api/health")
async def health():
    """Health check"""
    return {"status": "ok", "version": "0.2.0"}


@app.get("/api/project/status")
async def check_project_status(path: str = Query(..., description="Project path")):
    """
    Check project status.

    Returns whether the path exists and whether .astrolabe/ is set up.
    Auto-creates .astrolabe/ if the directory exists but .astrolabe/ does not.
    """
    project_path = Path(path)

    if not project_path.exists():
        return {
            "exists": False,
            "hasNetmath": False,
            "isSignatureProject": False,
            "message": "Directory does not exist",
        }

    astrolabe_dir = project_path / ".astrolabe"

    # Auto-create .astrolabe/ if it doesn't exist (requirement: open any folder → auto-init)
    if not astrolabe_dir.exists():
        astrolabe_dir.mkdir(exist_ok=True)
        # Initialize empty signature.json
        signature_file = astrolabe_dir / "signature.json"
        signature_file.write_text(
            json.dumps({"obj": {}, "mor": {}}, indent=2),
            encoding="utf-8",
        )
        # Initialize meta.json
        meta_file = astrolabe_dir / "meta.json"
        meta_file.write_text(
            json.dumps({"viewport": {}}, indent=2),
            encoding="utf-8",
        )
        # Initialize network.mdx template
        mdx_file = astrolabe_dir / "network.mdx"
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
    docs_dir = astrolabe_dir / "docs"
    if not docs_dir.exists():
        docs_dir.mkdir(exist_ok=True)
        index_file = docs_dir / "index.mdx"
        index_file.write_text(_DOCS_INDEX_TEMPLATE, encoding="utf-8")

    return {
        "exists": True,
        "isSignatureProject": True,
        "message": "Ready.",
    }


@app.post("/api/project/create")
async def create_project(data: dict):
    """
    Create a new empty signature project.
    Creates .astrolabe/ directory with signature.json.
    """
    path = data.get("path")
    if not path:
        raise HTTPException(status_code=400, detail="Missing 'path'")

    project_path = Path(path)
    if not project_path.exists():
        raise HTTPException(status_code=400, detail="Directory does not exist")

    astrolabe_dir = project_path / ".astrolabe"
    astrolabe_dir.mkdir(exist_ok=True)

    # Initialize empty signature.json
    signature_file = astrolabe_dir / "signature.json"
    if not signature_file.exists():
        signature_file.write_text(
            json.dumps({"obj": {}, "mor": {}}, indent=2),
            encoding="utf-8",
        )

    # Initialize meta.json
    meta_file = astrolabe_dir / "meta.json"
    if not meta_file.exists():
        meta_file.write_text(
            json.dumps({"viewport": {}}, indent=2),
            encoding="utf-8",
        )

    # Initialize network.mdx template
    mdx_file = astrolabe_dir / "network.mdx"
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
    docs_dir = astrolabe_dir / "docs"
    if not docs_dir.exists():
        docs_dir.mkdir(exist_ok=True)
        index_file = docs_dir / "index.mdx"
        index_file.write_text(_DOCS_INDEX_TEMPLATE, encoding="utf-8")

    return {"status": "ok", "path": path, "type": "signature"}


@app.post("/api/reset")
async def reset_project(path: str = Query(..., description="Project path")):
    """
    Reset all project data.
    Deletes the entire .astrolabe directory.
    """
    import shutil

    project_path = Path(path)
    astrolabe_dir = project_path / ".astrolabe"

    # Clear in-memory caches
    if path in _signature_stores:
        del _signature_stores[path]

    if astrolabe_dir.exists():
        shutil.rmtree(astrolabe_dir)

    return {"status": "ok"}


# ============================================
# Project Files API
# ============================================


def _scan_directory(dir_path: Path) -> list[dict]:
    """Recursively scan a directory and return tree structure."""
    entries = []
    try:
        for item in sorted(dir_path.iterdir(), key=lambda p: (p.is_file(), p.name)):
            if item.name.startswith('.'):
                continue
            if item.is_dir():
                entries.append({
                    "name": item.name,
                    "type": "directory",
                    "path": str(item),
                    "children": _scan_directory(item),
                })
            else:
                entries.append({
                    "name": item.name,
                    "type": "file",
                    "path": str(item),
                    "size": item.stat().st_size,
                })
    except PermissionError:
        pass
    return entries


@app.get("/api/project/files")
async def get_project_files(path: str = Query(..., description="Project path")):
    """Get .astrolabe/ directory tree structure."""
    astrolabe_dir = Path(path) / ".astrolabe"
    if not astrolabe_dir.exists():
        return []
    return _scan_directory(astrolabe_dir)


@app.get("/api/project/file-content")
async def get_file_content(
    path: str = Query(..., description="Project path"),
    file: str = Query(..., description="Relative file path within .astrolabe/"),
):
    """Read a file's text content from .astrolabe/ directory."""
    astrolabe_dir = Path(path) / ".astrolabe"
    file_path = (astrolabe_dir / file).resolve()
    # Prevent path traversal
    if not str(file_path).startswith(str(astrolabe_dir.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to read file")
    return {"content": content, "name": file_path.name, "path": str(file_path)}


# ============================================
# Docs API
# ============================================


@app.get("/api/docs/list")
async def list_docs(path: str = Query(..., description="Project path")):
    """List MDX files in .astrolabe/docs/ directory."""
    docs_dir = Path(path) / ".astrolabe" / "docs"
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
# Viewport API (stores in .astrolabe/meta.json)
# ============================================


@app.get("/api/canvas/viewport")
async def get_viewport(path: str = Query(..., description="Project path")):
    """Get viewport state (camera position, selected obj/mor, etc.)"""
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
    if request.selected_obj_id is not None:
        viewport["selected_obj_id"] = request.selected_obj_id
    if request.selected_mor_id is not None:
        viewport["selected_mor_id"] = request.selected_mor_id if request.selected_mor_id else None
    if request.filter_options is not None:
        viewport["filter_options"] = request.filter_options.model_dump()
    if request.ui_preferences is not None:
        existing = viewport.get("ui_preferences", {})
        existing.update(request.ui_preferences)
        viewport["ui_preferences"] = existing

    _save_meta(request.path, meta)
    return {"status": "ok", "viewport": viewport}


# ============================================
# Signature API
# ============================================


@app.get("/api/signature")
async def get_signature(path: str = Query(..., description="Project path")):
    """Get the full signature (all objects and morphisms)."""
    store = _get_signature_store(path)
    return store.get_graph()


@app.post("/api/signature/obj")
async def create_obj(request: ObjRequest):
    """Create an obj. Flow: storage generates id → functors apply defaults → user fields override."""
    store = _get_signature_store(request.path)
    try:
        # Extract info fields (everything except path, obj_id)
        info = {k: v for k, v in request.model_dump(exclude_none=True).items()
                if k not in ("path", "obj_id")}
        # Legacy: accept kind as sort
        if "kind" in info and "sort" not in info:
            info["sort"] = info.pop("kind")
        elif "kind" in info:
            info.pop("kind")

        # Generate id, store empty record
        oid = request.obj_id
        obj = store.create_obj(obj_id=oid)

        # Functor pipeline: defaults → timestamps → user override
        apply_obj_defaults(obj)
        timestamp_on_create(obj)
        obj.update(info)
        validate_obj(obj)

        # Persist with functor-enriched fields
        store.update_obj(obj["id"], **{k: v for k, v in obj.items() if k != "id"})
        return {"status": "ok", "obj": obj}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/signature/obj/{obj_id}")
async def get_obj(
    obj_id: str,
    path: str = Query(..., description="Project path"),
):
    """Get a single obj."""
    store = _get_signature_store(path)
    obj = store.get_obj(obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"Obj not found: {obj_id}")
    return obj



@app.get("/api/signature/obj")
async def get_all_objs(path: str = Query(..., description="Project path")):
    """Get all objs."""
    store = _get_signature_store(path)
    return store.get_all_objs()


@app.patch("/api/signature/obj/{obj_id}")
async def update_obj(
    obj_id: str,
    request: ObjUpdateRequest,
):
    """Update an obj. Applies timestamp functor then merges user fields."""
    store = _get_signature_store(request.path)
    try:
        updates = {k: v for k, v in request.model_dump(exclude_none=True).items()
                   if k != "path"}
        # Legacy: accept kind as sort
        if "kind" in updates and "sort" not in updates:
            updates["sort"] = updates.pop("kind")
        elif "kind" in updates:
            updates.pop("kind")

        obj = store.get_obj(obj_id)
        if not obj:
            raise HTTPException(status_code=404, detail=f"Obj not found: {obj_id}")

        # Validate before applying
        preview = {**obj, **updates}
        validate_obj(preview)

        # Timestamp functor
        timestamp_on_update(updates)
        obj = store.update_obj(obj_id, **updates)
        return {"status": "ok", "obj": obj}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/signature/obj/{obj_id}")
async def delete_obj(
    obj_id: str,
    path: str = Query(..., description="Project path"),
):
    """Delete an obj (cascades to connected morphisms)."""
    store = _get_signature_store(path)
    if not store.delete_obj(obj_id):
        raise HTTPException(status_code=404, detail=f"Obj not found: {obj_id}")
    return {"status": "ok", "objId": obj_id}


@app.post("/api/signature/mor")
async def create_mor(request: MorRequest):
    """Create a mor. Flow: storage generates id with source/target → functors apply defaults → user fields override."""
    store = _get_signature_store(request.path)
    try:
        # Extract info fields (everything except path, source, target, mor_id)
        info = {k: v for k, v in request.model_dump(exclude_none=True).items()
                if k not in ("path", "source", "target", "mor_id")}
        # Legacy: accept relation as sort
        if "relation" in info and "sort" not in info:
            info["sort"] = info.pop("relation")
        elif "relation" in info:
            info.pop("relation")

        mid = request.mor_id
        mor = store.create_mor(source=request.source, target=request.target, mor_id=mid)

        # Functor pipeline: defaults → timestamps → user override
        apply_mor_defaults(mor)
        timestamp_on_create(mor)
        mor.update(info)

        store.update_mor(mor["id"], **{k: v for k, v in mor.items() if k not in ("id", "source", "target")})
        return {"status": "ok", "mor": mor}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/signature/mor/{mor_id}")
async def get_mor(
    mor_id: str,
    path: str = Query(..., description="Project path"),
):
    """Get a single mor."""
    store = _get_signature_store(path)
    mor = store.get_mor(mor_id)
    if not mor:
        raise HTTPException(status_code=404, detail=f"Mor not found: {mor_id}")
    return mor


@app.get("/api/signature/mor")
async def get_all_mors(path: str = Query(..., description="Project path")):
    """Get all mors."""
    store = _get_signature_store(path)
    return store.get_all_mors()


@app.patch("/api/signature/mor/{mor_id}")
async def update_mor(
    mor_id: str,
    request: MorUpdateRequest,
):
    """Update a mor. Applies timestamp functor then merges user fields."""
    store = _get_signature_store(request.path)
    try:
        updates = {k: v for k, v in request.model_dump(exclude_none=True).items()
                   if k != "path"}
        # Legacy: accept relation as sort
        if "relation" in updates and "sort" not in updates:
            updates["sort"] = updates.pop("relation")
        elif "relation" in updates:
            updates.pop("relation")

        timestamp_on_update(updates)
        mor = store.update_mor(mor_id, **updates)
        if not mor:
            raise HTTPException(status_code=404, detail=f"Mor not found: {mor_id}")
        return {"status": "ok", "mor": mor}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/signature/mor/{mor_id}")
async def delete_mor(
    mor_id: str,
    path: str = Query(..., description="Project path"),
):
    """Delete a mor."""
    store = _get_signature_store(path)
    if not store.delete_mor(mor_id):
        raise HTTPException(status_code=404, detail=f"Mor not found: {mor_id}")
    return {"status": "ok", "morId": mor_id}


# ============================================
# Main Entry Point
# ============================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8765)
