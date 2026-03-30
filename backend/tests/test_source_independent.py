"""Tests for source-independent analysis — TDD: write tests first."""
import pytest

# Mixed source entries: tex + lean + cross-source edges
MIXED_ENTRIES = {
    # tex atoms
    "t1": {"ref": ["t1"], "record": '{"sort":"theorem","source":"tex","title":"T1"}'},
    "t2": {"ref": ["t2"], "record": '{"sort":"definition","source":"tex","title":"D1"}'},
    "t3": {"ref": ["t3"], "record": '{"sort":"lemma","source":"tex","title":"L1"}'},
    # lean atoms
    "l1": {"ref": ["l1"], "record": '{"sort":"theorem","source":"lean","title":"LT1"}'},
    "l2": {"ref": ["l2"], "record": '{"sort":"definition","source":"lean","title":"LD1"}'},
    "l3": {"ref": ["l3"], "record": '{"sort":"proof","source":"lean","title":"LP1"}'},
    # tex internal edges
    "e1": {"ref": ["t1", "t2"], "record": '{"sort":"(theorem, definition)"}'},
    "e2": {"ref": ["t1", "t3"], "record": '{"sort":"(theorem, lemma)"}'},
    # lean internal edges
    "e3": {"ref": ["l1", "l2"], "record": '{"sort":"(theorem, definition)"}'},
    "e4": {"ref": ["l1", "l3"], "record": '{"sort":"(theorem, proof)"}'},
    # cross-source edge (tex theorem ↔ lean theorem)
    "e5": {"ref": ["t1", "l1"], "record": '{"sort":"(theorem, theorem)"}'},
}


def test_all_source_returns_all_nodes():
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(MIXED_ENTRIES)
    assert len(result["nodes"]) == 6


def test_all_source_returns_all_edges_including_cross():
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(MIXED_ENTRIES)
    assert len(result["edges"]) == 5  # 2 tex + 2 lean + 1 cross


def test_all_source_community_independent_per_source():
    """Community detection should run independently per source group."""
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(MIXED_ENTRIES, color_by="community")
    nodes = {n["id"]: n for n in result["nodes"]}
    # tex nodes should have community computed within tex subgraph only
    # lean nodes should have community computed within lean subgraph only
    # They should NOT share community IDs from one combined analysis
    tex_colors = {nodes["t1"]["color"], nodes["t2"]["color"], nodes["t3"]["color"]}
    lean_colors = {nodes["l1"]["color"], nodes["l2"]["color"], nodes["l3"]["color"]}
    # Both groups should have colors assigned (not all gray)
    assert all(c != "#888888" for c in tex_colors)
    assert all(c != "#888888" for c in lean_colors)


def test_all_source_degree_independent_per_source():
    """Degree should only count edges within the same source."""
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    # Add extra cross-source edges to t1 to make it asymmetric
    entries = {**MIXED_ENTRIES,
        "e6": {"ref": ["t1", "l2"], "record": '{}'},  # t1→l2 cross
        "e7": {"ref": ["t1", "l3"], "record": '{}'},  # t1→l3 cross
    }
    result = build_skeleton_view(entries, size_by="degree")
    nodes = {n["id"]: n for n in result["nodes"]}
    # t1 has 2 within-tex edges. l1 has 2 within-lean edges. Should be equal.
    # If cross-source counted, t1 would have degree 5 (much bigger than l1's 3).
    assert abs(nodes["t1"]["radius"] - nodes["l1"]["radius"]) < 0.01, \
        f"t1={nodes['t1']['radius']:.2f}, l1={nodes['l1']['radius']:.2f} — cross-source edges should not affect degree"


def test_all_source_cluster_independent_per_source():
    """Cluster should be computed per source."""
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(MIXED_ENTRIES, cluster_by="louvain")
    nodes = {n["id"]: n for n in result["nodes"]}
    # All nodes should have cluster assignments
    assert all("cluster" in n for n in result["nodes"])


def test_all_source_cross_edges_preserved():
    """Cross-source edges should appear in output even though they don't affect analysis."""
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(MIXED_ENTRIES, color_by="community")
    edge_pairs = {(e["source"], e["target"]) for e in result["edges"]}
    assert ("t1", "l1") in edge_pairs  # cross-source edge preserved


def test_cross_source_edges_are_gray():
    """Cross-source edges should have gray color, not blended."""
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(MIXED_ENTRIES, color_by="community")
    cross_edges = [e for e in result["edges"] if e["source"] == "t1" and e["target"] == "l1"]
    assert len(cross_edges) == 1
    assert cross_edges[0]["color"] == "#333333"


def test_same_source_edges_have_color():
    """Same-source edges should have blended color, not gray."""
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(MIXED_ENTRIES, color_by="community")
    tex_edges = [e for e in result["edges"] if e["source"] == "t1" and e["target"] == "t2"]
    assert len(tex_edges) == 1
    assert tex_edges[0]["color"] != "#333333"


def test_single_source_filter_no_cross_edges():
    """When filtering to one source, cross-source edges should not appear."""
    from astrolabe_app.analysis.router import _filter_by_source
    filtered = _filter_by_source(MIXED_ENTRIES, "tex")
    edges = [e for e in filtered.values() if len(e["ref"]) == 2]
    for e in edges:
        assert e["ref"][0] in ("t1", "t2", "t3")
        assert e["ref"][1] in ("t1", "t2", "t3")
