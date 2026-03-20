"""
Graph Builder: Convert knowledge obj/mor dicts to NetworkX graph

This is the foundation for all network analysis operations.
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import networkx as nx


@dataclass
class GraphStats:
    """Basic graph statistics"""
    num_nodes: int
    num_edges: int
    density: float
    is_dag: bool
    num_weakly_connected_components: int
    num_strongly_connected_components: int
    largest_wcc_size: int
    largest_scc_size: int

    def to_dict(self) -> dict:
        return {
            "numNodes": self.num_nodes,
            "numEdges": self.num_edges,
            "density": self.density,
            "isDAG": self.is_dag,
            "numWeaklyConnectedComponents": self.num_weakly_connected_components,
            "numStronglyConnectedComponents": self.num_strongly_connected_components,
            "largestWCCSize": self.largest_wcc_size,
            "largestSCCSize": self.largest_scc_size,
        }


def build_networkx_graph(
    nodes: List[dict],
    edges: List[dict],
    directed: bool = True,
    include_node_attrs: bool = True,
) -> nx.DiGraph | nx.Graph:
    """
    Convert knowledge nodes (obj) and edges (mor) to a NetworkX graph.

    Args:
        nodes: List of node dicts from signature.json obj
        edges: List of edge dicts from signature.json mor
        directed: If True, return DiGraph; if False, return undirected Graph
        include_node_attrs: If True, include node attributes

    Returns:
        NetworkX graph (DiGraph or Graph)
    """
    G = nx.DiGraph() if directed else nx.Graph()

    # Add nodes with attributes
    for node in nodes:
        node_id = node.get("id", "")
        attrs = {}
        if include_node_attrs:
            attrs = {
                "name": node.get("name", ""),
                "kind": node.get("sort", ""),  # sort → kind for compat
                "sort": node.get("sort", ""),
                "status": node.get("status", ""),
            }
        G.add_node(node_id, **attrs)

    # Add edges
    node_ids = set(G.nodes())
    for edge in edges:
        source = edge.get("source", "")
        target = edge.get("target", "")
        if source in node_ids and target in node_ids:
            G.add_edge(source, target)

    return G


def build_undirected_graph(nodes: List[dict], edges: List[dict]) -> nx.Graph:
    """Convenience function to build undirected graph"""
    return build_networkx_graph(nodes, edges, directed=False)


def compute_basic_stats(G: nx.DiGraph | nx.Graph) -> GraphStats:
    """Compute basic graph statistics."""
    num_nodes = G.number_of_nodes()
    num_edges = G.number_of_edges()

    if num_nodes > 1:
        if G.is_directed():
            max_edges = num_nodes * (num_nodes - 1)
        else:
            max_edges = num_nodes * (num_nodes - 1) / 2
        density = num_edges / max_edges if max_edges > 0 else 0
    else:
        density = 0

    is_dag = nx.is_directed_acyclic_graph(G) if G.is_directed() else False

    if G.is_directed():
        wccs = list(nx.weakly_connected_components(G))
        sccs = list(nx.strongly_connected_components(G))
        num_wcc = len(wccs)
        num_scc = len(sccs)
        largest_wcc = max(len(c) for c in wccs) if wccs else 0
        largest_scc = max(len(c) for c in sccs) if sccs else 0
    else:
        ccs = list(nx.connected_components(G))
        num_wcc = len(ccs)
        num_scc = len(ccs)
        largest_wcc = max(len(c) for c in ccs) if ccs else 0
        largest_scc = largest_wcc

    return GraphStats(
        num_nodes=num_nodes,
        num_edges=num_edges,
        density=density,
        is_dag=is_dag,
        num_weakly_connected_components=num_wcc,
        num_strongly_connected_components=num_scc,
        largest_wcc_size=largest_wcc,
        largest_scc_size=largest_scc,
    )


def get_subgraph(
    G: nx.DiGraph | nx.Graph,
    node_ids: List[str],
    include_neighbors: bool = False,
) -> nx.DiGraph | nx.Graph:
    """Extract a subgraph containing only specified nodes."""
    nodes_to_include = set(node_ids)
    if include_neighbors:
        for node_id in node_ids:
            if node_id in G:
                nodes_to_include.update(G.neighbors(node_id))
                if G.is_directed():
                    nodes_to_include.update(G.predecessors(node_id))
    return G.subgraph(nodes_to_include).copy()
