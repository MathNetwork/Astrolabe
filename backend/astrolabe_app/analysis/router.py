"""API endpoints for skeleton analysis."""
from fastapi import APIRouter, Query
from ..storage import AstrolabeStorage
from .degree import compute_degree
from .centrality import compute_centrality
from .dag import compute_dag_metric

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

    metric: degree | in-degree | out-degree | pagerank | betweenness | depth | reachability
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
    else:
        return {"error": f"Unknown metric: {metric}"}
