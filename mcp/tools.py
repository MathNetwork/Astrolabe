"""
Astrolabe MCP Tool Handlers.

Each function takes a project path + parameters, calls astrolabe_app functions,
and returns JSON-serializable results.
"""
import sys
import os
import json

# Add backend to path so we can import astrolabe_app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from astrolabe_app.storage import AstrolabeStorage, validate_store
from astrolabe_app.analysis.graph_builder import build_skeleton_graph
from astrolabe_app.analysis.semantic_propagation import semantic_propagation
from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
from astrolabe_app.analysis.degree import compute_degree
from astrolabe_app.analysis.centrality import compute_centrality
from astrolabe_app.analysis.dag import compute_dag_metric
from astrolabe_app.analysis.community import detect_communities


# ── Storage cache ──

_stores: dict[str, AstrolabeStorage] = {}


def _get_store(path: str) -> AstrolabeStorage:
    if path not in _stores:
        _stores[path] = AstrolabeStorage(path)
    _stores[path]._check_reload()
    return _stores[path]


# ── Core Tools (Paper §2) ──

def query_entries(path: str, sort: str = "", source: str = "", degree: int | None = None) -> dict:
    """Query entries with optional filters."""
    entries = _get_store(path).all_entries()
    result = {}
    for h, e in entries.items():
        if degree is not None and len(e["ref"]) - 1 != degree:
            continue
        if sort or source:
            try:
                parsed = json.loads(e["record"])
                if sort and parsed.get("sort") != sort:
                    continue
                if source and parsed.get("source") != source:
                    continue
            except (json.JSONDecodeError, TypeError):
                continue
        result[h] = e
    return {"count": len(result), "entries": result}


def get_entry(path: str, hash: str) -> dict:
    """Get a single entry by hash."""
    entry = _get_store(path).get(hash)
    if entry is None:
        return {"error": f"Entry {hash!r} not found"}
    return {"hash": hash, **entry}


def create_entry(path: str, ref: list[str], record: str) -> dict:
    """Create an entry. Validates well-formedness after creation."""
    store = _get_store(path)
    try:
        hash_id, entry = store.create_entry(ref=ref, record=record)
    except ValueError as e:
        return {"error": str(e)}
    # Post-creation validation
    try:
        validate_store(store.data)
    except ValueError as e:
        # Rollback
        store.delete(hash_id)
        return {"error": f"Well-formedness violation after creation: {e}"}
    return {"hash": hash_id, "entry": entry}


def update_entry(path: str, hash: str, new_record: str) -> dict:
    """Update an entry's record. Returns new hash after propagation."""
    store = _get_store(path)
    result = store.update_record(hash, new_record)
    if result is None:
        return {"error": f"Entry {hash!r} not found"}
    new_hash, entry = result
    return {"old_hash": hash, "new_hash": new_hash, "entry": entry}


def delete_entry(path: str, hash: str) -> dict:
    """Delete an entry (cascade to referencing entries)."""
    store = _get_store(path)
    if store.get(hash) is None:
        return {"error": f"Entry {hash!r} not found"}
    store.delete_cascade(hash)
    return {"deleted": hash}


def do_validate_store(path: str) -> dict:
    """Validate well-formedness (Definition 2.2)."""
    store = _get_store(path)
    try:
        validate_store(store.data)
        return {"valid": True, "entry_count": len(store.data)}
    except ValueError as e:
        return {"valid": False, "error": str(e)}


def get_stages(path: str) -> dict:
    """Get stage decomposition for all entries."""
    return _get_store(path).stages()


def get_ref_graph(path: str) -> dict:
    """Get full reference graph (nodes + links)."""
    return _get_store(path).to_ref_graph()


# ── LeanNets Tools (Paper §4) ──

def do_semantic_propagation(path: str, changed_hash: str) -> dict:
    """Find all atoms semantically affected by a change."""
    entries = _get_store(path).all_entries()
    G = build_skeleton_graph(entries)
    if changed_hash not in G:
        return {"changed": changed_hash, "affected": [], "error": "Hash not found in skeleton graph"}
    affected = semantic_propagation(G, changed_hash)
    return {"changed": changed_hash, "affected": sorted(affected)}


