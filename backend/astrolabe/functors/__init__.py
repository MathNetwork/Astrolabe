"""
Functor loader — scan .astrolabe/functors/ and load functor modules.
"""
import json
import importlib.util
import sys
from pathlib import Path
from typing import List

from .base import AstrolabeFunctor
from .network_analysis import FUNCTOR_INFO as _network_analysis_functor
from .lean_import import FUNCTOR_INFO as _lean_import_functor

BUILTIN_FUNCTORS = [_network_analysis_functor, _lean_import_functor]


def register_builtin_functors(app):
    """Register all built-in functor routers with the FastAPI app."""
    from .lean_import.router import router as lean_router
    app.include_router(lean_router, prefix="/api/functors/lean")
    _lean_import_functor.router = lean_router


def scan_functors(project_path: Path) -> List[AstrolabeFunctor]:
    """Scan .astrolabe/functors/ directory and load all valid functors.

    Backward compatibility: if .astrolabe/plugins/ exists but .astrolabe/functors/
    does not, automatically migrate by renaming the directory.
    """
    functors_dir = project_path / ".astrolabe" / "functors"
    legacy_dir = project_path / ".astrolabe" / "plugins"

    # Backward compatibility: migrate plugins/ → functors/
    if not functors_dir.exists() and legacy_dir.is_dir():
        legacy_dir.rename(functors_dir)

    if not functors_dir.is_dir():
        return []

    functors = []
    for child in sorted(functors_dir.iterdir()):
        if not child.is_dir():
            continue
        functor_json = child / "functor.json"
        if not functor_json.exists():
            continue

        try:
            meta = json.loads(functor_json.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, IOError):
            continue

        name = meta.get("name", child.name)
        version = meta.get("version", "0.0.0")
        functor = AstrolabeFunctor(
            name=name,
            version=version,
            description=meta.get("description", "No description"),
            author=meta.get("author", "Unknown"),
            updated_at=meta.get("updated_at", ""),
            icon=meta.get("icon", ""),
        )

        functor.analysis_endpoints = meta.get("analysis_endpoints", [])

        entry = meta.get("entry")
        if entry:
            entry_path = child / entry
            if entry_path.exists():
                module = _load_module(name, entry_path)
                if module:
                    functor.router = getattr(module, "router", None)
                    functor.skills = getattr(module, "skills", [])

        functors.append(functor)

    return functors


def _load_module(functor_name: str, path: Path):
    """Dynamically load a Python module from a file path."""
    module_name = f"astrolabe_functor_{functor_name}"
    try:
        spec = importlib.util.spec_from_file_location(module_name, path)
        if not spec or not spec.loader:
            return None
        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)
        return module
    except Exception:
        return None
