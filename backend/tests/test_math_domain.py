"""
Math Domain Functor tests (TDD).

Tests the math_domain functor's defaults, validation, and invariants.
"""
import pytest

from astrolabe.functors.math_domain import (
    OBJ_DEFAULTS,
    MOR_DEFAULTS,
    VALID_STATUSES,
    apply_obj_defaults,
    apply_mor_defaults,
    validate_obj,
)


class TestObjDefaults:
    """OBJ_DEFAULTS must contain exactly the expected keys."""

    def test_obj_defaults_has_name(self):
        assert "name" in OBJ_DEFAULTS

    def test_obj_defaults_has_sort(self):
        assert "sort" in OBJ_DEFAULTS

    def test_obj_defaults_has_status(self):
        assert "status" in OBJ_DEFAULTS

    def test_obj_defaults_has_statement(self):
        assert "statement" in OBJ_DEFAULTS

    def test_obj_defaults_has_proof(self):
        assert "proof" in OBJ_DEFAULTS

    def test_obj_defaults_has_notes(self):
        assert "notes" in OBJ_DEFAULTS

    def test_obj_defaults_no_intuition(self):
        """intuition is not a math domain field."""
        assert "intuition" not in OBJ_DEFAULTS

    def test_obj_defaults_no_id(self):
        """id is managed by signature_storage, not by functors."""
        assert "id" not in OBJ_DEFAULTS

    def test_obj_defaults_no_position(self):
        """position is not a math domain field."""
        assert "position" not in OBJ_DEFAULTS

    def test_obj_defaults_no_created_at(self):
        """timestamps are managed by timestamp functor."""
        assert "created_at" not in OBJ_DEFAULTS
        assert "updated_at" not in OBJ_DEFAULTS

    def test_obj_defaults_exact_keys(self):
        """OBJ_DEFAULTS contains exactly these keys, no more."""
        assert set(OBJ_DEFAULTS.keys()) == {
            "name", "sort", "status", "statement", "proof", "notes"
        }


class TestMorDefaults:
    """MOR_DEFAULTS must contain exactly the expected keys."""

    def test_mor_defaults_has_strict(self):
        assert "strict" in MOR_DEFAULTS

    def test_mor_defaults_has_label(self):
        assert "label" in MOR_DEFAULTS

    def test_mor_defaults_has_notes(self):
        assert "notes" in MOR_DEFAULTS

    def test_mor_defaults_no_id(self):
        assert "id" not in MOR_DEFAULTS

    def test_mor_defaults_no_source_target(self):
        """source/target are structural, managed by signature_storage."""
        assert "source" not in MOR_DEFAULTS
        assert "target" not in MOR_DEFAULTS

    def test_mor_defaults_exact_keys(self):
        assert set(MOR_DEFAULTS.keys()) == {"strict", "label", "notes"}


class TestApplyObjDefaults:
    """apply_obj_defaults fills missing keys without overwriting."""

    def test_fills_missing_keys(self):
        obj = {}
        apply_obj_defaults(obj)
        for key in OBJ_DEFAULTS:
            assert key in obj

    def test_does_not_overwrite_existing(self):
        obj = {"name": "My Theorem", "sort": "theorem"}
        apply_obj_defaults(obj)
        assert obj["name"] == "My Theorem"
        assert obj["sort"] == "theorem"

    def test_fills_only_missing(self):
        obj = {"name": "X"}
        apply_obj_defaults(obj)
        assert obj["name"] == "X"
        assert obj["sort"] == "insight"  # filled
        assert obj["statement"] == ""  # filled

    def test_preserves_extra_keys(self):
        """Functor must not strip user-defined keys."""
        obj = {"custom_field": "hello"}
        apply_obj_defaults(obj)
        assert obj["custom_field"] == "hello"

    def test_returns_same_dict(self):
        obj = {}
        result = apply_obj_defaults(obj)
        assert result is obj


class TestApplyMorDefaults:
    """apply_mor_defaults fills missing keys without overwriting."""

    def test_fills_missing_keys(self):
        mor = {}
        apply_mor_defaults(mor)
        for key in MOR_DEFAULTS:
            assert key in mor

    def test_does_not_overwrite_existing(self):
        mor = {"strict": False, "label": "depends on"}
        apply_mor_defaults(mor)
        assert mor["strict"] is False
        assert mor["label"] == "depends on"

    def test_preserves_extra_keys(self):
        mor = {"custom": 42}
        apply_mor_defaults(mor)
        assert mor["custom"] == 42


class TestValidateObj:
    """validate_obj checks math domain constraints."""

    def test_valid_status_stated(self):
        validate_obj({"status": "stated"})

    def test_valid_status_proven(self):
        validate_obj({"status": "proven"})

    def test_valid_status_wip(self):
        validate_obj({"status": "wip"})

    def test_valid_status_review(self):
        validate_obj({"status": "review"})

    def test_valid_status_open(self):
        validate_obj({"status": "open"})

    def test_invalid_status_raises(self):
        with pytest.raises(ValueError, match="Invalid status"):
            validate_obj({"status": "invalid"})

    def test_no_status_is_valid(self):
        """Missing status is ok (field-agnostic)."""
        validate_obj({})

    def test_none_status_is_valid(self):
        validate_obj({"status": None})

    def test_all_valid_statuses_covered(self):
        assert VALID_STATUSES == {"stated", "proven", "wip", "review", "open"}
