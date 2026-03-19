"""
Built-in plugins — always registered, not scanned from .astrolabe/plugins/.
"""
from fastapi import FastAPI


def register_builtin_plugins(app: FastAPI):
    """Register all built-in plugins with the app."""
    from .lean.router import router as lean_router
    app.include_router(lean_router, prefix="/api/plugins/lean")
