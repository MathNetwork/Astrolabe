"""
CRUD tests for POST /api/astrolabe/entries, PATCH, DELETE with cascade.
Unified create_entry API: ref determines atom vs edge vs higher-simplex.
"""
import json
import pytest
from fastapi.testclient import TestClient

from astrolabe.server import app


@pytest.fixture
def empty_project(tmp_path):
    """Empty project with no data."""
    p = tmp_path / ".astrolabe"
    p.mkdir()
    (p / "astrolabe.json").write_text("{}", encoding="utf-8")
    return str(tmp_path)


@pytest.fixture
def seeded_project(tmp_path):
    """Project with two atoms and one edge."""
    data = {
        "a1": {"ref": ["a1"], "record": {"name": "Alpha", "sort": "definition"}},
        "a2": {"ref": ["a2"], "record": {"name": "Beta", "sort": "theorem"}},
        "e1": {"ref": ["a1", "a2"], "record": {"sort": "uses"}},
    }
    p = tmp_path / ".astrolabe"
    p.mkdir()
    (p / "astrolabe.json").write_text(json.dumps(data), encoding="utf-8")
    return str(tmp_path)


@pytest.fixture
def client():
    return TestClient(app)


class TestCreateAtom:
    def test_create_atom_with_self_ref(self, client, empty_project):
        """ref=["__self__"] creates atom with ref=[generated_id]."""
        r = client.post(
            f"/api/astrolabe/entries?path={empty_project}",
            json={"ref": ["__self__"], "record": {"name": "X", "sort": "definition"}},
        )
        assert r.status_code == 201
        data = r.json()
        assert "id" in data
        assert "entry" in data
        hid = data["id"]
        assert len(hid) == 12
        assert data["entry"]["ref"] == [hid]
        assert data["entry"]["record"]["name"] == "X"

    def test_atom_persisted(self, client, empty_project):
        r = client.post(
            f"/api/astrolabe/entries?path={empty_project}",
            json={"ref": ["__self__"], "record": {"name": "Y", "sort": "theorem"}},
        )
        hid = r.json()["id"]
        r2 = client.get(f"/api/astrolabe/entries/{hid}?path={empty_project}")
        assert r2.status_code == 200
        assert r2.json()["record"]["name"] == "Y"


class TestCreateEdge:
    def test_create_edge(self, client, seeded_project):
        r = client.post(
            f"/api/astrolabe/entries?path={seeded_project}",
            json={"ref": ["a1", "a2"], "record": {"sort": "implies"}},
        )
        assert r.status_code == 201
        data = r.json()
        assert data["entry"]["ref"] == ["a1", "a2"]
        assert data["entry"]["record"]["sort"] == "implies"

    def test_ref_nonexistent_source_returns_400(self, client, seeded_project):
        r = client.post(
            f"/api/astrolabe/entries?path={seeded_project}",
            json={"ref": ["nonexistent", "a2"], "record": {}},
        )
        assert r.status_code == 400

    def test_ref_nonexistent_target_returns_400(self, client, seeded_project):
        r = client.post(
            f"/api/astrolabe/entries?path={seeded_project}",
            json={"ref": ["a1", "nonexistent"], "record": {}},
        )
        assert r.status_code == 400

    def test_empty_ref_returns_400(self, client, empty_project):
        r = client.post(
            f"/api/astrolabe/entries?path={empty_project}",
            json={"ref": [], "record": {"name": "X"}},
        )
        assert r.status_code == 400

    def test_single_nonexistent_ref_returns_400(self, client, empty_project):
        """ref=[不存在的hash]（单个非自指）→ 400。"""
        r = client.post(
            f"/api/astrolabe/entries?path={empty_project}",
            json={"ref": ["nonexistent"], "record": {"name": "X"}},
        )
        assert r.status_code == 400

    def test_ref_second_nonexistent_returns_400(self, client, seeded_project):
        """ref=[存在, 不存在] → 400。"""
        r = client.post(
            f"/api/astrolabe/entries?path={seeded_project}",
            json={"ref": ["a1", "nonexistent"], "record": {}},
        )
        assert r.status_code == 400

    def test_ref_first_nonexistent_returns_400(self, client, seeded_project):
        """ref=[不存在, 存在] → 400。"""
        r = client.post(
            f"/api/astrolabe/entries?path={seeded_project}",
            json={"ref": ["nonexistent", "a2"], "record": {}},
        )
        assert r.status_code == 400

    def test_triple_with_one_nonexistent_returns_400(self, client, seeded_project):
        """ref=[存在, 存在, 不存在] → 400。"""
        r = client.post(
            f"/api/astrolabe/entries?path={seeded_project}",
            json={"ref": ["a1", "a2", "nonexistent"], "record": {}},
        )
        assert r.status_code == 400


