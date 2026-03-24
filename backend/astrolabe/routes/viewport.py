"""
Viewport Router — canvas viewport state persistence.

Extracted from server.py.
"""
from typing import Optional
from pathlib import Path
import json

from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter()


# ── Helpers ──

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


# ── Pydantic Models ──

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


# ── Routes ──

@router.get("/api/canvas/viewport")
async def get_viewport(path: str = Query(..., description="Project path")):
    """Get viewport state (camera position, selected obj/mor, etc.)"""
    meta = _load_meta(path)
    return meta.get("viewport", {})


@router.patch("/api/canvas/viewport")
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
