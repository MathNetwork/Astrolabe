"""
ilean parser functor — FastAPI router.

POST /api/functors/lean/import — parse Lean project, return obj/mor proposals.
Each proposal is tagged with _status: "new" or "existing".
"""
import json
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

from .import_functor import parse_lean_project

router = APIRouter()


class ImportRequest(BaseModel):
    path: str


@router.post("/import")
async def import_lean(req: ImportRequest):
    """Parse Lean project and return obj/mor proposals with dedup status."""
    project_root = Path(req.path)
    if not project_root.exists():
        return {"objects": [], "morphisms": [], "error": "Project path does not exist"}

    result = parse_lean_project(project_root)

    # Check existing objects in signature.json
    signature_path = project_root / ".astrolabe" / "signature.json"
    existing_obj_ids = set()
    existing_mor_ids = set()
    if signature_path.exists():
        try:
            data = json.loads(signature_path.read_text(encoding="utf-8"))
            existing_obj_ids = set(data.get("obj", {}).keys())
            existing_mor_ids = set(data.get("mor", {}).keys())
        except (json.JSONDecodeError, IOError):
            pass

    # Tag each proposal
    for obj in result["objects"]:
        obj["_status"] = "existing" if obj["id"] in existing_obj_ids else "new"
    for mor in result["morphisms"]:
        mor["_status"] = "existing" if mor["id"] in existing_mor_ids else "new"

    return result
