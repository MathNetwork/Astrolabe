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

from astrolabe.knowledge_storage import KnowledgeStorage


def _make_store(tmp: Path, data: dict | None = None) -> KnowledgeStorage:
    astrolabe_dir = tmp / ".astrolabe"
    astrolabe_dir.mkdir(parents=True, exist_ok=True)
    if data:
        (astrolabe_dir / "knowledge.json").write_text(json.dumps(data), encoding="utf-8")
    return KnowledgeStorage(tmp)


# =========================================
# 1. Object sort
# =========================================

class TestObjectSort:
    """对象(节点)保留 sort 字段。"""

    def test_create_node_uses_sort_field(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            node = store.create_node(name="Test Theorem", sort="theorem")
            assert "sort" in node
            assert node["sort"] == "theorem"
            assert "kind" not in node

    def test_update_node_sort(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            node = store.create_node(name="X", sort="theorem")
            updated = store.update_node(node["id"], sort="lemma")
            assert updated["sort"] == "lemma"

    def test_get_graph_uses_obj_mor_keys(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            store.create_node(name="X", sort="definition")
            graph = store.get_graph()
            assert "obj" in graph
            assert "mor" in graph
            assert "nodes" not in graph
            assert "edges" not in graph


# =========================================
# 2. Morphism 无 sort
# =========================================

class TestMorphismNoSort:
    """态射(边)不再有 sort 字段，含义通过 notes 描述。"""

    def test_create_edge_no_sort(self):
        """create_edge 不需要 sort 参数，输出也不含 sort。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            n1 = store.create_node(name="A", sort="lemma")
            n2 = store.create_node(name="B", sort="theorem")
            edge = store.create_edge(source=n1["id"], target=n2["id"],
                                     notes="A proves B")
            assert "sort" not in edge
            assert "relation" not in edge
            assert edge["notes"] == "A proves B"

    def test_create_edge_with_legacy_sort_ignored(self):
        """传入 sort 参数时应被忽略（向后兼容，不报错）。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            n1 = store.create_node(name="A", sort="theorem")
            n2 = store.create_node(name="B", sort="theorem")
            edge = store.create_edge(source=n1["id"], target=n2["id"], sort="proves")
            assert "sort" not in edge

    def test_update_edge_notes(self):
        """update_edge 可以修改 notes。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            n1 = store.create_node(name="A", sort="theorem")
            n2 = store.create_node(name="B", sort="definition")
            edge = store.create_edge(source=n1["id"], target=n2["id"])
            updated = store.update_edge(edge["id"], notes="A uses B")
            assert updated["notes"] == "A uses B"
            assert "sort" not in updated

    def test_saved_json_morphism_no_sort(self):
        """磁盘上保存的态射不含 sort 字段。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            n1 = store.create_node(name="A", sort="theorem")
            n2 = store.create_node(name="B", sort="theorem")
            store.create_edge(source=n1["id"], target=n2["id"], notes="test")
            raw = json.loads((Path(tmp) / ".astrolabe" / "knowledge.json").read_text())
            for mor in raw["mor"].values():
                assert "sort" not in mor
                assert "relation" not in mor


# =========================================
# 3. 向后兼容
# =========================================

class TestBackwardCompatibility:
    """加载旧 schema 自动迁移，边的 sort/relation 字段被清除。"""

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
            # 边的 relation/sort 应该被清除
            mor = graph["mor"][0]
            assert "sort" not in mor
            assert "relation" not in mor

    def test_load_old_sort_field_stripped(self):
        """旧的带 sort 字段的边，加载后 sort 被清除。"""
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
            assert "sort" not in mor
            assert mor["notes"] == "A proves A"

    def test_old_relation_migrated_to_notes(self):
        """旧的 relation 字段值应追加到 notes（如果 notes 为空）。"""
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
            assert "sort" not in mor
            # 旧 relation 值应被保留到 notes 中
            assert "proves" in mor["notes"].lower()
