"""Tests for cluster assignment — TDD: write tests first."""

# Two clusters connected by bridge
CLUSTERED_ENTRIES = {
    "aaa": {"ref": ["aaa"], "record": '{"sort":"definition"}'},
    "bbb": {"ref": ["bbb"], "record": '{"sort":"definition"}'},
    "ccc": {"ref": ["ccc"], "record": '{"sort":"theorem"}'},
    "ddd": {"ref": ["ddd"], "record": '{"sort":"theorem"}'},
    "e1": {"ref": ["aaa", "bbb"], "record": '{}'},
    "e2": {"ref": ["bbb", "aaa"], "record": '{}'},
    "e3": {"ref": ["bbb", "ccc"], "record": '{}'},
    "e4": {"ref": ["ccc", "ddd"], "record": '{}'},
    "e5": {"ref": ["ddd", "ccc"], "record": '{}'},
}

SORT_ENTRIES = {
    "aaa": {"ref": ["aaa"], "record": '{"sort":"definition"}'},
    "bbb": {"ref": ["bbb"], "record": '{"sort":"definition"}'},
    "ccc": {"ref": ["ccc"], "record": '{"sort":"theorem"}'},
    "ddd": {"ref": ["ddd"], "record": '{"sort":"lemma"}'},
}


def test_cluster_louvain_returns_all_atoms():
    from astrolabe_app.analysis.cluster import compute_clusters
    result = compute_clusters(CLUSTERED_ENTRIES, "louvain")
    assert set(result.keys()) == {"aaa", "bbb", "ccc", "ddd"}


def test_cluster_louvain_groups():
    from astrolabe_app.analysis.cluster import compute_clusters
    result = compute_clusters(CLUSTERED_ENTRIES, "louvain")
    assert result["aaa"] == result["bbb"]
    assert result["ccc"] == result["ddd"]


def test_cluster_sort_groups_by_sort():
    from astrolabe_app.analysis.cluster import compute_clusters
    result = compute_clusters(SORT_ENTRIES, "sort")
    # aaa and bbb are both "definition" → same cluster
    assert result["aaa"] == result["bbb"]
    # ccc is "theorem" → different from aaa
    assert result["ccc"] != result["aaa"]
    # ddd is "lemma" → different from aaa and ccc
    assert result["ddd"] != result["aaa"]
    assert result["ddd"] != result["ccc"]


def test_cluster_stage():
    entries = {
        "aaa": {"ref": ["aaa"], "record": '{"sort":"definition"}'},
        "bbb": {"ref": ["bbb"], "record": '{"sort":"lemma"}'},
        "ccc": {"ref": ["ccc"], "record": '{"sort":"theorem"}'},
        "e1": {"ref": ["bbb", "aaa"], "record": '{}'},
        "e2": {"ref": ["ccc", "bbb"], "record": '{}'},
    }
    from astrolabe_app.analysis.cluster import compute_clusters
    result = compute_clusters(entries, "stage")
    # aaa is stage 0, bbb is stage 1, ccc is stage 2 → all different clusters
    assert result["aaa"] != result["bbb"]
    assert result["bbb"] != result["ccc"]


def test_cluster_empty():
    from astrolabe_app.analysis.cluster import compute_clusters
    result = compute_clusters({}, "louvain")
    assert result == {}


def test_cluster_unknown_method():
    from astrolabe_app.analysis.cluster import compute_clusters
    import pytest
    with pytest.raises(ValueError):
        compute_clusters(SORT_ENTRIES, "unknown_method")
