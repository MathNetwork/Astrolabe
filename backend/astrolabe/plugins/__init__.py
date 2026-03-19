"""
Plugin loader — scan .astrolabe/plugins/ and load plugin modules.
"""
import json
import importlib.util
import sys
from pathlib import Path
from typing import List

from .base import AstrolabePlugin


def scan_plugins(project_path: Path) -> List[AstrolabePlugin]:
    """Scan .astrolabe/plugins/ directory and load all valid plugins."""
    plugins_dir = project_path / ".astrolabe" / "plugins"
    if not plugins_dir.is_dir():
        return []

    plugins = []
    for child in sorted(plugins_dir.iterdir()):
        if not child.is_dir():
            continue
        plugin_json = child / "plugin.json"
        if not plugin_json.exists():
            continue

        try:
            meta = json.loads(plugin_json.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, IOError):
            continue

        name = meta.get("name", child.name)
        version = meta.get("version", "0.0.0")
        plugin = AstrolabePlugin(name=name, version=version)

        # Load analysis_endpoints from plugin.json
        plugin.analysis_endpoints = meta.get("analysis_endpoints", [])

        # Load entry module if specified
        entry = meta.get("entry")
        if entry:
            entry_path = child / entry
            if entry_path.exists():
                module = _load_module(name, entry_path)
                if module:
                    plugin.router = getattr(module, "router", None)
                    plugin.skills = getattr(module, "skills", [])

        plugins.append(plugin)

    return plugins


def _load_module(plugin_name: str, path: Path):
    """Dynamically load a Python module from a file path."""
    module_name = f"astrolabe_plugin_{plugin_name}"
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
