"""
Astrolabe API — FastAPI routes for astrolabe.json.
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .storage import AstrolabeStorage


class CreateEntry(BaseModel):
    hash_id: str
    ref: list[str]
    record: str


def create_app(project_dir: str) -> FastAPI:
    app = FastAPI(title="Astrolabe API")
    store = AstrolabeStorage(project_dir)

    def _entry_to_dict(entry) -> dict:
        return {"ref": list(entry.ref), "record": entry.record}

    @app.get("/api/entries")
    def get_entries(degree: int | None = None):
        entries = store.all_entries()
        if degree is not None:
            entries = {h: e for h, e in entries.items() if e.degree == degree}
        return {h: _entry_to_dict(e) for h, e in entries.items()}

    @app.get("/api/entries/{hash_id}")
    def get_entry(hash_id: str):
        entry = store.get(hash_id)
        if entry is None:
            raise HTTPException(status_code=404, detail="Not found")
        return _entry_to_dict(entry)

    @app.post("/api/entries", status_code=201)
    def create_entry(body: CreateEntry):
        store.put(body.hash_id, body.ref, body.record)
        entry = store.get(body.hash_id)
        return _entry_to_dict(entry)

    @app.delete("/api/entries/{hash_id}")
    def delete_entry(hash_id: str):
        if store.get(hash_id) is None:
            raise HTTPException(status_code=404, detail="Not found")
        store.delete(hash_id)
        return {"deleted": hash_id}

    @app.get("/api/stages")
    def get_stages():
        return store.stages()

    @app.get("/api/profile/{hash_id}")
    def get_profile(hash_id: str):
        if store.get(hash_id) is None:
            raise HTTPException(status_code=404, detail="Not found")
        return store.profile(hash_id)

    @app.get("/api/ref-graph")
    def get_ref_graph():
        return store.to_ref_graph()

    return app