class TestSelfRefBoundary:
    """__self__ 只允许 ref == ["__self__"]，其他用法一律 400。"""

    def test_double_self_returns_400(self, client, empty_project):
        r = client.post(
            f"/api/astrolabe/entries?path={empty_project}",
            json={"ref": ["__self__", "__self__"], "record": {"name": "X"}},
        )
        assert r.status_code == 400

    def test_self_with_existing_returns_400(self, client, seeded_project):
        r = client.post(
            f"/api/astrolabe/entries?path={seeded_project}",
            json={"ref": ["__self__", "a1"], "record": {}},
        )
        assert r.status_code == 400

    def test_existing_with_self_returns_400(self, client, seeded_project):
        r = client.post(
            f"/api/astrolabe/entries?path={seeded_project}",
            json={"ref": ["a1", "__self__"], "record": {}},
        )
        assert r.status_code == 400

    def test_self_in_triple_returns_400(self, client, seeded_project):
        r = client.post(
            f"/api/astrolabe/entries?path={seeded_project}",
            json={"ref": ["__self__", "a1", "a2"], "record": {}},
        )
        assert r.status_code == 400


class TestCreateHigherSimplex:
    def test_create_3_simplex(self, client, seeded_project):
        """ref with 3 existing atoms creates a 2-form (triangle)."""
        # Add a third atom first
        r0 = client.post(
            f"/api/astrolabe/entries?path={seeded_project}",
            json={"ref": ["__self__"], "record": {"name": "Gamma", "sort": "lemma"}},
        )
        a3 = r0.json()["id"]

        r = client.post(
            f"/api/astrolabe/entries?path={seeded_project}",
            json={"ref": ["a1", "a2", a3], "record": {"sort": "triangle"}},
        )
        assert r.status_code == 201
        assert len(r.json()["entry"]["ref"]) == 3


class TestUpdateRecord:
    def test_patch_merges_record(self, client, seeded_project):
        r = client.patch(
            f"/api/astrolabe/entries/a1?path={seeded_project}",
            json={"statement": "For all x..."},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["entry"]["record"]["statement"] == "For all x..."
        assert data["entry"]["record"]["name"] == "Alpha"
        assert data["entry"]["record"]["sort"] == "definition"

    def test_patch_nonexistent_returns_404(self, client, seeded_project):
        r = client.patch(
            f"/api/astrolabe/entries/nonexistent?path={seeded_project}",
            json={"name": "X"},
        )
        assert r.status_code == 404


class TestDeleteCascade:
    def test_delete_atom_cascades_edges(self, client, seeded_project):
        r = client.delete(f"/api/astrolabe/entries/a1?path={seeded_project}")
        assert r.status_code == 200
        # e1 referenced a1, should be gone
        r2 = client.get(f"/api/astrolabe/entries/e1?path={seeded_project}")
        assert r2.status_code == 404
        # a2 still exists
        r3 = client.get(f"/api/astrolabe/entries/a2?path={seeded_project}")
        assert r3.status_code == 200

    def test_delete_nonexistent_returns_404(self, client, seeded_project):
        r = client.delete(f"/api/astrolabe/entries/nonexistent?path={seeded_project}")
        assert r.status_code == 404

    def test_delete_atom_cascades_higher_simplex(self, client, seeded_project):
        """Deleting an atom also removes 2-forms that reference it."""
        # Create a third atom + triangle
        r0 = client.post(
            f"/api/astrolabe/entries?path={seeded_project}",
            json={"ref": ["__self__"], "record": {"name": "C", "sort": "lemma"}},
        )
        a3 = r0.json()["id"]
        r1 = client.post(
            f"/api/astrolabe/entries?path={seeded_project}",
            json={"ref": ["a1", "a2", a3], "record": {"sort": "triangle"}},
        )
        tri_id = r1.json()["id"]

        # Delete a1 → triangle and e1 should cascade
        client.delete(f"/api/astrolabe/entries/a1?path={seeded_project}")

        r2 = client.get(f"/api/astrolabe/entries/{tri_id}?path={seeded_project}")
        assert r2.status_code == 404
        r3 = client.get(f"/api/astrolabe/entries/e1?path={seeded_project}")
        assert r3.status_code == 404
        # a2 and a3 survive
        assert client.get(f"/api/astrolabe/entries/a2?path={seeded_project}").status_code == 200
        assert client.get(f"/api/astrolabe/entries/{a3}?path={seeded_project}").status_code == 200


class TestFullWorkflow:
    def test_create_then_cascade_delete(self, client, empty_project):
        p = empty_project
        # Create two atoms
        r1 = client.post(f"/api/astrolabe/entries?path={p}",
                         json={"ref": ["__self__"], "record": {"name": "A", "sort": "definition"}})
        r2 = client.post(f"/api/astrolabe/entries?path={p}",
                         json={"ref": ["__self__"], "record": {"name": "B", "sort": "theorem"}})
        id_a = r1.json()["id"]
        id_b = r2.json()["id"]

        # Create edge
        r3 = client.post(f"/api/astrolabe/entries?path={p}",
                         json={"ref": [id_a, id_b], "record": {"sort": "uses"}})
        assert r3.status_code == 201
        id_e = r3.json()["id"]

        # Create triangle
        r4 = client.post(f"/api/astrolabe/entries?path={p}",
                         json={"ref": [id_a, id_b, id_a], "record": {"sort": "loop"}})
        assert r4.status_code == 201
        id_t = r4.json()["id"]

        # All 4 exist
        r5 = client.get(f"/api/astrolabe/entries?path={p}")
        assert len(r5.json()) == 4

        # Delete atom A → edge and triangle should cascade
        client.delete(f"/api/astrolabe/entries/{id_a}?path={p}")

        r6 = client.get(f"/api/astrolabe/entries?path={p}")
        remaining = r6.json()
        assert len(remaining) == 1
        assert id_b in remaining
