"""
Semantic propagation (Paper §4.5).

Reverse BFS on the skeleton graph: when an atom changes, find all atoms
that semantically depend on it by following incoming edges (predecessors).

Skeleton graph edge convention: ref[0]→ref[1] = dependent→dependency.
Predecessors of a node are its direct dependents.
"""
from collections import deque

import networkx as nx


def semantic_propagation(G: nx.DiGraph, changed: str) -> set[str]:
    """Return the set of atoms affected by a change to `changed`.

    Performs BFS on the reverse graph (following incoming edges) to find
    all atoms that transitively depend on the changed atom.
    The changed atom itself is not included in the result.
    """
    if changed not in G:
        return set()

    affected: set[str] = set()
    queue: deque[str] = deque()

    # Seed: direct predecessors of the changed node
    for pred in G.predecessors(changed):
        if pred not in affected:
            affected.add(pred)
            queue.append(pred)

    # BFS: expand predecessors
    while queue:
        node = queue.popleft()
        for pred in G.predecessors(node):
            if pred not in affected:
                affected.add(pred)
                queue.append(pred)

    return affected
