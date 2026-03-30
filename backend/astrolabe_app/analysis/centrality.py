"""Centrality analysis for 1-skeleton graph."""
import networkx as nx
from .graph_builder import build_skeleton_graph


def compute_centrality(entries: dict, metric: str = "pagerank") -> dict[str, float]:
    """Compute centrality for each atom node.

    metric: "pagerank" | "betweenness"
    Returns: { atom_hash: centrality_value }
    """
    G = build_skeleton_graph(entries)
    if G.number_of_nodes() == 0:
        return {}

    if metric == "pagerank":
        return nx.pagerank(G)
    elif metric == "betweenness":
        return nx.betweenness_centrality(G)
    else:
        raise ValueError(f"Unknown centrality metric: {metric}")
