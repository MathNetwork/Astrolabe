"""
Astrolabe API — FastAPI routes for astrolabe.json.
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .storage import AstrolabeStorage


class CreateEntry(BaseModel):
    hash_id: str
    ref: list[str]
    record: dict


def create_app(project_dir: str) -> FastAPI:
    app = FastAPI(title="Astrolabe API")
    store = AstrolabeStorage(project_dir)

    @app.get("/api/entries")
    def get_entries():
        return store.all_entries()

    @app.get("/api/entries/{hash_id}")
    def get_entry(hash_id: str):
        entry = store.get(hash_id)
        if entry is None:
            raise HTTPException(status_code=404, detail="Not found")
        return entry

    @app.post("/api/entries", status_code=201)
    def create_entry(body: CreateEntry):
        store.put(body.hash_id, body.ref, body.record)
        return store.get(body.hash_id)

    @app.delete("/api/entries/{hash_id}")
    def delete_entry(hash_id: str):
        if store.get(hash_id) is None:
            raise HTTPException(status_code=404, detail="Not found")
        store.delete(hash_id)
        return {"deleted": hash_id}

    @app.get("/api/atoms")
    def get_atoms():
        return store.atoms()

    @app.get("/api/k-forms/{k}")
    def get_k_forms(k: int):
        return store.k_forms(k)

    @app.get("/api/stages")
    def get_stages():
        return store.stages()

    @app.get("/api/profile/{hash_id}")
    def get_profile(hash_id: str):
        if store.get(hash_id) is None:
            raise HTTPException(status_code=404, detail="Not found")
        return store.profile(hash_id)

    @app.get("/api/graph")
    def get_graph():
        nodes, edges = store.to_graph()
        return {"nodes": nodes, "edges": edges}

    @app.get("/api/ref-graph")
    def get_ref_graph():
        return store.to_ref_graph()

    return app
