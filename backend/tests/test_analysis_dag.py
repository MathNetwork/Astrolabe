"""Tests for DAG analysis — TDD: write tests first."""

# Linear chain: aaa → bbb → ccc → ddd (edges point forward)
CHAIN_ENTRIES = {
    "aaa": {"ref": ["aaa"], "record": '{"sort":"definition"}'},
    "bbb": {"ref": ["bbb"], "record": '{"sort":"lemma"}'},
    "ccc": {"ref": ["ccc"], "record": '{"sort":"theorem"}'},
    "ddd": {"ref": ["ddd"], "record": '{"sort":"proof"}'},
    "e1": {"ref": ["aaa", "bbb"], "record": '{}'},
    "e2": {"ref": ["bbb", "ccc"], "record": '{}'},
    "e3": {"ref": ["ccc", "ddd"], "record": '{}'},
}

# Diamond: aaa → bbb, aaa → ccc, bbb → ddd, ccc → ddd
DIAMOND_ENTRIES = {
    "aaa": {"ref": ["aaa"], "record": '{"sort":"definition"}'},
    "bbb": {"ref": ["bbb"], "record": '{"sort":"lemma"}'},
    "ccc": {"ref": ["ccc"], "record": '{"sort":"lemma"}'},
    "ddd": {"ref": ["ddd"], "record": '{"sort":"theorem"}'},
    "e1": {"ref": ["aaa", "bbb"], "record": '{}'},
    "e2": {"ref": ["aaa", "ccc"], "record": '{}'},
    "e3": {"ref": ["bbb", "ddd"], "record": '{}'},
    "e4": {"ref": ["ccc", "ddd"], "record": '{}'},
}


def test_depth_chain():
    from astrolabe_app.analysis.dag import compute_dag_metric
    result = compute_dag_metric(CHAIN_ENTRIES, "depth")
    # aaa is root (depth 0), bbb=1, ccc=2, ddd=3
    assert result["aaa"] == 0
    assert result["bbb"] == 1
    assert result["ccc"] == 2
    assert result["ddd"] == 3


def test_depth_diamond():
    from astrolabe_app.analysis.dag import compute_dag_metric
    result = compute_dag_metric(DIAMOND_ENTRIES, "depth")
    assert result["aaa"] == 0
    assert result["bbb"] == 1
    assert result["ccc"] == 1
    assert result["ddd"] == 2


def test_reachability_chain():
    from astrolabe_app.analysis.dag import compute_dag_metric
    result = compute_dag_metric(CHAIN_ENTRIES, "reachability")
    # aaa can reach bbb, ccc, ddd = 3
    assert result["aaa"] == 3
    assert result["bbb"] == 2
    assert result["ccc"] == 1
    assert result["ddd"] == 0


def test_reachability_diamond():
    from astrolabe_app.analysis.dag import compute_dag_metric
    result = compute_dag_metric(DIAMOND_ENTRIES, "reachability")
    assert result["aaa"] == 3
    assert result["ddd"] == 0


def test_dag_empty():
    from astrolabe_app.analysis.dag import compute_dag_metric
    result = compute_dag_metric({}, "depth")
    assert result == {}
