"""Tests for the Entry dataclass.

TDD: written BEFORE implementation.
"""
import pytest
from astrolabe.entry import Entry


class TestEntryBasic:
    def test_create_entry(self):
        e = Entry(hash="abc123", ref=("abc123",), record="some text")
        assert e.hash == "abc123"
        assert e.ref == ("abc123",)
        assert e.record == "some text"

    def test_degree_self_ref(self):
        e = Entry(hash="abc123", ref=("abc123",), record="text")
        assert e.degree == 0

    def test_degree_binary(self):
        e = Entry(hash="abc123", ref=("aaa", "bbb"), record="text")
        assert e.degree == 1

    def test_degree_ternary(self):
        e = Entry(hash="abc123", ref=("aaa", "bbb", "ccc"), record="text")
        assert e.degree == 2

    def test_is_self_referencing(self):
        e1 = Entry(hash="abc123", ref=("abc123",), record="text")
        assert e1.is_self_referencing is True
        e2 = Entry(hash="abc123", ref=("aaa", "bbb"), record="text")
        assert e2.is_self_referencing is False


class TestEntryImmutable:
    def test_cannot_change_hash(self):
        e = Entry(hash="abc123", ref=("abc123",), record="text")
        with pytest.raises(AttributeError):
            e.hash = "new_hash"

    def test_cannot_change_ref(self):
        e = Entry(hash="abc123", ref=("abc123",), record="text")
        with pytest.raises(AttributeError):
            e.ref = ("other",)

    def test_cannot_change_record(self):
        e = Entry(hash="abc123", ref=("abc123",), record="text")
        with pytest.raises(AttributeError):
            e.record = "new text"

    def test_ref_is_tuple(self):
        e = Entry(hash="abc123", ref=("aaa", "bbb"), record="text")
        assert isinstance(e.ref, tuple)


class TestEntryEquality:
    def test_same_content_equal(self):
        e1 = Entry(hash="abc123", ref=("abc123",), record="text")
        e2 = Entry(hash="abc123", ref=("abc123",), record="text")
        assert e1 == e2

    def test_different_hash_not_equal(self):
        e1 = Entry(hash="abc123", ref=("abc123",), record="text")
        e2 = Entry(hash="def456", ref=("def456",), record="text")
        assert e1 != e2

    def test_hashable(self):
        e1 = Entry(hash="abc123", ref=("abc123",), record="text")
        e2 = Entry(hash="def456", ref=("def456",), record="text")
        s = {e1, e2}
        assert len(s) == 2
