"""
Astrolabe file format validation tests.

astrolabe.json format:
{
  "<hash>": {
    "ref": ["<hash_0>", ...],   # ordered hash list, len >= 1
    "record": { ... }           # arbitrary key-value dict
  }
}

Rules:
- Every entry has "ref" (list[str], len >= 1) and "record" (dict)
- Atom: |ref| = 1, ref[0] == own hash
- degree = |ref| - 1
- Order matters: ref ["a","b"] != ["b","a"]
- Repetition allowed in ref (multiplicity)
"""
import pytest

from astrolabe.format import validate_astrolabe, validate_entry


# ── Valid data ──

SAMPLE = {
    "abc123": {
        "ref": ["abc123"],
        "record": {"name": "Nat.add_comm", "sort": "definition"},
    },
    "def456": {
        "ref": ["abc123", "ghi789"],
        "record": {"sort": "uses"},
    },
    "tri789": {
        "ref": ["abc123", "ghi789", "jkl012"],
        "record": {"sort": "proof_chain"},
    },
}


class TestValidFile:
    def test_sample_is_valid(self):
        assert validate_astrolabe(SAMPLE) is True

    def test_every_entry_has_ref_and_record(self):
        for h, entry in SAMPLE.items():
            assert validate_entry(h, entry) is True

    def test_empty_file_is_valid(self):
        assert validate_astrolabe({}) is True

    def test_atom_ref_equals_own_hash(self):
        atom = {"ref": ["abc123"], "record": {}}
        assert validate_entry("abc123", atom) is True

    def test_degree_0_atom(self):
        assert len(SAMPLE["abc123"]["ref"]) - 1 == 0

    def test_degree_1_edge(self):
        assert len(SAMPLE["def456"]["ref"]) - 1 == 1

    def test_degree_2_face(self):
        assert len(SAMPLE["tri789"]["ref"]) - 1 == 2

    def test_record_can_be_empty(self):
        data = {"x": {"ref": ["x"], "record": {}}}
        assert validate_astrolabe(data) is True

    def test_ref_allows_repetition(self):
        data = {"dup": {"ref": ["a", "a", "b"], "record": {}}}
        assert validate_entry("dup", data["dup"]) is True


class TestInvalidFile:
    def test_missing_ref(self):
        data = {"x": {"record": {}}}
        assert validate_astrolabe(data) is False

    def test_missing_record(self):
        data = {"x": {"ref": ["x"]}}
        assert validate_astrolabe(data) is False

    def test_ref_not_list(self):
        data = {"x": {"ref": "x", "record": {}}}
        assert validate_astrolabe(data) is False

    def test_ref_empty(self):
        data = {"x": {"ref": [], "record": {}}}
        assert validate_astrolabe(data) is False

    def test_record_not_dict(self):
        data = {"x": {"ref": ["x"], "record": "bad"}}
        assert validate_astrolabe(data) is False

    def test_ref_contains_non_string(self):
        data = {"x": {"ref": [123], "record": {}}}
        assert validate_astrolabe(data) is False

    def test_atom_ref_mismatch(self):
        """Atom (|ref|=1) must have ref[0] == own hash."""
        data = {"x": {"ref": ["y"], "record": {}}}
        assert validate_astrolabe(data) is False

    def test_top_level_not_dict(self):
        assert validate_astrolabe([]) is False

    def test_entry_not_dict(self):
        data = {"x": "not a dict"}
        assert validate_astrolabe(data) is False
