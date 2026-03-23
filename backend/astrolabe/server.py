"""
Astrolabe API Server

App setup + router mounting. Business logic lives in functors/*.
"""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from .signature_storage import SignatureStorage
from .functors import scan_functors, register_builtin_functors, BUILTIN_FUNCTORS

# ── Storage singletons ──

_signature_stores: dict[str, SignatureStorage] = {}
_loaded_functors: dict[str, list] = {}  # project_path -> list of AstrolabeFunctor


def _get_signature_store(path: str) -> SignatureStorage:
    """Get or create a SignatureStorage for the given project path."""
    if path not in _signature_stores:
        _signature_stores[path] = SignatureStorage(Path(path))
    return _signature_stores[path]


# ── App setup ──

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="Astrolabe API", description="Signature Visualization Tool",
              version="0.2.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

# ── Import and wire routers ──

from .functors.signature_crud.router import router as sig_router, set_store_getter as sig_set
from .functors.mdx_docs.router import router as docs_router
from .functors.file_browser.router import router as files_router
from .functors.viewport.router import router as viewport_router
from .functors.project_init.router import router as project_router, set_stores as project_set
from .functors.network_analysis.router import router as analysis_router, set_signature_store_getter
from .astrolabe_router import router as astrolabe_router

# Inject dependencies
sig_set(_get_signature_store)
set_signature_store_getter(lambda path: _get_signature_store(path))
project_set(_signature_stores)

# Mount routers
app.include_router(sig_router)
app.include_router(docs_router)
app.include_router(files_router)
app.include_router(viewport_router)
app.include_router(project_router)
app.include_router(analysis_router)
app.include_router(astrolabe_router, prefix="/api/astrolabe")

# Register built-in functors (lean parser etc.)
register_builtin_functors(app)


# ── Minimal endpoints that stay in server.py ──

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.2.0"}


def _load_functors_for_project(path: str):
    """Load functors for a project path (idempotent). Includes built-in + scanned."""
    if path in _loaded_functors:
        return _loaded_functors[path]
    scanned = scan_functors(Path(path))
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
            "name": p.name, "version": p.version, "description": p.description,
            "signature": p.signature, "author": p.author, "updated_at": p.updated_at,
            "icon": p.icon, "skills": p.skills,
            "analysis_endpoints": [{**ep, "url": ep["path"]} for ep in p.analysis_endpoints],
        }
        for p in functors
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8765)
