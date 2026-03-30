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


def _to_dag(G: nx.DiGraph) -> nx.DiGraph:
    """Remove back edges to make the graph a DAG."""
    if nx.is_directed_acyclic_graph(G):
        return G
    # Use DFS to find and remove back edges
    dag = G.copy()
    back_edges = []
    try:
        edges = list(nx.find_cycle(dag))
        while edges:
            # Remove the last edge in the cycle (back edge)
            back_edges.append(edges[-1][:2])
            dag.remove_edge(*edges[-1][:2])
            try:
                edges = list(nx.find_cycle(dag))
            except nx.NetworkXNoCycle:
                break
    except nx.NetworkXNoCycle:
        pass
    return dag


def _compute_depth(G: nx.DiGraph) -> dict[str, int]:
    """Longest path from any root (source) to each node. Removes cycles first."""
    dag = _to_dag(G)
    depth: dict[str, int] = {}
    for node in nx.topological_sort(dag):
        preds = list(dag.predecessors(node))
        if not preds:
            depth[node] = 0
        else:
            depth[node] = max(depth.get(p, 0) for p in preds) + 1
    return depth


def _compute_reachability(G: nx.DiGraph) -> dict[str, int]:
    """Number of nodes reachable from each node (excluding self). Removes cycles first."""
    dag = _to_dag(G)
    return {node: len(nx.descendants(dag, node)) for node in dag.nodes()}
