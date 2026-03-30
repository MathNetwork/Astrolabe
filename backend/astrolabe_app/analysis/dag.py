"""DAG analysis for 1-skeleton graph."""
import networkx as nx
from .graph_builder import build_skeleton_graph


def compute_dag_metric(entries: dict, metric: str = "depth") -> dict[str, int]:
    """Compute DAG metric for each atom node.

    metric: "depth" | "reachability"
    Returns: { atom_hash: value }
    """
    G = build_skeleton_graph(entries)
    if G.number_of_nodes() == 0:
        return {}

    if metric == "depth":
        return _compute_depth(G)
    elif metric == "reachability":
        return _compute_reachability(G)
    else:
        raise ValueError(f"Unknown DAG metric: {metric}")


def _compute_depth(G: nx.DiGraph) -> dict[str, int]:
    """Longest path from any root (source) to each node."""
    depth: dict[str, int] = {}
    try:
        for node in nx.topological_sort(G):
            preds = list(G.predecessors(node))
            if not preds:
                depth[node] = 0
            else:
                depth[node] = max(depth.get(p, 0) for p in preds) + 1
    except nx.NetworkXUnfeasible:
        # Graph has cycles — fallback to 0
        for node in G.nodes():
            depth[node] = 0
    return depth


def _compute_reachability(G: nx.DiGraph) -> dict[str, int]:
    """Number of nodes reachable from each node (excluding self)."""
    return {node: len(nx.descendants(G, node)) for node in G.nodes()}
