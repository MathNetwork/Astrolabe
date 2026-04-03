"""
Astrolabe Router — API routes for astrolabe.json.

Mounted at /api/astrolabe in server.py.
All endpoints take ?path= query param for project directory.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from .storage import AstrolabeStorage

router = APIRouter()

# ── Storage cache (per project path) ──
_stores: dict[str, AstrolabeStorage] = {}


def _get_store(path: str) -> AstrolabeStorage:
    if path not in _stores:
        _stores[path] = AstrolabeStorage(path)
    return _stores[path]


# ── Pydantic models ──

class CreateEntryRequest(BaseModel):
    ref: list[str]
    record: str
    hash_id: str | None = None


class UpdateRecordRequest(BaseModel):
    record: str


# ── Routes ──

@router.get("/entries")
def get_entries(path: str = Query(...), degree: int | None = None):
    entries = _get_store(path).all_entries()
    if degree is not None:
        entries = {h: e for h, e in entries.items() if len(e["ref"]) - 1 == degree}
    return entries


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
def update_entry_record(hash_id: str, body: UpdateRecordRequest, path: str = Query(...)):
    store = _get_store(path)
    result = store.update_record(hash_id, body.record)
    if result is None:
        raise HTTPException(status_code=404, detail="Not found")
    new_hash, entry = result
    return {"id": new_hash, "entry": entry}


@router.get("/stages")
def get_stages(path: str = Query(...)):
    return _get_store(path).stages()


@router.get("/profile/{hash_id}")
def get_profile(hash_id: str, path: str = Query(...)):
    store = _get_store(path)
    if store.get(hash_id) is None:
        raise HTTPException(status_code=404, detail="Not found")
    return store.profile(hash_id)


@router.get("/mtime")
def get_mtime(path: str = Query(...)):
    """Return the mtime of astrolabe.json for file-watcher polling."""
    return {"mtime": _get_store(path)._get_mtime()}


@router.get("/lean_mtime")
def get_lean_mtime(path: str = Query(...)):
    """Return the latest mtime of .lean files in the project's lean directory."""
    import os
    from pathlib import Path

    root = Path(path).resolve()
    # Search for lean project: root or one level of subdirectories
    lean_root = None
    for candidate in [root] + [d for d in root.iterdir() if d.is_dir() and not d.name.startswith('.')]:
        if (candidate / "lakefile.lean").exists() or (candidate / "lakefile.toml").exists():
            lean_root = candidate
            break
    if lean_root is None:
        return {"mtime": None}

    latest = 0.0
    for f in lean_root.rglob("*.lean"):
        if ".lake" in f.parts:
            continue
        try:
            mt = f.stat().st_mtime
            if mt > latest:
                latest = mt
        except OSError:
            continue

    return {"mtime": latest if latest > 0 else None}


@router.get("/ref-graph")
def get_ref_graph(path: str = Query(...)):
    return _get_store(path).to_ref_graph()
