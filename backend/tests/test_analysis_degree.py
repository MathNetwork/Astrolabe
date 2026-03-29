"""Tests for degree analysis — TDD: write tests first."""
import pytest

SAMPLE_ENTRIES = {
    "aaa": {"ref": ["aaa"], "record": '{"sort":"theorem","title":"T1"}'},
    "bbb": {"ref": ["bbb"], "record": '{"sort":"definition","title":"D1"}'},
    "ccc": {"ref": ["ccc"], "record": '{"sort":"lemma","title":"L1"}'},
    "ddd": {"ref": ["ddd"], "record": '{"sort":"proof","title":"P1"}'},
    "e1": {"ref": ["aaa", "bbb"], "record": '{"sort":"(theorem, definition)"}'},
    "e2": {"ref": ["aaa", "ccc"], "record": '{"sort":"(theorem, lemma)"}'},
    "e3": {"ref": ["aaa", "ddd"], "record": '{"sort":"(theorem, proof)"}'},
    "e4": {"ref": ["ccc", "bbb"], "record": '{"sort":"(lemma, definition)"}'},
}


def test_degree_total():
    from astrolabe_app.analysis.degree import compute_degree
    result = compute_degree(SAMPLE_ENTRIES, "total")
    # aaa: 3 out, 0 in = 3 total
    assert result["aaa"] == 3
    # bbb: 0 out, 2 in = 2 total
    assert result["bbb"] == 2
    # ccc: 1 out, 1 in = 2 total
    assert result["ccc"] == 2
    # ddd: 0 out, 1 in = 1 total
    assert result["ddd"] == 1


def test_degree_in():
    from astrolabe_app.analysis.degree import compute_degree
    result = compute_degree(SAMPLE_ENTRIES, "in")
    assert result["aaa"] == 0
    assert result["bbb"] == 2
    assert result["ccc"] == 1
    assert result["ddd"] == 1


def test_degree_out():
    from astrolabe_app.analysis.degree import compute_degree
    result = compute_degree(SAMPLE_ENTRIES, "out")
    assert result["aaa"] == 3
    assert result["bbb"] == 0
    assert result["ccc"] == 1
    assert result["ddd"] == 0


def test_degree_returns_only_atoms():
    from astrolabe_app.analysis.degree import compute_degree
    result = compute_degree(SAMPLE_ENTRIES, "total")
    # Should only contain atom hashes, not edge hashes
    assert "e1" not in result
    assert "e2" not in result
    assert len(result) == 4
