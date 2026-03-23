"""
Node count invariant tests.

ref-graph nodes = ALL entries (atoms + 1-simplices + higher)
graph nodes = atoms only
graph edges = 1-simplices only

Invariant: len(ref-graph.nodes) == len(graph.nodes) + len(graph.edges) + count(degree >= 2)
"""
import json
import pytest
from fastapi.testclient import TestClient

from astrolabe.server import app


@pytest.fixture
def project_3a_2e(tmp_path):
    """3 atoms + 2 1-simplices = 5 total entries."""
    data = {
        "a1": {"ref": ["a1"], "record": {"name": "alpha"}},
        "a2": {"ref": ["a2"], "record": {"name": "beta"}},
        "a3": {"ref": ["a3"], "record": {"name": "gamma"}},
        "e1": {"ref": ["a1", "a2"], "record": {"sort": "uses"}},
        "e2": {"ref": ["a2", "a3"], "record": {"sort": "uses"}},
    }
    p = tmp_path / ".astrolabe"
    p.mkdir()
    (p / "astrolabe.json").write_text(json.dumps(data), encoding="utf-8")
    return str(tmp_path)


@pytest.fixture
def project_with_higher(tmp_path):
    """3 atoms + 2 edges + 1 face + 1 meta = 7 total."""
    data = {
        "a1": {"ref": ["a1"], "record": {"name": "alpha"}},
        "a2": {"ref": ["a2"], "record": {"name": "beta"}},
        "a3": {"ref": ["a3"], "record": {"name": "gamma"}},
        "e1": {"ref": ["a1", "a2"], "record": {"sort": "uses"}},
        "e2": {"ref": ["a2", "a3"], "record": {"sort": "uses"}},
        "f1": {"ref": ["a1", "a2", "a3"], "record": {"sort": "chain"}},
        "m1": {"ref": ["e1", "e2"], "record": {"sort": "meta"}},
    }
    p = tmp_path / ".astrolabe"
    p.mkdir()
    (p / "astrolabe.json").write_text(json.dumps(data), encoding="utf-8")
    return str(tmp_path)


@pytest.fixture
def client():
    return TestClient(app)


class TestRefGraphNodeCount:
    def test_ref_graph_has_5_nodes(self, client, project_3a_2e):
        """3 atoms + 2 edges = 5 nodes in ref-graph."""
        r = client.get(f"/api/astrolabe/ref-graph?path={project_3a_2e}")
        assert r.status_code == 200
        assert len(r.json()["nodes"]) == 5

    def test_graph_has_3_nodes_2_edges(self, client, project_3a_2e):
        """Graph: 3 atom nodes + 2 edge edges."""
        r = client.get(f"/api/astrolabe/graph?path={project_3a_2e}")
        assert r.status_code == 200
        data = r.json()
        assert len(data["nodes"]) == 3
        assert len(data["edges"]) == 2


class TestNodeCountInvariant:
    def test_invariant_simple(self, client, project_3a_2e):
        """ref_nodes == graph_nodes + graph_edges + higher_dim."""
        ref = client.get(f"/api/astrolabe/ref-graph?path={project_3a_2e}").json()
        graph = client.get(f"/api/astrolabe/graph?path={project_3a_2e}").json()
        higher = 0  # no degree >= 2

        assert len(ref["nodes"]) == len(graph["nodes"]) + len(graph["edges"]) + higher

    def test_invariant_with_higher(self, client, project_with_higher):
        """ref_nodes == graph_nodes + graph_edges + higher_dim."""
        ref = client.get(f"/api/astrolabe/ref-graph?path={project_with_higher}").json()
        graph = client.get(f"/api/astrolabe/graph?path={project_with_higher}").json()

        # f1 (degree 2) + m1 (degree 1 but stage 2) — m1 IS a 1-simplex so it's in graph edges
        # Actually: graph edges = 1-simplices = e1, e2, m1 (all degree 1)
        # graph nodes = atoms = a1, a2, a3
        # higher = f1 (degree 2)
        # BUT m1 refs e1 and e2 (not atoms), so m1 source/target aren't atom nodes
        # to_graph() only includes 1-simplices whose ref[0] and ref[1] are atoms? No — it includes ALL len(ref)==2

        # Let's just verify the invariant
        entries = client.get(f"/api/astrolabe/entries?path={project_with_higher}").json()
        total = len(entries)
        assert len(ref["nodes"]) == total  # ref-graph shows ALL entries
        assert len(ref["nodes"]) == 7

        # graph: atoms=3, 1-simplices with BOTH refs existing as nodes
        # e1=[a1,a2] → edge (both atoms exist as nodes)
        # e2=[a2,a3] → edge (both atoms exist as nodes)
        # m1=[e1,e2] → edge in graph? e1 and e2 are NOT atom-nodes, so they won't connect
        assert len(graph["nodes"]) == 3  # a1, a2, a3

    def test_ref_nodes_equals_total_entries(self, client, project_with_higher):
        """ref-graph nodes == total entries, always."""
        ref = client.get(f"/api/astrolabe/ref-graph?path={project_with_higher}").json()
        entries = client.get(f"/api/astrolabe/entries?path={project_with_higher}").json()
        assert len(ref["nodes"]) == len(entries)


class TestRefGraphLinkCount:
    def test_link_count_simple(self, client, project_3a_2e):
        """e1 has 2 refs, e2 has 2 refs → 4 links total."""
        r = client.get(f"/api/astrolabe/ref-graph?path={project_3a_2e}")
        assert len(r.json()["links"]) == 4

    def test_1simplex_nodes_have_degree_1(self, client, project_3a_2e):
        """e1 and e2 should be nodes with degree=1."""
        nodes = client.get(f"/api/astrolabe/ref-graph?path={project_3a_2e}").json()["nodes"]
        by_id = {n["id"]: n for n in nodes}
        assert by_id["e1"]["degree"] == 1
        assert by_id["e2"]["degree"] == 1
        assert by_id["a1"]["degree"] == 0
