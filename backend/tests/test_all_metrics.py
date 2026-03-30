"""Test every Size/Color/Cluster option actually works end-to-end."""
import pytest

ENTRIES = {
    "aaa": {"ref": ["aaa"], "record": '{"sort":"theorem","source":"tex","title":"T1"}'},
    "bbb": {"ref": ["bbb"], "record": '{"sort":"definition","source":"tex","title":"D1"}'},
    "ccc": {"ref": ["ccc"], "record": '{"sort":"lemma","source":"tex","title":"L1"}'},
    "ddd": {"ref": ["ddd"], "record": '{"sort":"proof","source":"tex","title":"P1"}'},
    "e1": {"ref": ["aaa", "bbb"], "record": '{}'},
    "e2": {"ref": ["aaa", "ccc"], "record": '{}'},
    "e3": {"ref": ["ccc", "bbb"], "record": '{}'},
    "e4": {"ref": ["ccc", "ddd"], "record": '{}'},
}

SIZE_OPTIONS = ['uniform', 'degree', 'in-degree', 'out-degree', 'pagerank', 'betweenness', 'katz', 'hub', 'authority', 'depth', 'reachability']
COLOR_OPTIONS = ['sort', 'community', 'layer', 'pagerank', 'depth', 'spectral', 'curvature']
CLUSTER_OPTIONS = ['none', 'louvain', 'sort', 'source', 'stage', 'spectral', 'curvature']


@pytest.mark.parametrize("size_by", SIZE_OPTIONS)
def test_size_option(size_by):
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(ENTRIES, size_by=size_by)
    assert len(result["nodes"]) == 4
    for n in result["nodes"]:
        assert isinstance(n["radius"], (int, float)), f"size_by={size_by}: radius not number"
        assert n["radius"] > 0, f"size_by={size_by}: radius <= 0"


@pytest.mark.parametrize("color_by", COLOR_OPTIONS)
def test_color_option(color_by):
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(ENTRIES, color_by=color_by)
    assert len(result["nodes"]) == 4
    for n in result["nodes"]:
        assert isinstance(n["color"], str), f"color_by={color_by}: color not string"
        assert n["color"].startswith("#"), f"color_by={color_by}: color not hex"


@pytest.mark.parametrize("cluster_by", CLUSTER_OPTIONS)
def test_cluster_option(cluster_by):
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(ENTRIES, cluster_by=cluster_by)
    assert len(result["nodes"]) == 4
    if cluster_by == "none":
        assert all("cluster" not in n for n in result["nodes"])
    else:
        assert all("cluster" in n for n in result["nodes"]), f"cluster_by={cluster_by}: missing cluster"


@pytest.mark.parametrize("size_by", SIZE_OPTIONS)
@pytest.mark.parametrize("color_by", COLOR_OPTIONS)
def test_size_color_combo(size_by, color_by):
    """Every size × color combination should work."""
    from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
    result = build_skeleton_view(ENTRIES, size_by=size_by, color_by=color_by)
    assert len(result["nodes"]) == 4
    assert len(result["edges"]) == 4
