"""
Timestamp Functor tests (TDD).

Tests the timestamp functor's on_create, on_update, and invariants.
"""
from datetime import datetime, timezone

from astrolabe.functors.timestamp import on_create, on_update


class TestOnCreate:
    """on_create sets created_at and updated_at."""

    def test_sets_created_at(self):
        record = {}
        on_create(record)
        assert "created_at" in record

    def test_sets_updated_at(self):
        record = {}
        on_create(record)
        assert "updated_at" in record

    def test_created_at_is_iso_string(self):
        record = {}
        on_create(record)
        # Should parse as ISO datetime
        datetime.fromisoformat(record["created_at"])

    def test_updated_at_is_iso_string(self):
        record = {}
        on_create(record)
        datetime.fromisoformat(record["updated_at"])

    def test_created_at_equals_updated_at(self):
        """On creation, both timestamps are the same."""
        record = {}
        on_create(record)
        assert record["created_at"] == record["updated_at"]

    def test_does_not_overwrite_existing_created_at(self):
        """If created_at already exists, don't overwrite it."""
        record = {"created_at": "2020-01-01T00:00:00+00:00"}
        on_create(record)
        assert record["created_at"] == "2020-01-01T00:00:00+00:00"

    def test_does_not_overwrite_existing_updated_at(self):
        record = {"updated_at": "2020-01-01T00:00:00+00:00"}
        on_create(record)
        assert record["updated_at"] == "2020-01-01T00:00:00+00:00"

    def test_preserves_other_keys(self):
        record = {"name": "Test", "sort": "theorem"}
        on_create(record)
        assert record["name"] == "Test"
        assert record["sort"] == "theorem"

    def test_returns_same_dict(self):
        record = {}
        result = on_create(record)
        assert result is record

    def test_no_id_injected(self):
        """Timestamp functor does not touch id."""
        record = {}
        on_create(record)
        assert "id" not in record

    def test_no_extra_keys(self):
        """Only created_at and updated_at are added."""
        record = {}
        on_create(record)
        assert set(record.keys()) == {"created_at", "updated_at"}


class TestOnUpdate:
    """on_update sets updated_at only."""

    def test_sets_updated_at(self):
        record = {}
        on_update(record)
        assert "updated_at" in record

    def test_updated_at_is_iso_string(self):
        record = {}
        on_update(record)
        datetime.fromisoformat(record["updated_at"])

    def test_does_not_set_created_at(self):
        record = {}
        on_update(record)
        assert "created_at" not in record

    def test_overwrites_existing_updated_at(self):
        """on_update always overwrites updated_at."""
        record = {"updated_at": "2020-01-01T00:00:00+00:00"}
        on_update(record)
        assert record["updated_at"] != "2020-01-01T00:00:00+00:00"

    def test_preserves_created_at(self):
        record = {"created_at": "2020-01-01T00:00:00+00:00"}
        on_update(record)
        assert record["created_at"] == "2020-01-01T00:00:00+00:00"

    def test_preserves_other_keys(self):
        record = {"name": "X", "sort": "lemma"}
        on_update(record)
        assert record["name"] == "X"
        assert record["sort"] == "lemma"

    def test_returns_same_dict(self):
        record = {}
        result = on_update(record)
        assert result is record

    def test_updated_at_is_recent(self):
        """Timestamp should be within last second."""
        record = {}
        before = datetime.now(timezone.utc).isoformat()
        on_update(record)
        after = datetime.now(timezone.utc).isoformat()
        assert before <= record["updated_at"] <= after
