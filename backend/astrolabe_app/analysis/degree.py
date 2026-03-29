"""Degree analysis for 1-skeleton graph."""
from .graph_builder import build_skeleton_graph


def compute_degree(entries: dict, mode: str = "total") -> dict[str, int]:
    """Compute degree for each atom node.

    mode: "total" | "in" | "out"
    Returns: { atom_hash: degree_value }
    """
    G = build_skeleton_graph(entries)
    result: dict[str, int] = {}

    for node in G.nodes():
        if mode == "in":
            result[node] = G.in_degree(node)
        elif mode == "out":
            result[node] = G.out_degree(node)
        else:
            result[node] = G.in_degree(node) + G.out_degree(node)

    return result
