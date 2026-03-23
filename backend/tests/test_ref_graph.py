"""
Reference View API tests.

/api/entries returns ALL entries (all degrees).
/api/ref-graph returns all entries as nodes + ref relationships as links.
"""
import json
import pytest
from fastapi.testclient import TestClient

from astrolabe.api import create_app


@pytest.fixture
def client(tmp_path):
    data = {
        "a1": {"ref": ["a1"], "record": {"name": "atom1"}},
        "a2": {"ref": ["a2"], "record": {"name": "atom2"}},
        "a3": {"ref": ["a3"], "record": {"name": "atom3"}},
        "e1": {"ref": ["a1", "a2"], "record": {"sort": "uses"}},
        "f1": {"ref": ["a1", "a2", "a3"], "record": {"sort": "chain"}},
        "m1": {"ref": ["e1", "f1"], "record": {"sort": "meta"}},
    }
    p = tmp_path / ".astrolabe"
    p.mkdir()
    (p / "astrolabe.json").write_text(json.dumps(data), encoding="utf-8")
    return TestClient(create_app(str(tmp_path)))


class TestEntriesAll:
    def test_entries_includes_all_degrees(self, client):
        r = client.get("/api/entries")
        assert r.status_code == 200
        assert len(r.json()) == 6  # a1, a2, a3, e1, f1, m1

    def test_entries_includes_atoms(self, client):
        data = client.get("/api/entries").json()
        assert "a1" in data

    def test_entries_includes_high_degree(self, client):
        data = client.get("/api/entries").json()
        assert "f1" in data  # degree 2
        assert "m1" in data  # degree 1 but stage 2


class TestRefGraph:
    def test_all_entries_are_nodes(self, client):
        r = client.get("/api/ref-graph")
        assert r.status_code == 200
        nodes = r.json()["nodes"]
        assert len(nodes) == 6
        node_ids = {n["id"] for n in nodes}
        assert node_ids == {"a1", "a2", "a3", "e1", "f1", "m1"}

    def test_nodes_have_degree(self, client):
        nodes = client.get("/api/ref-graph").json()["nodes"]
        by_id = {n["id"]: n for n in nodes}
        assert by_id["a1"]["degree"] == 0
        assert by_id["e1"]["degree"] == 1
        assert by_id["f1"]["degree"] == 2
        assert by_id["m1"]["degree"] == 1

    def test_nodes_have_stage(self, client):
        nodes = client.get("/api/ref-graph").json()["nodes"]
        by_id = {n["id"]: n for n in nodes}
        assert by_id["a1"]["stage"] == 0
        assert by_id["e1"]["stage"] == 1
        assert by_id["f1"]["stage"] == 1
        assert by_id["m1"]["stage"] == 2

    def test_nodes_have_record_fields(self, client):
        nodes = client.get("/api/ref-graph").json()["nodes"]
        by_id = {n["id"]: n for n in nodes}
        assert by_id["a1"]["name"] == "atom1"
        assert by_id["e1"]["sort"] == "uses"

    def test_atom_has_no_ref_links(self, client):
        """Atoms (ref = [self]) should NOT generate a self-loop link."""
        links = client.get("/api/ref-graph").json()["links"]
        a1_links = [l for l in links if l["source"] == "a1"]
        assert len(a1_links) == 0

    def test_edge_has_2_ref_links(self, client):
        links = client.get("/api/ref-graph").json()["links"]
        e1_links = [l for l in links if l["source"] == "e1"]
        assert len(e1_links) == 2
        targets = {l["target"] for l in e1_links}
        assert targets == {"a1", "a2"}

    def test_face_has_3_ref_links(self, client):
        links = client.get("/api/ref-graph").json()["links"]
        f1_links = [l for l in links if l["source"] == "f1"]
        assert len(f1_links) == 3
        targets = {l["target"] for l in f1_links}
        assert targets == {"a1", "a2", "a3"}

    def test_meta_has_2_ref_links(self, client):
        links = client.get("/api/ref-graph").json()["links"]
        m1_links = [l for l in links if l["source"] == "m1"]
        assert len(m1_links) == 2
        targets = {l["target"] for l in m1_links}
        assert targets == {"e1", "f1"}

    def test_links_have_position(self, client):
        """Each link records its position in the ref list."""
        links = client.get("/api/ref-graph").json()["links"]
        e1_links = sorted(
            [l for l in links if l["source"] == "e1"],
            key=lambda l: l["position"],
        )
        assert e1_links[0]["target"] == "a1"
        assert e1_links[0]["position"] == 0
        assert e1_links[1]["target"] == "a2"
        assert e1_links[1]["position"] == 1

    def test_total_link_count(self, client):
        """Total links = sum of non-atom ref lengths."""
        links = client.get("/api/ref-graph").json()["links"]
        # e1: 2, f1: 3, m1: 2 = 7
        assert len(links) == 7

    def test_empty_data(self, tmp_path):
        p = tmp_path / ".astrolabe"
        p.mkdir()
        (p / "astrolabe.json").write_text("{}", encoding="utf-8")
        c = TestClient(create_app(str(tmp_path)))
        r = c.get("/api/ref-graph")
        assert r.status_code == 200
        assert r.json() == {"nodes": [], "links": []}
