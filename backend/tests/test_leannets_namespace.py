"""Verify LeanNets endpoints are at /api/plugins/leannets/, not /api/plugins/skeleton/."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from astrolabe_app.server import app

client = TestClient(app)


@pytest.fixture
def project(tmp_path):
    d = tmp_path / ".astrolabe"
    d.mkdir()
    data = {
        "a1": {"ref": ["a1"], "record": json.dumps({"sort": "definition", "source": "tex", "title": "a1"})},
        "a2": {"ref": ["a2"], "record": json.dumps({"sort": "theorem", "source": "tex", "title": "a2"})},
        "e1": {"ref": ["a2", "a1"], "record": json.dumps({"sort": "(theorem, definition)"})},
    }
    (d / "astrolabe.json").write_text(json.dumps(data))
    return str(tmp_path)


def test_leannets_graph(project):
    resp = client.get("/api/plugins/leannets/graph", params={"path": project})
    assert resp.status_code == 200
    body = resp.json()
    assert "nodes" in body


def test_leannets_analyze(project):
    resp = client.get("/api/plugins/leannets/analyze", params={"path": project, "metric": "degree"})
    assert resp.status_code == 200


def test_leannets_propagate(project):
    resp = client.get("/api/plugins/leannets/propagate", params={"path": project, "changed": "a1"})
    assert resp.status_code == 200
    assert "affected" in resp.json()


def test_old_skeleton_removed(project):
    resp = client.get("/api/plugins/skeleton/graph", params={"path": project})
    assert resp.status_code == 404
