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
from lean_tools import lean_project_info, lean_sorry_scan, lean_sync_state, find_lean_project


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

    @pytest.fixture
    def sync_project(self, tmp_path):
        """Create a project with Lean files AND a matching astrolabe store."""
        # Lean project
        lean_dir = tmp_path / "lean"
        lean_dir.mkdir()
        (lean_dir / "lakefile.toml").write_text('name = "Test"\n')
        (lean_dir / "lean-toolchain").write_text("leanprover/lean4:v4.28.0\n")
        (lean_dir / "Test.lean").write_text(
            "def MyDef : Nat := 42\n\n"
            "theorem proven_thm : 1 + 1 = 2 := by norm_num\n\n"
            "theorem sorry_thm : 2 + 2 = 5 := by\n"
            "  sorry\n\n"
            "lemma helper_lemma : True := trivial\n"
        )
        # Astrolabe store with matching atoms (no state yet)
        d = tmp_path / ".astrolabe"
        d.mkdir()
        data = {
            "a1": {"ref": ["a1"], "record": json.dumps({
                "sort": "definition", "source": "lean", "title": "Test.MyDef"
            })},
            "a2": {"ref": ["a2"], "record": json.dumps({
                "sort": "theorem", "source": "lean", "title": "Test.proven_thm"
            })},
            "a3": {"ref": ["a3"], "record": json.dumps({
                "sort": "theorem", "source": "lean", "title": "Test.sorry_thm"
            })},
            "a4": {"ref": ["a4"], "record": json.dumps({
                "sort": "lemma", "source": "lean", "title": "Test.helper_lemma"
            })},
            "a5": {"ref": ["a5"], "record": json.dumps({
                "sort": "proof", "source": "lean", "title": "Test.proven_thm (proof)"
            })},
            # tex atom (should be untouched)
            "t1": {"ref": ["t1"], "record": json.dumps({
                "sort": "theorem", "source": "tex", "title": "Some tex theorem"
            })},
        }
        (d / "astrolabe.json").write_text(json.dumps(data))
        return str(tmp_path)

    def test_lean_sync_state(self, sync_project):
        result = lean_sync_state(sync_project)
        assert "error" not in result
        assert result["updated"] > 0

        # Verify the store was updated
        store_path = Path(sync_project) / ".astrolabe" / "astrolabe.json"
        store = json.loads(store_path.read_text())

        # Collect updated states by title
        states = {}
        for h, e in store.items():
            rec = json.loads(e["record"])
            if rec.get("source") == "lean":
                states[rec.get("title", "")] = rec.get("state")

        # proven_thm has no sorry → proven
        assert states.get("Test.proven_thm") == "proven"
        # sorry_thm has sorry → sorry
        assert states.get("Test.sorry_thm") == "sorry"
        # MyDef has no sorry → checked
        assert states.get("Test.MyDef") == "checked"
        # helper_lemma has no sorry → proven
        assert states.get("Test.helper_lemma") == "proven"
        # proof objects should not get state
        assert states.get("Test.proven_thm (proof)") is None
        # tex atom should be untouched
        tex_states = {rec.get("title"): rec.get("state")
                      for e in store.values()
                      for rec in [json.loads(e["record"])]
                      if rec.get("source") == "tex"}
        assert tex_states.get("Some tex theorem") is None

    def test_lean_sync_state_preserves_wellformedness(self, sync_project):
        result = lean_sync_state(sync_project)
        assert "error" not in result
        # Validate store after sync
        val = do_validate_store(sync_project)
        assert val["valid"] is True

    def test_lean_sync_state_creates_missing_atoms(self, tmp_path):
        """lean_sync_state should create atoms for declarations not in the store."""
        # Lean project with 3 declarations
        lean_dir = tmp_path / "lean"
        lean_dir.mkdir()
        (lean_dir / "lakefile.toml").write_text("")
        src = lean_dir / "Test.lean"
        src.write_text(
            "theorem known_thm : True := trivial\n"
            "theorem unknown_sorry : Nat := sorry\n"
            "def unknown_def : Nat := 42\n"
        )
        # Store with only 1 matching atom (known_thm)
        d = tmp_path / ".astrolabe"
        d.mkdir()
        data = {
            "a1": {"ref": ["a1"], "record": json.dumps({
                "sort": "theorem", "source": "lean", "title": "known_thm"
            })},
        }
        (d / "astrolabe.json").write_text(json.dumps(data))

        result = lean_sync_state(str(tmp_path))
        assert "error" not in result
        assert result["created"] == 2  # unknown_sorry + unknown_def
        assert result["updated"] == 1  # known_thm: no state → proven

        # Verify creations
        names = {c["name"] for c in result["creations"]}
        assert "unknown_sorry" in names
        assert "unknown_def" in names

        # Verify store contains the new atoms
        store_path = d / "astrolabe.json"
        store = json.loads(store_path.read_text())
        all_titles = set()
        for e in store.values():
            rec = json.loads(e["record"]) if isinstance(e["record"], str) else e["record"]
            if isinstance(rec, dict) and rec.get("source") == "lean":
                all_titles.add(rec.get("title"))
        assert "unknown_sorry" in all_titles
        assert "unknown_def" in all_titles

    def test_lean_sync_state_creation_states(self, tmp_path):
        """Created atoms should have correct state (sorry/proven/checked)."""
        lean_dir = tmp_path / "lean"
        lean_dir.mkdir()
        (lean_dir / "lakefile.toml").write_text("")
        src = lean_dir / "Test.lean"
        src.write_text(
            "theorem sorry_thm : Nat := sorry\n"
            "theorem proved_thm : True := trivial\n"
            "def my_def : Nat := 42\n"
            "instance my_inst : Inhabited Nat := ⟨0⟩\n"
        )
        d = tmp_path / ".astrolabe"
        d.mkdir()
        (d / "astrolabe.json").write_text("{}")

        result = lean_sync_state(str(tmp_path))
        assert result["created"] == 4

        states = {c["name"]: c["state"] for c in result["creations"]}
        assert states["sorry_thm"] == "sorry"
        assert states["proved_thm"] == "proven"
        assert states["my_def"] == "checked"
        assert states["my_inst"] == "checked"

    def test_lean_sync_state_no_lean_project(self, tmp_path):
        # Store exists but no Lean project
        d = tmp_path / ".astrolabe"
        d.mkdir()
        (d / "astrolabe.json").write_text("{}")
        result = lean_sync_state(str(tmp_path))
        assert "error" in result


