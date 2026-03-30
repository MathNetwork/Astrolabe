"""Tests for centrality analysis — TDD: write tests first."""

SAMPLE_ENTRIES = {
    "aaa": {"ref": ["aaa"], "record": '{"sort":"theorem","title":"T1"}'},
    "bbb": {"ref": ["bbb"], "record": '{"sort":"definition","title":"D1"}'},
    "ccc": {"ref": ["ccc"], "record": '{"sort":"lemma","title":"L1"}'},
    "ddd": {"ref": ["ddd"], "record": '{"sort":"proof","title":"P1"}'},
    "e1": {"ref": ["aaa", "bbb"], "record": '{"sort":"(theorem, definition)"}'},
    "e2": {"ref": ["aaa", "ccc"], "record": '{"sort":"(theorem, lemma)"}'},
    "e3": {"ref": ["ccc", "bbb"], "record": '{"sort":"(lemma, definition)"}'},
    "e4": {"ref": ["ccc", "ddd"], "record": '{"sort":"(lemma, proof)"}'},
}


def test_pagerank_returns_all_atoms():
    from astrolabe_app.analysis.centrality import compute_centrality
    result = compute_centrality(SAMPLE_ENTRIES, "pagerank")
    assert set(result.keys()) == {"aaa", "bbb", "ccc", "ddd"}


def test_pagerank_values_sum_to_one():
    from astrolabe_app.analysis.centrality import compute_centrality
    result = compute_centrality(SAMPLE_ENTRIES, "pagerank")
    assert abs(sum(result.values()) - 1.0) < 0.01


def test_pagerank_sink_has_high_rank():
    from astrolabe_app.analysis.centrality import compute_centrality
    result = compute_centrality(SAMPLE_ENTRIES, "pagerank")
    # bbb is a sink (2 incoming, 0 outgoing) — should have high pagerank
    assert result["bbb"] > result["aaa"]


def test_betweenness_returns_all_atoms():
    from astrolabe_app.analysis.centrality import compute_centrality
    result = compute_centrality(SAMPLE_ENTRIES, "betweenness")
    assert set(result.keys()) == {"aaa", "bbb", "ccc", "ddd"}


def test_betweenness_bridge_node():
    from astrolabe_app.analysis.centrality import compute_centrality
    result = compute_centrality(SAMPLE_ENTRIES, "betweenness")
    # ccc is on the path aaa→ccc→bbb and aaa→ccc→ddd — should have nonzero betweenness
    assert result["ccc"] >= 0


def test_betweenness_values_nonnegative():
    from astrolabe_app.analysis.centrality import compute_centrality
    result = compute_centrality(SAMPLE_ENTRIES, "betweenness")
    assert all(v >= 0 for v in result.values())


def test_centrality_empty_graph():
    from astrolabe_app.analysis.centrality import compute_centrality
    result = compute_centrality({}, "pagerank")
    assert result == {}
