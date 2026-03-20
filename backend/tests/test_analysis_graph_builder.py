"""Test graph_builder with knowledge obj/mor format."""

from astrolabe.functors.network_analysis.graph_builder import build_networkx_graph, compute_basic_stats


def test_build_from_knowledge_dicts():
    objs = [
        {"id": "aaa", "name": "Theorem A", "sort": "theorem", "status": "stated"},
        {"id": "bbb", "name": "Definition B", "sort": "definition", "status": "stated"},
        {"id": "ccc", "name": "Lemma C", "sort": "lemma", "status": "stated"},
    ]
    mors = [
        {"id": "e1", "source": "aaa", "target": "bbb"},
        {"id": "e2", "source": "aaa", "target": "ccc"},
    ]
    G = build_networkx_graph(objs, mors)
    assert G.number_of_nodes() == 3
    assert G.number_of_edges() == 2
    assert G.nodes["aaa"]["sort"] == "theorem"
    assert G.nodes["bbb"]["name"] == "Definition B"


def test_mors_skip_missing_objs():
    objs = [{"id": "aaa", "name": "A", "sort": "theorem", "status": "stated"}]
    mors = [{"id": "e1", "source": "aaa", "target": "zzz"}]  # zzz doesn't exist
    G = build_networkx_graph(objs, mors)
    assert G.number_of_nodes() == 1
    assert G.number_of_edges() == 0


def test_basic_stats():
    objs = [
        {"id": "a", "name": "A", "sort": "theorem", "status": "stated"},
        {"id": "b", "name": "B", "sort": "definition", "status": "stated"},
        {"id": "c", "name": "C", "sort": "lemma", "status": "stated"},
    ]
    mors = [{"id": "e1", "source": "a", "target": "b"}]
    G = build_networkx_graph(objs, mors)
    stats = compute_basic_stats(G)
    assert stats.num_nodes == 3
    assert stats.num_edges == 1
    assert stats.density > 0