def get_skeleton_graph(path: str, size: str = "uniform", color: str = "sort", cluster: str = "none") -> dict:
    """Get skeleton graph with computed metrics."""
    entries = _get_store(path).all_entries()
    return build_skeleton_view(entries, size_by=size, color_by=color, cluster_by=cluster)


def get_network_metrics(path: str, metric: str) -> dict:
    """Compute a single network metric."""
    entries = _get_store(path).all_entries()
    if metric in ("degree", "in-degree", "out-degree"):
        mode = {"degree": "total", "in-degree": "in", "out-degree": "out"}[metric]
        return compute_degree(entries, mode)
    elif metric in ("pagerank", "betweenness", "katz", "hub", "authority"):
        return compute_centrality(entries, metric)
    elif metric in ("depth", "reachability"):
        return compute_dag_metric(entries, metric)
    elif metric == "community":
        return detect_communities(entries)
    else:
        return {"error": f"Unknown metric: {metric}"}


def get_cross_source(path: str, hash: str) -> dict:
    """Find cross-source counterpart for an atom."""
    entries = _get_store(path).all_entries()
    entry = entries.get(hash)
    if not entry:
        return {"error": f"Entry {hash!r} not found"}

    # Get source of this atom
    try:
        parsed = json.loads(entry["record"])
        my_source = parsed.get("source", "")
    except (json.JSONDecodeError, TypeError):
        return {"error": "Cannot parse record"}

    # Search degree-1 entries for cross-source edges
    for h, e in entries.items():
        if len(e["ref"]) != 2:
            continue
        if hash not in e["ref"]:
            continue
        other_hash = e["ref"][0] if e["ref"][1] == hash else e["ref"][1]
        other = entries.get(other_hash)
        if not other:
            continue
        try:
            other_parsed = json.loads(other["record"])
            other_source = other_parsed.get("source", "")
            if other_source and other_source != my_source:
                return {
                    "hash": hash,
                    "source": my_source,
                    "counterpart_hash": other_hash,
                    "counterpart_source": other_source,
                    "counterpart_record": other_parsed,
                    "edge_hash": h,
                }
        except (json.JSONDecodeError, TypeError):
            continue

    return {"hash": hash, "source": my_source, "counterpart": None}


def get_formalization_frontier(path: str) -> dict:
    """Find tex atoms most worth formalizing, ranked by importance."""
    entries = _get_store(path).all_entries()
    G = build_skeleton_graph(entries)

    if G.number_of_nodes() == 0:
        return {"frontier": []}

    # Get PageRank for importance
    try:
        pagerank = compute_centrality(entries, "pagerank")
    except Exception:
        pagerank = {}

    # Find tex atoms without lean counterpart
    tex_atoms = {}
    for h, e in entries.items():
        if len(e["ref"]) != 1 or e["ref"][0] != h:
            continue
        try:
            parsed = json.loads(e["record"])
            if parsed.get("source") == "tex" and parsed.get("sort") != "proof":
                tex_atoms[h] = parsed
        except (json.JSONDecodeError, TypeError):
            continue

    # Check which tex atoms have lean counterparts
    has_lean = set()
    for h, e in entries.items():
        if len(e["ref"]) != 2:
            continue
        r0, r1 = e["ref"]
        for a, b in [(r0, r1), (r1, r0)]:
            if a in tex_atoms:
                other = entries.get(b)
                if other:
                    try:
                        op = json.loads(other["record"])
                        if op.get("source") == "lean":
                            has_lean.add(a)
                    except (json.JSONDecodeError, TypeError):
                        pass

    # Build frontier: tex atoms without lean, sorted by PageRank
    frontier = []
    for h, parsed in tex_atoms.items():
        if h in has_lean:
            continue
        frontier.append({
            "hash": h,
            "sort": parsed.get("sort", ""),
            "title": parsed.get("title", ""),
            "pagerank": pagerank.get(h, 0),
            "has_lean": False,
        })

    frontier.sort(key=lambda x: x["pagerank"], reverse=True)
    return {"frontier": frontier, "total_tex": len(tex_atoms), "formalized": len(has_lean)}
