"""
Multiplicity profile tests (Definition 2.16).

μ(σ)(h) = number of times h appears in ref(σ).
sum(μ(σ)) = |ref(σ)|.
"""
import json
import pytest

from astrolabe.storage import AstrolabeStorage


@pytest.fixture
def profile_store(tmp_path):
    data = {
        "a": {"ref": ["a"], "record": {}},
        "b": {"ref": ["b"], "record": {}},
        "c": {"ref": ["c"], "record": {}},
        "e1": {"ref": ["a", "b"], "record": {}},
        "e2": {"ref": ["b", "a"], "record": {}},
        "dup": {"ref": ["a", "a", "b"], "record": {}},
        "triple": {"ref": ["a", "a", "a"], "record": {}},
    }
    p = tmp_path / ".astrolabe"
    p.mkdir()
    (p / "astrolabe.json").write_text(json.dumps(data), encoding="utf-8")
    return AstrolabeStorage(str(tmp_path))


class TestProfile:
    def test_atom_profile(self, profile_store):
        assert profile_store.profile("a") == {"a": 1}

    def test_edge_profile(self, profile_store):
        assert profile_store.profile("e1") == {"a": 1, "b": 1}

    def test_different_order_same_profile(self, profile_store):
        """[a,b] and [b,a] have the same profile."""
        p1 = profile_store.profile("e1")
        p2 = profile_store.profile("e2")
        assert p1 == p2

    def test_profile_with_repetition(self, profile_store):
        assert profile_store.profile("dup") == {"a": 2, "b": 1}

    def test_profile_all_same(self, profile_store):
        assert profile_store.profile("triple") == {"a": 3}

    def test_profile_sum_equals_ref_length(self, profile_store):
        for h in profile_store.all_entries():
            p = profile_store.profile(h)
            entry = profile_store.get(h)
            assert sum(p.values()) == len(entry["ref"])

    def test_profile_missing_raises(self, profile_store):
        with pytest.raises(KeyError):
            profile_store.profile("nonexistent")
