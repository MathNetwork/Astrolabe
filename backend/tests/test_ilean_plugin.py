"""
ilean 插件解析测试（TDD — 先写测试）

从 .ilean 文件解析 Lean 声明为 Astrolabe obj/mor 格式。
"""
import hashlib
import json
import tempfile
from pathlib import Path

import pytest


# ── 最小 .ilean fixture ──

MINIMAL_ILEAN = {
    "module": "MyProject.Basic",
    "directImports": [["Init"]],
    "references": {
        # theorem myThm
        '{"c":{"m":"MyProject.Basic","n":"myThm"}}': {
            "definition": [5, 8, 5, 13],
            "usages": [],
        },
        # def myDef
        '{"c":{"m":"MyProject.Basic","n":"myDef"}}': {
            "definition": [10, 4, 10, 9],
            "usages": [],
        },
        # lemma myLemma (uses myThm and myDef)
        '{"c":{"m":"MyProject.Basic","n":"myLemma"}}': {
            "definition": [15, 6, 15, 14],
            "usages": [],
        },
        # myThm is used by myLemma
        '{"c":{"m":"MyProject.Basic","n":"myThm_usage"}}': {
            "definition": None,
            "usages": [[16, 10, 16, 15, "myLemma"]],
        },
    },
}

MINIMAL_SOURCE = """import Init

namespace MyProject.Basic

theorem myThm : 1 + 1 = 2 := by
  omega

section

def myDef : Nat := 42

end

lemma myLemma : 1 + 1 = 2 := by
  exact myThm
  sorry

end MyProject.Basic
"""


def _make_ilean_project(tmp: Path) -> Path:
    """创建最小 Lean 项目结构。"""
    # .ilean file
    ilean_dir = tmp / ".lake" / "build" / "lib" / "lean" / "MyProject"
    ilean_dir.mkdir(parents=True)
    (ilean_dir / "Basic.ilean").write_text(json.dumps(MINIMAL_ILEAN))
    # lakefile.lean
    (tmp / "lakefile.lean").write_text('lean_lib MyProject')
    # Source file
    src_dir = tmp / "MyProject"
    src_dir.mkdir()
    (src_dir / "Basic.lean").write_text(MINIMAL_SOURCE)
    return tmp


def _expected_hash(name: str) -> str:
    return hashlib.sha256(name.encode()).hexdigest()[:12]


# =========================================
# 1. 解析核心
# =========================================

class TestIleanParseCore:

    def test_parse_returns_objects_and_morphisms(self):
        """解析返回 objects 和 morphisms 列表。"""
        from astrolabe.functors.builtin.lean.ilean_parser import parse_lean_project
        with tempfile.TemporaryDirectory() as tmp:
            _make_ilean_project(Path(tmp))
            result = parse_lean_project(Path(tmp))
            assert "objects" in result
            assert "morphisms" in result
            assert isinstance(result["objects"], list)
            assert isinstance(result["morphisms"], list)

    def test_obj_has_required_fields(self):
        """每个 obj 有 id, name, sort, status。"""
        from astrolabe.functors.builtin.lean.ilean_parser import parse_lean_project
        with tempfile.TemporaryDirectory() as tmp:
            _make_ilean_project(Path(tmp))
            result = parse_lean_project(Path(tmp))
            for obj in result["objects"]:
                assert "id" in obj
                assert "name" in obj
                assert "sort" in obj
                assert "status" in obj

    def test_obj_id_is_sha256_hash(self):
        """obj id 是 sha256(lean_full_name)[:12]。"""
        from astrolabe.functors.builtin.lean.ilean_parser import parse_lean_project
        with tempfile.TemporaryDirectory() as tmp:
            _make_ilean_project(Path(tmp))
            result = parse_lean_project(Path(tmp))
            thm = next(o for o in result["objects"] if o["name"] == "myThm")
            expected = _expected_hash("MyProject.Basic.myThm")
            assert thm["id"] == expected

    def test_deterministic_ids(self):
        """同一个项目解析两次，id 完全相同。"""
        from astrolabe.functors.builtin.lean.ilean_parser import parse_lean_project
        with tempfile.TemporaryDirectory() as tmp:
            _make_ilean_project(Path(tmp))
            r1 = parse_lean_project(Path(tmp))
            r2 = parse_lean_project(Path(tmp))
            ids1 = sorted(o["id"] for o in r1["objects"])
            ids2 = sorted(o["id"] for o in r2["objects"])
            assert ids1 == ids2

    def test_theorem_sort(self):
        """theorem → sort 'lean-theorem'。"""
        from astrolabe.functors.builtin.lean.ilean_parser import parse_lean_project
        with tempfile.TemporaryDirectory() as tmp:
            _make_ilean_project(Path(tmp))
            result = parse_lean_project(Path(tmp))
            thm = next(o for o in result["objects"] if o["name"] == "myThm")
            assert thm["sort"] == "lean-theorem"

    def test_definition_sort(self):
        """def → sort 'lean-definition'。"""
        from astrolabe.functors.builtin.lean.ilean_parser import parse_lean_project
        with tempfile.TemporaryDirectory() as tmp:
            _make_ilean_project(Path(tmp))
            result = parse_lean_project(Path(tmp))
            d = next(o for o in result["objects"] if o["name"] == "myDef")
            assert d["sort"] == "lean-definition"

    def test_lemma_sort(self):
        """lemma → sort 'lean-lemma'。"""
        from astrolabe.functors.builtin.lean.ilean_parser import parse_lean_project
        with tempfile.TemporaryDirectory() as tmp:
            _make_ilean_project(Path(tmp))
            result = parse_lean_project(Path(tmp))
            lem = next(o for o in result["objects"] if o["name"] == "myLemma")
            assert lem["sort"] == "lean-lemma"

    def test_sorry_status(self):
        """有 sorry 的声明 → status 'sorry'。"""
        from astrolabe.functors.builtin.lean.ilean_parser import parse_lean_project
        with tempfile.TemporaryDirectory() as tmp:
            _make_ilean_project(Path(tmp))
            result = parse_lean_project(Path(tmp))
            lem = next(o for o in result["objects"] if o["name"] == "myLemma")
            assert lem["status"] == "sorry"

    def test_proven_status(self):
        """无 sorry 的声明 → status 'proven'。"""
        from astrolabe.functors.builtin.lean.ilean_parser import parse_lean_project
        with tempfile.TemporaryDirectory() as tmp:
            _make_ilean_project(Path(tmp))
            result = parse_lean_project(Path(tmp))
            thm = next(o for o in result["objects"] if o["name"] == "myThm")
            assert thm["status"] == "proven"

    def test_morphisms_have_sort_uses(self):
        """mor 的 sort 是 'uses'。"""
        from astrolabe.functors.builtin.lean.ilean_parser import parse_lean_project
        with tempfile.TemporaryDirectory() as tmp:
            _make_ilean_project(Path(tmp))
            result = parse_lean_project(Path(tmp))
            if result["morphisms"]:
                for mor in result["morphisms"]:
                    assert mor["sort"] == "uses"
                    assert "source" in mor
                    assert "target" in mor
                    assert "id" in mor
