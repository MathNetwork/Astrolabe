"""Tests for Astrolabe MCP tool handlers."""
import json
import sys
import os
import pytest
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, os.path.dirname(__file__))

from core_tools import (
    query_entries, get_entry, create_entry, update_entry, delete_entry,
    do_validate_store, get_stages, get_ref_graph,
)
from leannets_tools import (
    do_semantic_propagation, get_network_metrics,
    get_cross_source, get_formalization_frontier,
)


@pytest.fixture
def project(tmp_path):
    """Create a project with tex + lean atoms and cross-source edges."""
    d = tmp_path / ".astrolabe"
    d.mkdir()
    data = {
        "d1": {"ref": ["d1"], "record": json.dumps({"sort": "definition", "source": "tex", "title": "Compact"})},
        "t1": {"ref": ["t1"], "record": json.dumps({"sort": "theorem", "source": "tex", "title": "Heine-Borel"})},
        "l1": {"ref": ["l1"], "record": json.dumps({"sort": "lemma", "source": "tex", "title": "Bounded"})},
        "p1": {"ref": ["p1"], "record": json.dumps({"sort": "proof", "source": "tex"})},
        "lt1": {"ref": ["lt1"], "record": json.dumps({"sort": "theorem", "source": "lean", "title": "IsCompact", "state": "proven"})},
        # Edges: t1 depends on d1, l1 depends on d1
        "e1": {"ref": ["t1", "d1"], "record": json.dumps({"sort": "(theorem, definition)"})},
        "e2": {"ref": ["l1", "d1"], "record": json.dumps({"sort": "(lemma, definition)"})},
        # Cross-source: t1 (tex) ↔ lt1 (lean)
        "x1": {"ref": ["t1", "lt1"], "record": json.dumps({"sort": "(theorem, theorem)"})},
    }
    (d / "astrolabe.json").write_text(json.dumps(data))
    return str(tmp_path)


class TestCoreTools:
    def test_query_entries_all(self, project):
        result = query_entries(project)
        assert result["count"] == 8

    def test_query_entries_filter_sort(self, project):
        result = query_entries(project, sort="theorem")
        assert result["count"] == 2  # t1 + lt1

    def test_query_entries_filter_source(self, project):
        result = query_entries(project, source="lean")
        assert result["count"] == 1  # lt1

    def test_query_entries_filter_degree(self, project):
        result = query_entries(project, degree=0)
        assert result["count"] == 5  # atoms only

    def test_query_entries_default_no_records(self, project):
        result = query_entries(project)
        assert "hashes" in result
        assert "entries" not in result
        assert len(result["hashes"]) == result["count"]

    def test_query_entries_include_records(self, project):
        result = query_entries(project, include_records=True)
        assert "entries" in result
        assert "hashes" not in result
        assert len(result["entries"]) == result["count"]

    def test_get_entry(self, project):
        result = get_entry(project, "d1")
        assert result["hash"] == "d1"
        assert "Compact" in result["record"]

    def test_get_entry_not_found(self, project):
        result = get_entry(project, "nonexistent")
        assert "error" in result

    def test_create_entry_valid(self, project):
        record = json.dumps({"sort": "definition", "source": "tex", "title": "New"})
        result = create_entry(project, ref=["__self__"], record=record)
        assert "hash" in result
        assert "error" not in result

    def test_create_entry_invalid_ref(self, project):
        result = create_entry(project, ref=["nonexistent", "d1"], record="{}")
        assert "error" in result

    def test_validate_store_valid(self, project):
        result = do_validate_store(project)
        assert result["valid"] is True

    def test_get_stages(self, project):
        stages = get_stages(project)
        assert stages["d1"] == 0  # atom
        assert stages["e1"] == 1  # edge

    def test_get_ref_graph(self, project):
        graph = get_ref_graph(project)
        assert "nodes" in graph
        assert "links" in graph


class TestLeanNetsTools:
    def test_semantic_propagation(self, project):
        result = do_semantic_propagation(project, "d1")
        assert "t1" in result["affected"]
        assert "l1" in result["affected"]

    def test_semantic_propagation_not_found(self, project):
        result = do_semantic_propagation(project, "nonexistent")
        assert result["affected"] == []

    def test_network_metrics_pagerank(self, project):
        result = get_network_metrics(project, "pagerank")
        assert "d1" in result
        assert isinstance(result["d1"], float)

    def test_network_metrics_unknown(self, project):
        result = get_network_metrics(project, "unknown_metric")
        assert "error" in result

    def test_cross_source_found(self, project):
        result = get_cross_source(project, "t1")
        assert result["counterpart_hash"] == "lt1"
        assert result["counterpart_source"] == "lean"

    def test_cross_source_not_found(self, project):
        result = get_cross_source(project, "d1")
        assert result["counterpart"] is None

    def test_formalization_frontier(self, project):
        result = get_formalization_frontier(project)
        frontier_hashes = [a["hash"] for a in result["frontier"]]
        # d1 and l1 have no lean counterpart, t1 does
        assert "d1" in frontier_hashes
        assert "l1" in frontier_hashes
        assert "t1" not in frontier_hashes  # has lean counterpart
        assert "p1" not in frontier_hashes  # proof excluded
        assert result["formalized"] == 1  # t1
