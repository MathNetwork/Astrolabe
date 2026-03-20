"""
范畴论 schema 测试

知识图谱采用范畴论数据模型：
- Object (节点): 用 `sort` 字段标识 object sort (theorem, definition, ...)
- Morphism (边): 无 sort 分类，含义通过 notes 描述
- JSON 顶层键: `obj` (objects), `mor` (morphisms)
"""
import json
import tempfile
from pathlib import Path

from astrolabe.signature_storage import SignatureStorage


def _make_store(tmp: Path, data: dict | None = None) -> SignatureStorage:
    astrolabe_dir = tmp / ".astrolabe"
    astrolabe_dir.mkdir(parents=True, exist_ok=True)
    if data:
        (astrolabe_dir / "signature.json").write_text(json.dumps(data), encoding="utf-8")
    return SignatureStorage(tmp)


# =========================================
# 1. Object sort
# =========================================

class TestObjectSort:
    """对象(节点)保留 sort 字段。"""

    def test_create_obj_uses_sort_field(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            obj = store.create_obj(name="Test Theorem", sort="theorem")
            assert "sort" in obj
            assert obj["sort"] == "theorem"
            assert "kind" not in obj

    def test_update_obj_sort(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            obj = store.create_obj(name="X", sort="theorem")
            updated = store.update_obj(obj["id"], sort="lemma")
            assert updated["sort"] == "lemma"

    def test_get_graph_uses_obj_mor_keys(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            store.create_obj(name="X", sort="definition")
            graph = store.get_graph()
            assert "obj" in graph
            assert "mor" in graph
            assert "nodes" not in graph
            assert "edges" not in graph


# =========================================
# 2. Morphism sort（可选字段）
# =========================================

class TestMorphismSort:
    """态射(边)有可选的 sort 字段，用于分类关系类型。"""

    def test_create_mor_without_sort(self):
        """不传 sort 时，返回的 mor 没有 sort 字段。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            n1 = store.create_obj(name="A", sort="lemma")
            n2 = store.create_obj(name="B", sort="theorem")
            mor = store.create_mor(source=n1["id"], target=n2["id"],
                                    notes="A proves B")
            assert mor.get("sort") is None or "sort" not in mor
            assert mor["notes"] == "A proves B"

    def test_create_mor_with_sort(self):
        """传 sort 时，返回的 mor 包含正确的 sort 值。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            n1 = store.create_obj(name="A", sort="theorem")
            n2 = store.create_obj(name="B", sort="theorem")
            mor = store.create_mor(source=n1["id"], target=n2["id"],
                                    sort="implies", notes="A implies B")
            assert mor["sort"] == "implies"

    def test_update_mor_sort(self):
        """update_edge 可以修改 sort。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            n1 = store.create_obj(name="A", sort="theorem")
            n2 = store.create_obj(name="B", sort="definition")
            mor = store.create_mor(source=n1["id"], target=n2["id"],
                                    sort="uses")
            updated = store.update_mor(mor["id"], sort="depends_on")
            assert updated["sort"] == "depends_on"

    def test_update_mor_notes(self):
        """update_edge 可以修改 notes。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            n1 = store.create_obj(name="A", sort="theorem")
            n2 = store.create_obj(name="B", sort="definition")
            mor = store.create_mor(source=n1["id"], target=n2["id"])
            updated = store.update_mor(mor["id"], notes="A uses B")
            assert updated["notes"] == "A uses B"

    def test_saved_json_mor_has_sort(self):
        """磁盘上保存的态射包含 sort 字段。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            n1 = store.create_obj(name="A", sort="theorem")
            n2 = store.create_obj(name="B", sort="theorem")
            store.create_mor(source=n1["id"], target=n2["id"],
                              sort="proves", notes="test")
            raw = json.loads((Path(tmp) / ".astrolabe" / "signature.json").read_text())
            mor = list(raw["mor"].values())[0]
            assert mor["sort"] == "proves"

    def test_backward_compat_no_sort_loads_ok(self):
        """旧数据无 sort 字段的 mor 加载不报错。"""
        with tempfile.TemporaryDirectory() as tmp:
            old_data = {
                "obj": {
                    "a": {"id": "a", "name": "A", "sort": "theorem", "status": "stated",
                          "statement": "", "proof": "", "intuition": "", "notes": "",
                          "position": {"x": 0, "y": 0, "z": 0},
                          "created_at": "2026-01-01", "updated_at": "2026-01-01"},
                    "b": {"id": "b", "name": "B", "sort": "theorem", "status": "stated",
                          "statement": "", "proof": "", "intuition": "", "notes": "",
                          "position": {"x": 0, "y": 0, "z": 0},
                          "created_at": "2026-01-01", "updated_at": "2026-01-01"},
                },
                "mor": {
                    "e1": {"id": "e1", "source": "a", "target": "b",
                           "strict": True, "label": "", "notes": "old edge"},
                },
            }
            store = _make_store(Path(tmp), old_data)
            graph = store.get_graph()
            mor = graph["mor"][0]
            assert mor["notes"] == "old edge"
            # 旧数据无 sort，不应报错


# =========================================
# 3. 向后兼容
# =========================================

class TestBackwardCompatibility:
    """加载旧 schema 自动迁移，mor 的 sort/relation 字段被清除。"""

    def test_load_old_nodes_edges_keys(self):
        with tempfile.TemporaryDirectory() as tmp:
            old_data = {
                "nodes": {
                    "abc": {"id": "abc", "name": "T", "kind": "theorem", "status": "stated",
                            "statement": "", "proof": "", "intuition": "", "notes": "",
                            "position": {"x": 0, "y": 0, "z": 0},
                            "created_at": "2026-01-01T00:00:00+00:00",
                            "updated_at": "2026-01-01T00:00:00+00:00"}
                },
                "edges": {
                    "xyz": {"id": "xyz", "source": "abc", "target": "abc",
                            "relation": "related", "strict": True, "label": "", "notes": ""}
                },
            }
            store = _make_store(Path(tmp), old_data)
            graph = store.get_graph()
            assert "obj" in graph
            assert "mor" in graph
            # 节点 kind → sort
            obj = graph["obj"][0]
            assert obj["sort"] == "theorem"
            assert "kind" not in obj
            # 旧 relation 字段应被迁移：relation 值 → sort 字段
            mor = graph["mor"][0]
            assert "relation" not in mor
            assert mor["sort"] == "related"

    def test_load_old_sort_field_preserved(self):
        """旧的带 sort 字段的 mor，加载后 sort 保留。"""
        with tempfile.TemporaryDirectory() as tmp:
            old_data = {
                "obj": {
                    "a": {"id": "a", "name": "A", "sort": "theorem", "status": "stated",
                          "statement": "", "proof": "", "intuition": "", "notes": "",
                          "position": {"x": 0, "y": 0, "z": 0},
                          "created_at": "2026-01-01", "updated_at": "2026-01-01"},
                },
                "mor": {
                    "e1": {"id": "e1", "source": "a", "target": "a",
                           "sort": "proves", "strict": True, "label": "", "notes": "A proves A"},
                },
            }
            store = _make_store(Path(tmp), old_data)
            graph = store.get_graph()
            mor = graph["mor"][0]
            assert mor["sort"] == "proves"
            assert mor["notes"] == "A proves A"

    def test_old_relation_migrated_to_sort(self):
        """旧的 relation 字段值应迁移到 sort 字段。"""
        with tempfile.TemporaryDirectory() as tmp:
            old_data = {
                "nodes": {
                    "a": {"id": "a", "name": "A", "kind": "definition", "status": "stated",
                          "statement": "", "proof": "", "intuition": "", "notes": "",
                          "position": {"x": 0, "y": 0, "z": 0},
                          "created_at": "2026-01-01", "updated_at": "2026-01-01"},
                    "b": {"id": "b", "name": "B", "kind": "definition", "status": "stated",
                          "statement": "", "proof": "", "intuition": "", "notes": "",
                          "position": {"x": 0, "y": 0, "z": 0},
                          "created_at": "2026-01-01", "updated_at": "2026-01-01"},
                },
                "edges": {
                    "e1": {"id": "e1", "source": "a", "target": "b",
                           "relation": "proves", "strict": True, "label": "", "notes": ""},
                },
            }
            store = _make_store(Path(tmp), old_data)
            graph = store.get_graph()
            mor = graph["mor"][0]
            assert mor["sort"] == "proves"
            assert "relation" not in mor
