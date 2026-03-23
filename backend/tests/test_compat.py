"""
1-skeleton compatibility + end-to-end migration tests.
"""
import json
import pytest
from fastapi.testclient import TestClient

from astrolabe.api import create_app
from astrolabe.migrate import migrate_signature, migrate_file
from astrolabe.storage import AstrolabeStorage


class TestGraphCompat:
    """Ensure /api/graph output matches old signature_crud format."""

    @pytest.fixture
    def client(self, tmp_path):
        data = {
            "a1": {"ref": ["a1"], "record": {"name": "x", "sort": "def"}},
            "a2": {"ref": ["a2"], "record": {"name": "y", "sort": "thm"}},
            "e1": {"ref": ["a1", "a2"], "record": {"sort": "uses"}},
        }
        p = tmp_path / ".astrolabe"
        p.mkdir()
        (p / "astrolabe.json").write_text(json.dumps(data), encoding="utf-8")
        return TestClient(create_app(str(tmp_path)))

    def test_nodes_have_id_and_name(self, client):
        r = client.get("/api/graph")
        for node in r.json()["nodes"]:
            assert "id" in node
            assert "name" in node

    def test_edges_have_id_source_target(self, client):
        r = client.get("/api/graph")
        for edge in r.json()["edges"]:
            assert "id" in edge
            assert "source" in edge
            assert "target" in edge


class TestE2EMigrate:
    """Migrate old signature.json → load as AstrolabeStorage → verify 1-skeleton."""

    def test_migrate_then_load(self, tmp_path):
        sig = {
            "obj": {
                "a1": {"name": "x", "sort": "def", "statement": "stmt"},
                "a2": {"name": "y", "sort": "thm"},
            },
            "mor": {
                "e1": {"source": "a1", "target": "a2", "sort": "uses", "notes": "n"},
            },
        }
        sig_path = tmp_path / "signature.json"
        sig_path.write_text(json.dumps(sig), encoding="utf-8")

        out_dir = tmp_path / "project" / ".astrolabe"
        out_dir.mkdir(parents=True)
        out_path = out_dir / "astrolabe.json"
        migrate_file(str(sig_path), str(out_path))

        store = AstrolabeStorage(str(tmp_path / "project"))
        nodes, edges = store.to_graph()

        assert len(nodes) == 2
        assert len(edges) == 1

        node_ids = {n["id"] for n in nodes}
        assert node_ids == {"a1", "a2"}

        edge = edges[0]
        assert edge["source"] == "a1"
        assert edge["target"] == "a2"
        assert edge["sort"] == "uses"
        assert edge["notes"] == "n"

    def test_migrate_preserves_all_obj_fields(self, tmp_path):
        sig = {
            "obj": {"a1": {"name": "x", "sort": "def", "statement": "s", "proof": "p"}},
            "mor": {},
        }
        result = migrate_signature(sig)

        store_dir = tmp_path / ".astrolabe"
        store_dir.mkdir()
        (store_dir / "astrolabe.json").write_text(json.dumps(result), encoding="utf-8")
        store = AstrolabeStorage(str(tmp_path))
        nodes, _ = store.to_graph()

        node = nodes[0]
        assert node["name"] == "x"
        assert node["statement"] == "s"
        assert node["proof"] == "p"
