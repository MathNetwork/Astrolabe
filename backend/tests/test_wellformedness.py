"""
Well-formedness validation tests (Paper Definition 2.2).

validate_store(data) checks all five conditions on a loaded astrolabe store.
"""
import pytest

from astrolabe_app.storage import validate_store


class TestValidStore:
    def test_valid_store_passes(self):
        data = {
            "a1": {"ref": ["a1"], "record": "atom one"},
            "a2": {"ref": ["a2"], "record": "atom two"},
            "e1": {"ref": ["a1", "a2"], "record": "edge"},
        }
        validate_store(data)  # should not raise

    def test_empty_store_passes(self):
        validate_store({})  # should not raise


class TestAtomSelfReference:
    def test_atom_ref_mismatch_raises(self):
        data = {"x": {"ref": ["y"], "record": "bad atom"}}
        with pytest.raises(ValueError, match="atom self-reference"):
            validate_store(data)


class TestIdentityUniqueness:
    def test_dict_keys_are_unique(self):
        """Python dicts enforce key uniqueness structurally."""
        data = {
            "a1": {"ref": ["a1"], "record": "first"},
            "a1": {"ref": ["a1"], "record": "second"},  # noqa: F601
        }
        # dict deduplicates; only one key survives
        assert len(data) == 1
        validate_store(data)  # should not raise


class TestReferentialClosure:
    def test_dangling_ref_raises(self):
        data = {
            "a1": {"ref": ["a1"], "record": "atom"},
            "e1": {"ref": ["a1", "missing"], "record": "edge"},
        }
        with pytest.raises(ValueError, match="referential closure"):
            validate_store(data)


class TestNonEmptyRef:
    def test_empty_ref_raises(self):
        data = {"x": {"ref": [], "record": "bad"}}
        with pytest.raises(ValueError, match="non-empty ref"):
            validate_store(data)


class TestDistinctRefs:
    def test_duplicate_refs_raises(self):
        data = {
            "a": {"ref": ["a"], "record": "atom"},
            "b": {"ref": ["b"], "record": "atom"},
            "dup": {"ref": ["a", "a", "b"], "record": "bad edge"},
        }
        with pytest.raises(ValueError, match="distinct refs"):
            validate_store(data)
