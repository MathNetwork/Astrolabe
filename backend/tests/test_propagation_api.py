"""Test the /api/plugins/leannets/propagate endpoint."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from astrolabe_app.server import app

client = TestClient(app)


@pytest.fixture
def project_with_graph(tmp_path):
    """Create a project with a small skeleton graph."""
    astrolabe_dir = tmp_path / ".astrolabe"
    astrolabe_dir.mkdir()
    data = {
        "D1": {"ref": ["D1"], "record": json.dumps({"sort": "definition", "source": "tex", "title": "D1"})},
        "L1": {"ref": ["L1"], "record": json.dumps({"sort": "lemma", "source": "tex", "title": "L1"})},
        "T1": {"ref": ["T1"], "record": json.dumps({"sort": "theorem", "source": "tex", "title": "T1"})},
        "eLD": {"ref": ["L1", "D1"], "record": json.dumps({"sort": "(lemma, definition)"})},
        "eTL": {"ref": ["T1", "L1"], "record": json.dumps({"sort": "(theorem, lemma)"})},
    }
    (astrolabe_dir / "astrolabe.json").write_text(json.dumps(data))
    return str(tmp_path)


def test_propagate_endpoint(project_with_graph):
    resp = client.get("/api/plugins/leannets/propagate", params={
        "path": project_with_graph,
        "changed": "D1",
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["changed"] == "D1"
    assert set(body["affected"]) == {"L1", "T1"}


def test_propagate_nonexistent_atom(project_with_graph):
    resp = client.get("/api/plugins/leannets/propagate", params={
        "path": project_with_graph,
        "changed": "NONEXISTENT",
    })
    assert resp.status_code == 200
    assert resp.json()["affected"] == []
