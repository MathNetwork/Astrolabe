"""
Integration tests: astrolabe routes mounted on server.py under /api/astrolabe.

Tests that:
1. /api/astrolabe/ref-graph?path=... returns ref-graph data
2. /api/astrolabe/entries?path=... returns all entries
3. /api/astrolabe/stages?path=... returns stage decomposition
4. Auto-migration: if only signature.json exists, it gets migrated to astrolabe.json
"""
import json
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from astrolabe.server import app


@pytest.fixture
def project_with_astrolabe(tmp_path):
    """Project with astrolabe.json already present."""
    data = {
        "a1": {"ref": ["a1"], "record": {"name": "alpha", "sort": "definition"}},
        "a2": {"ref": ["a2"], "record": {"name": "beta", "sort": "theorem"}},
        "e1": {"ref": ["a1", "a2"], "record": {"sort": "uses"}},
        "f1": {"ref": ["a1", "a2", "a1"], "record": {"sort": "chain"}},
    }
    p = tmp_path / ".astrolabe"
    p.mkdir()
    (p / "astrolabe.json").write_text(json.dumps(data), encoding="utf-8")
    return str(tmp_path)


@pytest.fixture
def project_with_signature_only(tmp_path):
    """Project with only signature.json (old format) — should auto-migrate."""
    sig = {
        "obj": {
            "abc": {"name": "X", "sort": "definition"},
            "def": {"name": "Y", "sort": "theorem"},
        },
        "mor": {
            "m01": {"source": "abc", "target": "def", "sort": "uses"},
        },
    }
    p = tmp_path / ".astrolabe"
    p.mkdir()
    (p / "signature.json").write_text(json.dumps(sig), encoding="utf-8")
    return str(tmp_path)


@pytest.fixture
def client():
    return TestClient(app)


class TestRefGraph:
    def test_ref_graph_returns_data(self, client, project_with_astrolabe):
        r = client.get(f"/api/astrolabe/ref-graph?path={project_with_astrolabe}")
        assert r.status_code == 200
        data = r.json()
        assert "nodes" in data
        assert "links" in data
        assert len(data["nodes"]) == 4

    def test_ref_graph_nodes_have_degree_and_stage(self, client, project_with_astrolabe):
        r = client.get(f"/api/astrolabe/ref-graph?path={project_with_astrolabe}")
        for node in r.json()["nodes"]:
            assert "degree" in node
            assert "stage" in node

    def test_ref_graph_links_are_ref_edges(self, client, project_with_astrolabe):
        r = client.get(f"/api/astrolabe/ref-graph?path={project_with_astrolabe}")
        links = r.json()["links"]
        e1_links = [l for l in links if l["source"] == "e1"]
        assert len(e1_links) == 2


class TestEntries:
    def test_entries_returns_all(self, client, project_with_astrolabe):
        r = client.get(f"/api/astrolabe/entries?path={project_with_astrolabe}")
        assert r.status_code == 200
        assert len(r.json()) == 4

    def test_single_entry(self, client, project_with_astrolabe):
        r = client.get(f"/api/astrolabe/entries/a1?path={project_with_astrolabe}")
        assert r.status_code == 200
        assert r.json()["ref"] == ["a1"]


class TestStages:
    def test_stages(self, client, project_with_astrolabe):
        r = client.get(f"/api/astrolabe/stages?path={project_with_astrolabe}")
        assert r.status_code == 200
        stages = r.json()
        assert stages["a1"] == 0
        assert stages["e1"] == 1


class TestAutoMigration:
    def test_migrate_on_first_access(self, client, project_with_signature_only):
        """When only signature.json exists, accessing astrolabe routes should auto-migrate."""
        r = client.get(f"/api/astrolabe/ref-graph?path={project_with_signature_only}")
        assert r.status_code == 200
        nodes = r.json()["nodes"]
        # 2 obj → 2 atoms + 1 mor → 1 edge = 3 entries
        assert len(nodes) == 3
        node_ids = {n["id"] for n in nodes}
        assert "abc" in node_ids
        assert "def" in node_ids
        assert "m01" in node_ids

    def test_migration_creates_astrolabe_json(self, client, project_with_signature_only):
        """After auto-migration, astrolabe.json should exist on disk."""
        client.get(f"/api/astrolabe/ref-graph?path={project_with_signature_only}")
        astrolabe_path = Path(project_with_signature_only) / ".astrolabe" / "astrolabe.json"
        assert astrolabe_path.exists()
        data = json.loads(astrolabe_path.read_text())
        assert "abc" in data
        assert data["abc"]["ref"] == ["abc"]

    def test_entries_after_migration(self, client, project_with_signature_only):
        r = client.get(f"/api/astrolabe/entries?path={project_with_signature_only}")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 3
        assert data["m01"]["ref"] == ["abc", "def"]


class TestGraph:
    def test_graph_compat(self, client, project_with_astrolabe):
        """1-skeleton graph endpoint still works."""
        r = client.get(f"/api/astrolabe/graph?path={project_with_astrolabe}")
        assert r.status_code == 200
        data = r.json()
        assert len(data["nodes"]) == 2  # atoms only
        assert len(data["edges"]) == 1  # 1-simplices only
