"""
AstrolabeStorage tests: CRUD + degree/atoms/k_forms.
"""
import json
import pytest

from astrolabe.storage import AstrolabeStorage


@pytest.fixture
def store(tmp_path):
    data = {
        "a1": {"ref": ["a1"], "record": {"name": "alpha"}},
        "a2": {"ref": ["a2"], "record": {"name": "beta"}},
        "a3": {"ref": ["a3"], "record": {"name": "gamma"}},
        "e1": {"ref": ["a1", "a2"], "record": {"sort": "uses"}},
        "f1": {"ref": ["a1", "a2", "a3"], "record": {"sort": "chain"}},
    }
    p = tmp_path / ".astrolabe"
    p.mkdir()
    (p / "astrolabe.json").write_text(json.dumps(data), encoding="utf-8")
    return AstrolabeStorage(str(tmp_path))


class TestLoad:
    def test_load_count(self, store):
        assert len(store.all_entries()) == 5

    def test_load_empty(self, tmp_path):
        """No file → empty data."""
        s = AstrolabeStorage(str(tmp_path))
        assert s.all_entries() == {}


class TestGet:
    def test_get_existing(self, store):
        entry = store.get("a1")
        assert entry is not None
        assert entry["record"]["name"] == "alpha"

    def test_get_missing(self, store):
        assert store.get("nonexistent") is None

    def test_get_preserves_ref(self, store):
        assert store.get("e1")["ref"] == ["a1", "a2"]


class TestPut:
    def test_put_new(self, store):
        store.put("new1", ["a1", "a2"], {"sort": "new"})
        entry = store.get("new1")
        assert entry is not None
        assert entry["ref"] == ["a1", "a2"]
        assert entry["record"]["sort"] == "new"

    def test_put_overwrites(self, store):
        store.put("a1", ["a1"], {"name": "overwritten"})
        assert store.get("a1")["record"]["name"] == "overwritten"

    def test_put_persists(self, store):
        store.put("new1", ["a1", "a2"], {"sort": "new"})
        # Re-read from disk
        raw = json.loads(store.path.read_text(encoding="utf-8"))
        assert "new1" in raw


class TestDelete:
    def test_delete_existing(self, store):
        store.delete("e1")
        assert store.get("e1") is None
        assert len(store.all_entries()) == 4

    def test_delete_missing(self, store):
        """Deleting nonexistent key is a no-op."""
        store.delete("nonexistent")
        assert len(store.all_entries()) == 5

    def test_delete_persists(self, store):
        store.delete("e1")
        raw = json.loads(store.path.read_text(encoding="utf-8"))
        assert "e1" not in raw


class TestDegree:
    def test_atom_degree_0(self, store):
        assert store.degree("a1") == 0

    def test_edge_degree_1(self, store):
        assert store.degree("e1") == 1

    def test_face_degree_2(self, store):
        assert store.degree("f1") == 2

    def test_missing_raises(self, store):
        with pytest.raises(KeyError):
            store.degree("nonexistent")


class TestAtoms:
    def test_atoms(self, store):
        atoms = store.atoms()
        assert set(atoms.keys()) == {"a1", "a2", "a3"}

    def test_atoms_have_degree_0(self, store):
        for h in store.atoms():
            assert store.degree(h) == 0


class TestKForms:
    def test_k_forms_0(self, store):
        assert set(store.k_forms(0).keys()) == {"a1", "a2", "a3"}

    def test_k_forms_1(self, store):
        assert set(store.k_forms(1).keys()) == {"e1"}

    def test_k_forms_2(self, store):
        assert set(store.k_forms(2).keys()) == {"f1"}

    def test_k_forms_empty(self, store):
        assert store.k_forms(3) == {}
