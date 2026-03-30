"""Cluster assignment for 1-skeleton graph."""
import json
import networkx as nx
from .graph_builder import build_skeleton_graph
from ..storage import AstrolabeStorage


def compute_clusters(entries: dict, method: str = "louvain") -> dict[str, int]:
    """Assign each atom to a cluster.

    method: "louvain" | "sort" | "stage"
    Returns: { atom_hash: cluster_id }
    """
    G = build_skeleton_graph(entries)
    if G.number_of_nodes() == 0:
        return {}

    if method == "louvain":
        return _cluster_louvain(G)
    elif method == "sort":
        return _cluster_by_sort(G)
    elif method == "stage":
        return _cluster_by_stage(entries, G)
    else:
        raise ValueError(f"Unknown cluster method: {method}")


def _cluster_louvain(G: nx.DiGraph) -> dict[str, int]:
    U = G.to_undirected()
    communities = list(nx.community.greedy_modularity_communities(U))
    result: dict[str, int] = {}
    for i, comm in enumerate(communities):
        for node in comm:
            result[node] = i
    return result


def _cluster_by_sort(G: nx.DiGraph) -> dict[str, int]:
    sort_to_id: dict[str, int] = {}
    result: dict[str, int] = {}
    for node, data in G.nodes(data=True):
        sort = data.get("sort", "")
        if sort not in sort_to_id:
            sort_to_id[sort] = len(sort_to_id)
        result[node] = sort_to_id[sort]
    return result


def _cluster_by_stage(entries: dict, G: nx.DiGraph) -> dict[str, int]:
    """Cluster by topological stage (depth from roots)."""
    # Compute stage via longest path from roots
    depth: dict[str, int] = {}
    try:
        for node in nx.topological_sort(G):
            preds = list(G.predecessors(node))
            if not preds:
                depth[node] = 0
            else:
                depth[node] = max(depth.get(p, 0) for p in preds) + 1
    except nx.NetworkXUnfeasible:
        for node in G.nodes():
            depth[node] = 0
    return depth
