"""Tests for skeleton graph API — TDD: write tests first."""
import pytest

SAMPLE_ENTRIES = {
    "aaa": {"ref": ["aaa"], "record": '{"sort":"theorem","source":"tex","title":"T1"}'},
    "bbb": {"ref": ["bbb"], "record": '{"sort":"definition","source":"tex","title":"D1"}'},
    "ccc": {"ref": ["ccc"], "record": '{"sort":"lemma","source":"tex","title":"L1"}'},
    "ddd": {"ref": ["ddd"], "record": '{"sort":"proof","source":"tex","title":"P1"}'},
    "e1": {"ref": ["aaa", "bbb"], "record": '{"sort":"(theorem, definition)"}'},
    "e2": {"ref": ["aaa", "ccc"], "record": '{"sort":"(theorem, lemma)"}'},
    "e3": {"ref": ["aaa", "ddd"], "record": '{"sort":"(theorem, proof)"}'},
    "e4": {"ref": ["ccc", "bbb"], "record": '{"sort":"(lemma, definition)"}'},
}


def test_skeleton_graph_nodes_are_atoms_only():
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(SAMPLE_ENTRIES)
    node_ids = {n["id"] for n in result["nodes"]}
    assert node_ids == {"aaa", "bbb", "ccc", "ddd"}


def test_skeleton_graph_edges_from_degree1():
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(SAMPLE_ENTRIES)
    assert len(result["edges"]) == 4
    edge_pairs = {(e["source"], e["target"]) for e in result["edges"]}
    assert ("aaa", "bbb") in edge_pairs
    assert ("aaa", "ccc") in edge_pairs
    assert ("ccc", "bbb") in edge_pairs


def test_skeleton_graph_node_has_sort_and_title():
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(SAMPLE_ENTRIES)
    aaa = next(n for n in result["nodes"] if n["id"] == "aaa")
    assert aaa["sort"] == "theorem"
    assert aaa["title"] == "T1"


def test_skeleton_graph_node_has_radius_and_color():
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(SAMPLE_ENTRIES)
    aaa = next(n for n in result["nodes"] if n["id"] == "aaa")
    assert "radius" in aaa
    assert "color" in aaa
    assert isinstance(aaa["radius"], (int, float))
    assert isinstance(aaa["color"], str)


def test_skeleton_graph_edge_has_sort_and_color():
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(SAMPLE_ENTRIES)
    e = result["edges"][0]
    assert "sort" in e
    assert "color" in e


def test_skeleton_graph_size_by_degree():
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(SAMPLE_ENTRIES, size_by="degree")
    nodes = {n["id"]: n for n in result["nodes"]}
    # aaa has 3 edges (out=3), bbb has 2 (in=2), ddd has 1 (in=1)
    assert nodes["aaa"]["radius"] > nodes["ddd"]["radius"]


def test_skeleton_graph_size_by_pagerank():
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(SAMPLE_ENTRIES, size_by="pagerank")
    nodes = {n["id"]: n for n in result["nodes"]}
    assert all(isinstance(n["radius"], (int, float)) for n in result["nodes"])
    # bbb is a sink, should have higher pagerank → bigger radius
    assert nodes["bbb"]["radius"] > nodes["aaa"]["radius"]


def test_skeleton_graph_color_by_community():
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(SAMPLE_ENTRIES, color_by="community")
    colors = {n["color"] for n in result["nodes"]}
    # Should have at least 1 color assigned
    assert len(colors) >= 1
    assert all(isinstance(n["color"], str) for n in result["nodes"])


def test_skeleton_graph_empty():
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view({})
    assert result["nodes"] == []
    assert result["edges"] == []


def test_skeleton_graph_uniform_size():
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(SAMPLE_ENTRIES, size_by="uniform")
    radii = {n["radius"] for n in result["nodes"]}
    assert len(radii) == 1  # all same


def test_skeleton_graph_cluster_louvain():
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(SAMPLE_ENTRIES, cluster_by="louvain")
    nodes_with_cluster = [n for n in result["nodes"] if "cluster" in n]
    assert len(nodes_with_cluster) == 4  # all atoms get cluster


def test_skeleton_graph_cluster_sort():
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(SAMPLE_ENTRIES, cluster_by="sort")
    nodes = {n["id"]: n for n in result["nodes"]}
    # aaa=theorem, bbb=definition → different clusters
    assert nodes["aaa"]["cluster"] != nodes["bbb"]["cluster"]


def test_skeleton_graph_cluster_none():
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(SAMPLE_ENTRIES, cluster_by="none")
    nodes_with_cluster = [n for n in result["nodes"] if "cluster" in n]
    assert len(nodes_with_cluster) == 0


def test_skeleton_graph_sort_color_default():
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(SAMPLE_ENTRIES, color_by="sort")
    nodes = {n["id"]: n for n in result["nodes"]}
    # Different sorts → different colors
    assert nodes["aaa"]["color"] != nodes["bbb"]["color"]  # theorem vs definition
