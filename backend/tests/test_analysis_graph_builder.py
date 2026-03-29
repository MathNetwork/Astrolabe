"""Tests for 1-skeleton graph builder — TDD: write tests first."""
import pytest


SAMPLE_ENTRIES = {
    # Atoms
    "aaa": {"ref": ["aaa"], "record": '{"sort":"theorem","title":"T1"}'},
    "bbb": {"ref": ["bbb"], "record": '{"sort":"definition","title":"D1"}'},
    "ccc": {"ref": ["ccc"], "record": '{"sort":"lemma","title":"L1"}'},
    "ddd": {"ref": ["ddd"], "record": '{"sort":"proof","title":"P1"}'},
    # Degree-1 edges
    "e1": {"ref": ["aaa", "bbb"], "record": '{"sort":"(theorem, definition)"}'},
    "e2": {"ref": ["aaa", "ccc"], "record": '{"sort":"(theorem, lemma)"}'},
    "e3": {"ref": ["aaa", "ddd"], "record": '{"sort":"(theorem, proof)"}'},
    "e4": {"ref": ["ccc", "bbb"], "record": '{"sort":"(lemma, definition)"}'},
}


def test_build_graph_nodes():
    from astrolabe_app.analysis.graph_builder import build_skeleton_graph
    G = build_skeleton_graph(SAMPLE_ENTRIES)
    # Only atoms should be nodes
    assert set(G.nodes()) == {"aaa", "bbb", "ccc", "ddd"}


def test_build_graph_edges():
    from astrolabe_app.analysis.graph_builder import build_skeleton_graph
    G = build_skeleton_graph(SAMPLE_ENTRIES)
    # 4 degree-1 entries become 4 directed edges
    assert G.number_of_edges() == 4
    assert G.has_edge("aaa", "bbb")
    assert G.has_edge("aaa", "ccc")
    assert G.has_edge("aaa", "ddd")
    assert G.has_edge("ccc", "bbb")


def test_build_graph_edge_data():
    from astrolabe_app.analysis.graph_builder import build_skeleton_graph
    G = build_skeleton_graph(SAMPLE_ENTRIES)
    data = G.edges["aaa", "bbb"]
    assert data["hash"] == "e1"
    assert data["sort"] == "(theorem, definition)"


def test_build_graph_node_data():
    from astrolabe_app.analysis.graph_builder import build_skeleton_graph
    G = build_skeleton_graph(SAMPLE_ENTRIES)
    assert G.nodes["aaa"]["sort"] == "theorem"
    assert G.nodes["aaa"]["title"] == "T1"


def test_build_graph_ignores_higher_degree():
    entries = {
        **SAMPLE_ENTRIES,
        "tri": {"ref": ["aaa", "bbb", "ccc"], "record": '{"sort":"triangle"}'},
    }
    from astrolabe_app.analysis.graph_builder import build_skeleton_graph
    G = build_skeleton_graph(entries)
    # Triangle entry should be ignored
    assert G.number_of_nodes() == 4
    assert G.number_of_edges() == 4


def test_build_graph_empty():
    from astrolabe_app.analysis.graph_builder import build_skeleton_graph
    G = build_skeleton_graph({})
    assert G.number_of_nodes() == 0
    assert G.number_of_edges() == 0
