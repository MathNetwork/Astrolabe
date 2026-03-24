"""
Astrolabe Router — API routes for astrolabe.json format.

Mounted at /api/astrolabe in server.py.
All endpoints take ?path= query param for project directory.
Auto-migrates signature.json → astrolabe.json if needed.
"""
from pathlib import Path
from typing import Callable

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from .storage import AstrolabeStorage
from .migrate import migrate_signature
from .format import validate_astrolabe

import json

router = APIRouter()

# ── Storage cache (per project path) ──
_stores: dict[str, AstrolabeStorage] = {}


def _get_store(path: str) -> AstrolabeStorage:
    """Get or create AstrolabeStorage, auto-migrating from signature.json if needed."""
    if path not in _stores:
        project = Path(path)
        astrolabe_path = project / ".astrolabe" / "astrolabe.json"
        signature_path = project / ".astrolabe" / "signature.json"

        # Auto-migrate if only signature.json exists
        if not astrolabe_path.exists() and signature_path.exists():
            sig_data = json.loads(signature_path.read_text(encoding="utf-8"))
            # Handle old schema (nodes/edges → obj/mor)
            if "nodes" in sig_data and "obj" not in sig_data:
                sig_data["obj"] = sig_data.pop("nodes")
            if "edges" in sig_data and "mor" not in sig_data:
                sig_data["mor"] = sig_data.pop("edges")
            astrolabe_data = migrate_signature(sig_data)
            astrolabe_path.parent.mkdir(parents=True, exist_ok=True)
            astrolabe_path.write_text(
                json.dumps(astrolabe_data, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )

        _stores[path] = AstrolabeStorage(path)
    return _stores[path]


# ── Pydantic models ──

class CreateEntryRequest(BaseModel):
    ref: list[str]
    record: dict
    hash_id: str | None = None


# ── Routes ──

@router.get("/entries")
def get_entries(path: str = Query(...)):
    return _get_store(path).all_entries()


@router.get("/entries/{hash_id}")
def get_entry(hash_id: str, path: str = Query(...)):
    entry = _get_store(path).get(hash_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Not found")
    return entry


@router.post("/entries", status_code=201)
def create_entry(body: CreateEntryRequest, path: str = Query(...)):
    store = _get_store(path)
    try:
        hash_id, entry = store.create_entry(
            ref=body.ref, record=body.record, hash_id=body.hash_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"id": hash_id, "entry": entry}


@router.delete("/entries/{hash_id}")
def delete_entry(hash_id: str, path: str = Query(...)):
    store = _get_store(path)
    if store.get(hash_id) is None:
        raise HTTPException(status_code=404, detail="Not found")
    store.delete_cascade(hash_id)
    return {"deleted": hash_id}


@router.patch("/entries/{hash_id}")
def update_entry_record(hash_id: str, body: dict, path: str = Query(...)):
    store = _get_store(path)
    result = store.update_record(hash_id, body)
    if result is None:
        raise HTTPException(status_code=404, detail="Not found")
    new_hash, entry = result
    return {"id": new_hash, "entry": entry}


@router.get("/atoms")
def get_atoms(path: str = Query(...)):
    return _get_store(path).atoms()


@router.get("/k-forms/{k}")
def get_k_forms(k: int, path: str = Query(...)):
    return _get_store(path).k_forms(k)


@router.get("/stages")
def get_stages(path: str = Query(...)):
    return _get_store(path).stages()


@router.get("/profile/{hash_id}")
def get_profile(hash_id: str, path: str = Query(...)):
    store = _get_store(path)
    if store.get(hash_id) is None:
        raise HTTPException(status_code=404, detail="Not found")
    return store.profile(hash_id)


@router.get("/graph")
def get_graph(path: str = Query(...)):
    nodes, edges = _get_store(path).to_graph()
    return {"nodes": nodes, "edges": edges}


@router.get("/ref-graph")
def get_ref_graph(path: str = Query(...)):
    return _get_store(path).to_ref_graph()