class TestNonDictRecords:
    """Entries with non-dict record values (int, list, bare string) must not crash."""

    @pytest.fixture
    def mixed_project(self, tmp_path):
        d = tmp_path / ".astrolabe"
        d.mkdir()
        data = {
            "ok1": {"ref": ["ok1"], "record": json.dumps({"sort": "theorem", "source": "tex", "title": "Good"})},
            "int1": {"ref": ["int1"], "record": "42"},
            "list1": {"ref": ["list1"], "record": json.dumps([1, 2, 3])},
            "str1": {"ref": ["str1"], "record": '"just a string"'},
            "bare": {"ref": ["bare"], "record": "not json at all {"},
        }
        (d / "astrolabe.json").write_text(json.dumps(data))
        return str(tmp_path)

    def test_store_summary_skips_non_dict(self, mixed_project):
        from core_tools import store_summary
        result = store_summary(mixed_project)
        assert result["total"] == 5
        assert result["tex"] == 1  # only ok1

    def test_query_skips_non_dict(self, mixed_project):
        result = query_entries(mixed_project, sort="theorem")
        assert result["count"] == 1  # only ok1

    def test_search_skips_non_dict(self, mixed_project):
        result = search_entries(mixed_project, "Good")
        assert result["count"] == 1
        # searching for "42" should not crash
        result2 = search_entries(mixed_project, "42")
        assert result2["count"] == 0

    def test_get_entry_non_dict_record(self, mixed_project):
        result = get_entry(mixed_project, "int1")
        assert result["hash"] == "int1"
        assert result["record"] == "42"  # raw record is preserved
