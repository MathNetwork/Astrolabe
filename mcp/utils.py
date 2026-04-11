"""Shared utilities for MCP tools."""
import json
import os
import sys

# Add backend to path so we can import astrolabe_app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from astrolabe_app.storage import AstrolabeStorage

_stores: dict[str, AstrolabeStorage] = {}


def parse_record(raw) -> dict | None:
    """Safely parse an entry's record field into a dict.

    Handles: JSON strings, dicts (already parsed), and non-dict values
    (int, list, etc.) which are skipped. Returns None on failure.
    """
    if isinstance(raw, dict):
        return raw
    if not isinstance(raw, str):
        return None
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return None
    if not isinstance(parsed, dict):
        return None
    return parsed


def resolve_store_path(path: str) -> str:
    """Resolve any path variant to the project root for AstrolabeStorage.

    Accepts: project root, .astrolabe dir, .astrolabe/astrolabe.json, or
    project root with flat astrolabe.json. Always returns the project root.
    """
    p = os.path.abspath(path)

    if p.endswith('.json') and os.path.isfile(p):
        parent = os.path.dirname(p)
        if os.path.basename(parent) == '.astrolabe':
            return os.path.dirname(parent)
        return parent

    if os.path.basename(p) == '.astrolabe' and os.path.isdir(p):
        return os.path.dirname(p)

    if os.path.isfile(os.path.join(p, '.astrolabe', 'astrolabe.json')):
        return p

    if os.path.isfile(os.path.join(p, 'astrolabe.json')):
        return p

    return p


def get_store(path: str) -> AstrolabeStorage:
    """Get a cached AstrolabeStorage instance, auto-resolving the path."""
    resolved = resolve_store_path(path)
    if resolved not in _stores:
        _stores[resolved] = AstrolabeStorage(resolved)
    _stores[resolved]._check_reload()
    return _stores[resolved]
