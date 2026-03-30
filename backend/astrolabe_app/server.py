"""
Astrolabe API Server

Minimal server: astrolabe CRUD + docs + files + viewport + project init.
No functor mechanism.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from astrolabe_app.astrolabe_router import router as astrolabe_router
from astrolabe_app.routes.docs import router as docs_router
from astrolabe_app.routes.files import router as files_router
from astrolabe_app.routes.viewport import router as viewport_router
from astrolabe_app.routes.project import router as project_router
from astrolabe_app.analysis.router import router as analysis_router

# ── App setup ──

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="Astrolabe API", version="0.3.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

# Mount routers
app.include_router(astrolabe_router, prefix="/api/astrolabe")
app.include_router(docs_router)
app.include_router(files_router)
app.include_router(viewport_router)
app.include_router(project_router)
app.include_router(analysis_router, prefix="/api/plugins/skeleton")


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.3.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8765)
