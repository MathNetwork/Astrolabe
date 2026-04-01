"""
Semantic propagation tests (Paper §4.5).

When an atom changes, reverse BFS on the skeleton graph flags all atoms
that semantically depend on the changed atom.

Skeleton graph edge convention: ref[0]→ref[1] = dependent→dependency.
So "L1 depends on D1" is ref=[L1, D1], edge L1→D1 in graph.
Reverse BFS from D1 finds predecessors: L1, then T1, etc.
"""
import json
import pytest

from astrolabe_app.analysis.graph_builder import build_skeleton_graph
from astrolabe_app.analysis.semantic_propagation import semantic_propagation


def _atom(sort="definition", title="", source="tex"):
    return json.dumps({"sort": sort, "source": source, "title": title})


def _edge(sort=""):
    return json.dumps({"sort": sort})


@pytest.fixture
def diamond_entries():
    """
    Skeleton graph (arrows = dependent→dependency):

        T1 → L1 → D1
        T2 ------→ D1
        U1 (isolated, no edges)

    Dependency meaning:
        L1 depends on D1
        T1 depends on L1 (transitively depends on D1)
        T2 depends on D1
        U1 depends on nothing
    """
    return {
        "D1": {"ref": ["D1"], "record": _atom("definition", "D1")},
        "L1": {"ref": ["L1"], "record": _atom("lemma", "L1")},
        "T1": {"ref": ["T1"], "record": _atom("theorem", "T1")},
        "T2": {"ref": ["T2"], "record": _atom("theorem", "T2")},
        "U1": {"ref": ["U1"], "record": _atom("definition", "U1")},
        # Edges: ref=[dependent, dependency]
        "eLD": {"ref": ["L1", "D1"], "record": _edge("(lemma, definition)")},
        "eTL": {"ref": ["T1", "L1"], "record": _edge("(theorem, lemma)")},
        "eTD": {"ref": ["T2", "D1"], "record": _edge("(theorem, definition)")},
    }


@pytest.fixture
def cyclic_entries():
    """
    C1 → C2 → C1  (cycle)
    C1 → A1       (C1 also depends on A1)
    """
    return {
        "A1": {"ref": ["A1"], "record": _atom("definition", "A1")},
        "C1": {"ref": ["C1"], "record": _atom("theorem", "C1")},
        "C2": {"ref": ["C2"], "record": _atom("theorem", "C2")},
        "eC12": {"ref": ["C1", "C2"], "record": _edge()},
        "eC21": {"ref": ["C2", "C1"], "record": _edge()},
        "eCA":  {"ref": ["C1", "A1"], "record": _edge()},
    }


class TestSemanticPropagation:
    def test_direct_dependency(self, diamond_entries):
        """D1 changes → L1 and T2 are flagged (direct dependents)."""
        G = build_skeleton_graph(diamond_entries)
        affected = semantic_propagation(G, "D1")
        assert "L1" in affected
        assert "T2" in affected

    def test_transitive_dependency(self, diamond_entries):
        """D1 changes → T1 is also flagged (depends on D1 via L1)."""
        G = build_skeleton_graph(diamond_entries)
        affected = semantic_propagation(G, "D1")
        assert "T1" in affected
        # Full set: L1, T1, T2
        assert affected == {"L1", "T1", "T2"}

    def test_unrelated_not_flagged(self, diamond_entries):
        """D1 changes → U1 is NOT flagged (no dependency on D1)."""
        G = build_skeleton_graph(diamond_entries)
        affected = semantic_propagation(G, "D1")
        assert "U1" not in affected
        assert "D1" not in affected  # changed atom itself is not in the set

    def test_no_forward_propagation(self, diamond_entries):
        """T1 changes → D1 is NOT flagged (dependency goes the other way)."""
        G = build_skeleton_graph(diamond_entries)
        affected = semantic_propagation(G, "T1")
        assert "D1" not in affected
        assert "L1" not in affected
        assert affected == set()

    def test_cycle_handling(self, cyclic_entries):
        """Cycle does not cause infinite loop; all reachable predecessors are returned."""
        G = build_skeleton_graph(cyclic_entries)
        affected = semantic_propagation(G, "A1")
        # C1 depends on A1, C2 depends on C1, C1 depends on C2 (cycle)
        # Both C1 and C2 should be flagged, no infinite loop
        assert "C1" in affected
        assert "C2" in affected
        assert "A1" not in affected
