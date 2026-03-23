"""
API route tests for the new astrolabe endpoints.
"""
import json
import pytest
from fastapi.testclient import TestClient

from astrolabe.api import create_app


@pytest.fixture
def client(tmp_path):
    data = {
        "a1": {"ref": ["a1"], "record": {"name": "alpha", "sort": "definition"}},
        "a2": {"ref": ["a2"], "record": {"name": "beta", "sort": "theorem"}},
        "e1": {"ref": ["a1", "a2"], "record": {"sort": "uses"}},
        "f1": {"ref": ["a1", "a2", "a1"], "record": {"sort": "chain"}},
    }
    p = tmp_path / ".astrolabe"
    p.mkdir()
    (p / "astrolabe.json").write_text(json.dumps(data), encoding="utf-8")
    return TestClient(create_app(str(tmp_path)))


class TestGetEntries:
    def test_get_all(self, client):
        r = client.get("/api/entries")
        assert r.status_code == 200
        assert len(r.json()) == 4

    def test_get_single(self, client):
        r = client.get("/api/entries/a1")
        assert r.status_code == 200
        assert r.json()["ref"] == ["a1"]
        assert r.json()["record"]["name"] == "alpha"

    def test_get_missing_404(self, client):
        r = client.get("/api/entries/nonexistent")
        assert r.status_code == 404


class TestCreateDelete:
    def test_create_entry(self, client):
        r = client.post("/api/entries", json={
            "hash_id": "new1",
            "ref": ["a1", "a2"],
            "record": {"sort": "test"},
        })
        assert r.status_code == 201
        r2 = client.get("/api/entries/new1")
        assert r2.status_code == 200
        assert r2.json()["ref"] == ["a1", "a2"]

    def test_delete_entry(self, client):
        r = client.delete("/api/entries/e1")
        assert r.status_code == 200
        r2 = client.get("/api/entries/e1")
        assert r2.status_code == 404

    def test_delete_missing_404(self, client):
        r = client.delete("/api/entries/nonexistent")
        assert r.status_code == 404


class TestFiltering:
    def test_atoms(self, client):
        r = client.get("/api/atoms")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 2
        assert all(len(e["ref"]) == 1 for e in data.values())

    def test_k_forms(self, client):
        r = client.get("/api/k-forms/1")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert "e1" in data

    def test_k_forms_2(self, client):
        r = client.get("/api/k-forms/2")
        assert r.status_code == 200
        assert len(r.json()) == 1
        assert "f1" in r.json()


class TestComputed:
    def test_stages(self, client):
        r = client.get("/api/stages")
        assert r.status_code == 200
        stages = r.json()
        assert stages["a1"] == 0
        assert stages["a2"] == 0
        assert stages["e1"] == 1
        assert stages["f1"] == 1

    def test_profile(self, client):
        r = client.get("/api/profile/f1")
        assert r.status_code == 200
        assert r.json() == {"a1": 2, "a2": 1}

    def test_profile_missing_404(self, client):
        r = client.get("/api/profile/nonexistent")
        assert r.status_code == 404


class TestGraph:
    """1-skeleton compatibility layer."""

    def test_graph_nodes(self, client):
        r = client.get("/api/graph")
        assert r.status_code == 200
        data = r.json()
        assert len(data["nodes"]) == 2
        node_ids = {n["id"] for n in data["nodes"]}
        assert node_ids == {"a1", "a2"}

    def test_graph_edges(self, client):
        r = client.get("/api/graph")
        data = r.json()
        assert len(data["edges"]) == 1
        edge = data["edges"][0]
        assert edge["id"] == "e1"
        assert edge["source"] == "a1"
        assert edge["target"] == "a2"

    def test_graph_nodes_have_name(self, client):
        r = client.get("/api/graph")
        for node in r.json()["nodes"]:
            assert "name" in node

    def test_graph_edges_exclude_higher(self, client):
        """2-simplices should NOT appear as edges."""
        r = client.get("/api/graph")
        edge_ids = {e["id"] for e in r.json()["edges"]}
        assert "f1" not in edge_ids
