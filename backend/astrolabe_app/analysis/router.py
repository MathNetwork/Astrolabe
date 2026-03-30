"""API endpoints for skeleton analysis."""
from fastapi import APIRouter, Query
from ..storage import AstrolabeStorage
from .degree import compute_degree
from .centrality import compute_centrality
from .dag import compute_dag_metric
from .community import detect_communities
from .cluster import compute_clusters
from .skeleton_graph import build_skeleton_view

router = APIRouter()

_stores: dict[str, AstrolabeStorage] = {}

def _get_entries(path: str) -> dict:
    if path not in _stores:
        _stores[path] = AstrolabeStorage(path)
    _stores[path]._check_reload()
    return _stores[path].data


@router.get("/analyze")
def analyze(path: str = Query(...), metric: str = Query(...)):
    """Compute a metric for the 1-skeleton graph.

    metric: degree | in-degree | out-degree | pagerank | betweenness | depth | reachability | community
    Returns: { node_id: value }
    """
    entries = _get_entries(path)

    if metric in ("degree", "in-degree", "out-degree"):
        mode = {"degree": "total", "in-degree": "in", "out-degree": "out"}[metric]
        return compute_degree(entries, mode)
    elif metric in ("pagerank", "betweenness"):
        return compute_centrality(entries, metric)
    elif metric in ("depth", "reachability"):
        return compute_dag_metric(entries, metric)
    elif metric == "community":
        return detect_communities(entries)
    elif metric in ("cluster-louvain", "cluster-sort", "cluster-stage"):
        method = metric.split("-", 1)[1]
        return compute_clusters(entries, method)
    else:
        return {"error": f"Unknown metric: {metric}"}


@router.get("/graph")
def skeleton_graph(
    path: str = Query(...),
    source: str = Query("all"),
    size: str = Query("uniform"),
    color: str = Query("sort"),
    cluster: str = Query("none"),
):
    """Build complete skeleton view with computed size, color, and cluster.

    source: all | tex | lean | bib — filter atoms by source before analysis
    """
    entries = _get_entries(path)
    if source != "all":
        entries = _filter_by_source(entries, source)
    return build_skeleton_view(entries, size_by=size, color_by=color, cluster_by=cluster)


def _filter_by_source(entries: dict, source: str) -> dict:
    """Keep atoms matching source + edges connecting them."""
    import json
    # Find atoms with matching source
    keep_atoms = set()
    for h, e in entries.items():
        if len(e["ref"]) == 1 and e["ref"][0] == h:
            try:
                parsed = json.loads(e["record"])
                if parsed.get("source") == source:
                    keep_atoms.add(h)
            except:
                pass

    # Keep those atoms + edges where both endpoints are in keep_atoms
    filtered = {}
    for h, e in entries.items():
        if len(e["ref"]) == 1 and h in keep_atoms:
            filtered[h] = e
        elif len(e["ref"]) == 2 and e["ref"][0] in keep_atoms and e["ref"][1] in keep_atoms:
            filtered[h] = e
    return filtered
