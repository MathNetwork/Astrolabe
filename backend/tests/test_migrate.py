"""
Migration tests: signature.json (obj/mor) → astrolabe.json (ref/record).
"""
import pytest

from astrolabe.migrate import migrate_signature
from astrolabe.format import validate_astrolabe

SIGNATURE = {
    "obj": {
        "abc123": {"name": "Nat.add_comm", "sort": "definition", "statement": "a + b = b + a"},
        "ghi789": {"name": "Nat.zero_add", "sort": "definition"},
    },
    "mor": {
        "def456": {"source": "abc123", "target": "ghi789", "sort": "uses"},
    },
}


class TestMigrateCount:
    def test_total_entries(self):
        result = migrate_signature(SIGNATURE)
        assert len(result) == 3  # 2 obj + 1 mor

    def test_atom_count(self):
        result = migrate_signature(SIGNATURE)
        atoms = {h: e for h, e in result.items() if len(e["ref"]) == 1}
        assert len(atoms) == 2

    def test_edge_count(self):
        result = migrate_signature(SIGNATURE)
        edges = {h: e for h, e in result.items() if len(e["ref"]) == 2}
        assert len(edges) == 1


class TestMigrateAtom:
    def test_atom_ref_is_self(self):
        result = migrate_signature(SIGNATURE)
        assert result["abc123"]["ref"] == ["abc123"]
        assert result["ghi789"]["ref"] == ["ghi789"]

    def test_atom_record_preserves_name(self):
        result = migrate_signature(SIGNATURE)
        assert result["abc123"]["record"]["name"] == "Nat.add_comm"

    def test_atom_record_preserves_sort(self):
        result = migrate_signature(SIGNATURE)
        assert result["abc123"]["record"]["sort"] == "definition"

    def test_atom_record_preserves_statement(self):
        result = migrate_signature(SIGNATURE)
        assert result["abc123"]["record"]["statement"] == "a + b = b + a"

    def test_atom_record_no_id(self):
        """id is the key, not in record."""
        result = migrate_signature(SIGNATURE)
        assert "id" not in result["abc123"]["record"]


class TestMigrateMor:
    def test_mor_ref_is_source_target(self):
        result = migrate_signature(SIGNATURE)
        assert result["def456"]["ref"] == ["abc123", "ghi789"]

    def test_mor_record_no_source_target(self):
        result = migrate_signature(SIGNATURE)
        assert "source" not in result["def456"]["record"]
        assert "target" not in result["def456"]["record"]

    def test_mor_record_preserves_sort(self):
        result = migrate_signature(SIGNATURE)
        assert result["def456"]["record"]["sort"] == "uses"

    def test_mor_record_no_id(self):
        result = migrate_signature(SIGNATURE)
        assert "id" not in result["def456"]["record"]


class TestMigrateValidity:
    def test_output_is_valid_astrolabe(self):
        result = migrate_signature(SIGNATURE)
        assert validate_astrolabe(result) is True

    def test_empty_signature(self):
        result = migrate_signature({"obj": {}, "mor": {}})
        assert result == {}
        assert validate_astrolabe(result) is True

    def test_obj_only(self):
        result = migrate_signature({"obj": {"a": {"name": "x"}}, "mor": {}})
        assert len(result) == 1
        assert result["a"]["ref"] == ["a"]

    def test_legacy_missing_keys(self):
        """Handle signature with missing obj or mor keys."""
        result = migrate_signature({})
        assert result == {}
