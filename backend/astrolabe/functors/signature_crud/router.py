"""
Signature CRUD Router — obj and mor CRUD endpoints.

Extracted from server.py.
"""
from typing import Optional, Callable

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..math_domain import apply_obj_defaults, apply_mor_defaults, validate_obj
from ..timestamp import on_create as timestamp_on_create, on_update as timestamp_on_update

router = APIRouter()

# Dependency injection: set by server.py at startup
_get_signature_store: Callable = None


def set_store_getter(fn: Callable):
    global _get_signature_store
    _get_signature_store = fn


# ── Pydantic Models ──

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


# ── Signature endpoints ──

@router.get("/api/signature")
async def get_signature(path: str = Query(..., description="Project path")):
    """Get the full signature (all objects and morphisms)."""
    store = _get_signature_store(path)
    return store.get_graph()


@router.post("/api/signature/obj")
async def create_obj(request: ObjRequest):
    """Create an obj. Flow: storage generates id -> functors apply defaults -> user fields override."""
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

        # Functor pipeline: defaults -> timestamps -> user override
        apply_obj_defaults(obj)
        timestamp_on_create(obj)
        obj.update(info)
        validate_obj(obj)

        # Persist with functor-enriched fields
        store.update_obj(obj["id"], **{k: v for k, v in obj.items() if k != "id"})
        return {"status": "ok", "obj": obj}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/signature/obj/{obj_id}")
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


@router.get("/api/signature/obj")
async def get_all_objs(path: str = Query(..., description="Project path")):
    """Get all objs."""
    store = _get_signature_store(path)
    return store.get_all_objs()


@router.patch("/api/signature/obj/{obj_id}")
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


@router.delete("/api/signature/obj/{obj_id}")
async def delete_obj(
    obj_id: str,
    path: str = Query(..., description="Project path"),
):
    """Delete an obj (cascades to connected morphisms)."""
    store = _get_signature_store(path)
    if not store.delete_obj(obj_id):
        raise HTTPException(status_code=404, detail=f"Obj not found: {obj_id}")
    return {"status": "ok", "objId": obj_id}


@router.post("/api/signature/mor")
async def create_mor(request: MorRequest):
    """Create a mor. Flow: storage generates id with source/target -> functors apply defaults -> user fields override."""
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

        # Functor pipeline: defaults -> timestamps -> user override
        apply_mor_defaults(mor)
        timestamp_on_create(mor)
        mor.update(info)

        store.update_mor(mor["id"], **{k: v for k, v in mor.items() if k not in ("id", "source", "target")})
        return {"status": "ok", "mor": mor}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/signature/mor/{mor_id}")
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


@router.get("/api/signature/mor")
async def get_all_mors(path: str = Query(..., description="Project path")):
    """Get all mors."""
    store = _get_signature_store(path)
    return store.get_all_mors()


@router.patch("/api/signature/mor/{mor_id}")
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


@router.delete("/api/signature/mor/{mor_id}")
async def delete_mor(
    mor_id: str,
    path: str = Query(..., description="Project path"),
):
    """Delete a mor."""
    store = _get_signature_store(path)
    if not store.delete_mor(mor_id):
        raise HTTPException(status_code=404, detail=f"Mor not found: {mor_id}")
    return {"status": "ok", "morId": mor_id}
