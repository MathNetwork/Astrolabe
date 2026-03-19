"""
Lean ilean import plugin — FastAPI router.

POST /api/plugins/lean/import — parse Lean project, return obj/mor proposals.
"""
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

from .ilean_parser import parse_lean_project

router = APIRouter()


class ImportRequest(BaseModel):
    path: str


@router.post("/import")
async def import_lean(req: ImportRequest):
    """Parse Lean project and return obj/mor proposals."""
    project_root = Path(req.path)
    if not project_root.exists():
        return {"objects": [], "morphisms": [], "error": "Project path does not exist"}

    result = parse_lean_project(project_root)
    return result
