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
    do_validate_store, get_stages, get_ref_graph, search_entries,
)
from leannets_tools import (
    do_semantic_propagation, get_network_metrics,
    get_cross_source, get_formalization_frontier,
)
from lean_tools import lean_project_info, lean_sorry_scan, find_lean_project


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

    def test_search_by_title(self, project):
        result = search_entries(project, "Compact")
        assert len(result["results"]) >= 1
        titles = [r["title"] for r in result["results"]]
        assert "Compact" in titles

    def test_search_case_insensitive(self, project):
        result = search_entries(project, "heine-borel")
        assert len(result["results"]) == 1
        assert result["results"][0]["title"] == "Heine-Borel"
        assert result["results"][0]["sort"] == "theorem"
        assert result["results"][0]["source"] == "tex"

    def test_search_no_match(self, project):
        result = search_entries(project, "nonexistent_keyword_xyz")
        assert result["results"] == []

    def test_search_finds_lean_atom(self, project):
        result = search_entries(project, "IsCompact")
        assert len(result["results"]) == 1
        assert result["results"][0]["source"] == "lean"


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


class TestLeanTools:
    """Tests for Lean project detection and sorry scanning."""

    @pytest.fixture
    def lean_project(self, tmp_path):
        """Create a mock Lean project in a subdirectory."""
        lean_dir = tmp_path / "lean"
        lean_dir.mkdir()
        (lean_dir / "lakefile.toml").write_text(
            'name = "Test"\ndefaultTargets = ["Test"]\n\n'
            '[[require]]\nname = "mathlib"\n'
            'git = "https://github.com/leanprover-community/mathlib4.git"\n'
            'rev = "v4.28.0"\n'
        )
        (lean_dir / "lean-toolchain").write_text("leanprover/lean4:v4.28.0\n")
        (lean_dir / "Test.lean").write_text(
            "import Mathlib\n\n"
            "theorem foo : 1 + 1 = 2 := by\n"
            "  sorry\n\n"
            "theorem bar : 2 + 2 = 4 := by\n"
            "  norm_num\n\n"
            "-- sorry in a comment should be ignored\n"
            "/- sorry in a block comment too -/\n"
        )
        # .lake dir should be ignored
        lake_dir = lean_dir / ".lake" / "build"
        lake_dir.mkdir(parents=True)
        (lake_dir / "Generated.lean").write_text("sorry\n")
        return tmp_path

    def test_find_lean_project_in_subdir(self, lean_project):
        result = find_lean_project(str(lean_project))
        assert result is not None
        assert result.endswith("lean")

    def test_find_lean_project_at_root(self, tmp_path):
        (tmp_path / "lakefile.lean").write_text("-- lakefile")
        result = find_lean_project(str(tmp_path))
        assert result == str(tmp_path)

    def test_find_lean_project_none(self, tmp_path):
        result = find_lean_project(str(tmp_path))
        assert result is None

    def test_lean_project_info(self, lean_project):
        result = lean_project_info(str(lean_project))
        assert "error" not in result
        assert result["lakefile"] == "lakefile.toml"
        assert result["toolchain"] == "leanprover/lean4:v4.28.0"
        assert result["lean_file_count"] >= 1
        assert "Test.lean" in result["lean_files"]
        # .lake files should be excluded
        assert not any(".lake" in f for f in result["lean_files"])

    def test_lean_project_info_no_project(self, tmp_path):
        result = lean_project_info(str(tmp_path))
        assert "error" in result

    def test_lean_sorry_scan(self, lean_project):
        result = lean_sorry_scan(str(lean_project))
        assert "error" not in result
        assert result["total_sorry"] == 1
        assert "Test.lean" in result["files"]
        assert 4 in result["files"]["Test.lean"]  # sorry on line 4

    def test_lean_sorry_scan_ignores_comments(self, lean_project):
        result = lean_sorry_scan(str(lean_project))
        # Line 9 (-- comment) and line 10 (/- block -/) should NOT be counted
        sorry_lines = result["files"].get("Test.lean", [])
        assert 9 not in sorry_lines
        assert 10 not in sorry_lines

    def test_lean_sorry_scan_ignores_lake(self, lean_project):
        result = lean_sorry_scan(str(lean_project))
        # .lake/build/Generated.lean should not appear
        assert not any(".lake" in f for f in result["files"])

    def test_lean_sorry_scan_no_project(self, tmp_path):
        result = lean_sorry_scan(str(tmp_path))
        assert "error" in result

    def test_lean_sorry_scan_no_sorry(self, tmp_path):
        lean_dir = tmp_path / "proj"
        lean_dir.mkdir()
        (lean_dir / "lakefile.lean").write_text("-- lakefile")
        (lean_dir / "Clean.lean").write_text("theorem x : True := trivial\n")
        result = lean_sorry_scan(str(tmp_path))
        assert result["total_sorry"] == 0
        assert result["files"] == {}

    def test_lean_sorry_scan_real_project(self):
        """Integration test: scan real hessenberg-digraphs project."""
        hess = "/Users/moqian/hessenberg-digraphs"
        if not os.path.isdir(hess):
            pytest.skip("hessenberg-digraphs not available")
        result = lean_sorry_scan(hess)
        assert "error" not in result
        assert result["total_sorry"] >= 1  # known sorry at line 476
        assert any("HessenbergDigraphs" in f for f in result["files"])

    def test_lean_project_info_real_project(self):
        """Integration test: detect real hessenberg-digraphs project."""
        hess = "/Users/moqian/hessenberg-digraphs"
        if not os.path.isdir(hess):
            pytest.skip("hessenberg-digraphs not available")
        result = lean_project_info(hess)
        assert "error" not in result
        assert result["toolchain"] == "leanprover/lean4:v4.28.0"
        assert result["lakefile"] == "lakefile.toml"
