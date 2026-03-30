"""Community detection for 1-skeleton graph."""
import networkx as nx
from .graph_builder import build_skeleton_graph


def detect_communities(entries: dict) -> dict[str, int]:
    """Detect communities using greedy modularity (no external deps).

    Returns: { atom_hash: community_id }
    """
    G = build_skeleton_graph(entries)
    if G.number_of_nodes() == 0:
        return {}

    if G.number_of_nodes() == 1:
        return {list(G.nodes())[0]: 0}

    # Use undirected view for community detection
    U = G.to_undirected()

    # networkx built-in greedy modularity
    communities = list(nx.community.greedy_modularity_communities(U))

    result: dict[str, int] = {}
    for i, comm in enumerate(communities):
        for node in comm:
            result[node] = i

    return result
