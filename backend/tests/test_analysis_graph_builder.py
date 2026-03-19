"""Test graph_builder with knowledge obj/mor format."""

from astrolabe.analysis.graph_builder import build_networkx_graph, compute_basic_stats


def test_build_from_knowledge_dicts():
    nodes = [
        {"id": "aaa", "name": "Theorem A", "sort": "theorem", "status": "stated"},
        {"id": "bbb", "name": "Definition B", "sort": "definition", "status": "stated"},
        {"id": "ccc", "name": "Lemma C", "sort": "lemma", "status": "stated"},
    ]
    edges = [
        {"id": "e1", "source": "aaa", "target": "bbb"},
        {"id": "e2", "source": "aaa", "target": "ccc"},
    ]
    G = build_networkx_graph(nodes, edges)
    assert G.number_of_nodes() == 3
    assert G.number_of_edges() == 2
    assert G.nodes["aaa"]["sort"] == "theorem"
    assert G.nodes["bbb"]["name"] == "Definition B"


def test_edges_skip_missing_nodes():
    nodes = [{"id": "aaa", "name": "A", "sort": "theorem", "status": "stated"}]
    edges = [{"id": "e1", "source": "aaa", "target": "zzz"}]  # zzz doesn't exist
    G = build_networkx_graph(nodes, edges)
    assert G.number_of_nodes() == 1
    assert G.number_of_edges() == 0


def test_basic_stats():
    nodes = [
        {"id": "a", "name": "A", "sort": "theorem", "status": "stated"},
        {"id": "b", "name": "B", "sort": "definition", "status": "stated"},
        {"id": "c", "name": "C", "sort": "lemma", "status": "stated"},
    ]
    edges = [{"id": "e1", "source": "a", "target": "b"}]
    G = build_networkx_graph(nodes, edges)
    stats = compute_basic_stats(G)
    assert stats.num_nodes == 3
    assert stats.num_edges == 1
    assert stats.density > 0
