"""Tests for community detection — TDD: write tests first."""

# Two clusters connected by one bridge
# Cluster A: aaa ↔ bbb
# Cluster B: ccc ↔ ddd
# Bridge: bbb → ccc
CLUSTERED_ENTRIES = {
    "aaa": {"ref": ["aaa"], "record": '{"sort":"definition"}'},
    "bbb": {"ref": ["bbb"], "record": '{"sort":"lemma"}'},
    "ccc": {"ref": ["ccc"], "record": '{"sort":"theorem"}'},
    "ddd": {"ref": ["ddd"], "record": '{"sort":"proof"}'},
    "e1": {"ref": ["aaa", "bbb"], "record": '{}'},
    "e2": {"ref": ["bbb", "aaa"], "record": '{}'},
    "e3": {"ref": ["bbb", "ccc"], "record": '{}'},
    "e4": {"ref": ["ccc", "ddd"], "record": '{}'},
    "e5": {"ref": ["ddd", "ccc"], "record": '{}'},
}


def test_community_returns_all_atoms():
    from astrolabe_app.analysis.community import detect_communities
    result = detect_communities(CLUSTERED_ENTRIES)
    assert set(result.keys()) == {"aaa", "bbb", "ccc", "ddd"}


def test_community_values_are_ints():
    from astrolabe_app.analysis.community import detect_communities
    result = detect_communities(CLUSTERED_ENTRIES)
    assert all(isinstance(v, int) for v in result.values())


def test_community_finds_clusters():
    from astrolabe_app.analysis.community import detect_communities
    result = detect_communities(CLUSTERED_ENTRIES)
    # aaa and bbb should be in the same community
    assert result["aaa"] == result["bbb"]
    # ccc and ddd should be in the same community
    assert result["ccc"] == result["ddd"]


def test_community_two_groups():
    from astrolabe_app.analysis.community import detect_communities
    result = detect_communities(CLUSTERED_ENTRIES)
    unique = set(result.values())
    assert len(unique) >= 2


def test_community_empty():
    from astrolabe_app.analysis.community import detect_communities
    result = detect_communities({})
    assert result == {}


def test_community_single_node():
    entries = {"aaa": {"ref": ["aaa"], "record": '{"sort":"definition"}'}}
    from astrolabe_app.analysis.community import detect_communities
    result = detect_communities(entries)
    assert result == {"aaa": 0}
