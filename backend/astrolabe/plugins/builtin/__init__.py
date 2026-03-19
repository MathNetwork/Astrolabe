"""
Built-in plugins — always registered, not scanned from .astrolabe/plugins/.
"""
from fastapi import FastAPI

from ..base import AstrolabePlugin


# Built-in plugin definitions
BUILTIN_PLUGINS = [
    AstrolabePlugin(
        name="lean",
        version="0.1.0",
        skills=[],
        analysis_endpoints=[],
    ),
]


def register_builtin_plugins(app: FastAPI):
    """Register all built-in plugins with the app."""
    from .lean.router import router as lean_router
    app.include_router(lean_router, prefix="/api/plugins/lean")
    # Attach router to plugin object for list endpoint
    BUILTIN_PLUGINS[0].router = lean_router
