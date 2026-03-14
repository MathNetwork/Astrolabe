"""
范畴论 schema 重构测试

知识图谱采用 multi-sorted category 的数据模型：
- Object (节点): 用 `sort` 字段标识 object sort (theorem, definition, ...)
- Morphism (边): 用 `sort` 字段标识 morphism sort (proves, uses, ...)
- JSON 顶层键: `obj` (objects), `mor` (morphisms)

旧 schema:
  { "nodes": { id: { "kind": "theorem", ... } }, "edges": { id: { "relation": "uses", ... } } }

新 schema:
  { "obj": { id: { "sort": "theorem", ... } }, "mor": { id: { "sort": "uses", ... } } }
"""
import json
import tempfile
from pathlib import Path

from netmath.knowledge_storage import KnowledgeStorage


def _make_store(tmp: Path, data: dict | None = None) -> KnowledgeStorage:
    netmath_dir = tmp / ".netmath"
    netmath_dir.mkdir(parents=True, exist_ok=True)
    if data:
        (netmath_dir / "knowledge.json").write_text(json.dumps(data), encoding="utf-8")
    return KnowledgeStorage(tmp)


# =========================================
# 1. 新 schema: obj/mor + sort
# =========================================

class TestNewSchema:
    """新 schema 使用 obj/mor 顶层键和 sort 字段。"""

    def test_create_node_uses_sort_field(self):
        """create_node 输出的节点应该用 sort 而不是 kind。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            node = store.create_node(name="Test Theorem", sort="theorem")
            assert "sort" in node
            assert node["sort"] == "theorem"
            assert "kind" not in node

    def test_create_edge_uses_sort_field(self):
        """create_edge 输出的边应该用 sort 而不是 relation。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            n1 = store.create_node(name="A", sort="lemma")
            n2 = store.create_node(name="B", sort="theorem")
            edge = store.create_edge(source=n1["id"], target=n2["id"], sort="proves")
            assert "sort" in edge
            assert edge["sort"] == "proves"
            assert "relation" not in edge

    def test_get_graph_uses_obj_mor_keys(self):
        """get_graph 应该返回 obj/mor 顶层键。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            store.create_node(name="X", sort="definition")
            graph = store.get_graph()
            assert "obj" in graph
            assert "mor" in graph
            assert "nodes" not in graph
            assert "edges" not in graph

    def test_saved_json_uses_new_schema(self):
        """保存到磁盘的 JSON 应该使用新 schema。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            store.create_node(name="T", sort="theorem")
            raw = json.loads((Path(tmp) / ".netmath" / "knowledge.json").read_text())
            assert "obj" in raw
            assert "mor" in raw
            # 节点应该用 sort
            for node in raw["obj"].values():
                assert "sort" in node
                assert "kind" not in node

    def test_valid_morphism_sorts(self):
        """只允许 proves, uses, motivates, contradicts, related。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            n1 = store.create_node(name="A", sort="theorem")
            n2 = store.create_node(name="B", sort="theorem")
            # 合法 sort
            for s in ("proves", "uses", "motivates", "contradicts", "related"):
                edge = store.create_edge(source=n1["id"], target=n2["id"], sort=s)
                assert edge["sort"] == s
                store.delete_edge(edge["id"])

    def test_invalid_morphism_sort_rejected(self):
        """不合法的 morphism sort 应该被拒绝。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            n1 = store.create_node(name="A", sort="theorem")
            n2 = store.create_node(name="B", sort="theorem")
            import pytest
            with pytest.raises(ValueError):
                store.create_edge(source=n1["id"], target=n2["id"], sort="generalizes")
            with pytest.raises(ValueError):
                store.create_edge(source=n1["id"], target=n2["id"], sort="specializes")

    def test_update_node_sort(self):
        """update_node 应该能修改 sort 字段。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            node = store.create_node(name="X", sort="theorem")
            updated = store.update_node(node["id"], sort="lemma")
            assert updated["sort"] == "lemma"
            assert "kind" not in updated

    def test_update_edge_sort(self):
        """update_edge 应该能修改 sort 字段。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            n1 = store.create_node(name="A", sort="theorem")
            n2 = store.create_node(name="B", sort="definition")
            edge = store.create_edge(source=n1["id"], target=n2["id"], sort="uses")
            updated = store.update_edge(edge["id"], sort="proves")
            assert updated["sort"] == "proves"
            assert "relation" not in updated


# =========================================
# 2. 向后兼容: 加载旧格式
# =========================================

class TestBackwardCompatibility:
    """加载旧 schema (nodes/edges + kind/relation) 应该自动迁移。"""

    def test_load_old_nodes_edges_keys(self):
        """旧的 nodes/edges 顶层键应该被识别并迁移。"""
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
            # 应该用新 schema 输出
            assert "obj" in graph
            assert "mor" in graph
            # 节点的 kind 应该被迁移为 sort
            obj = graph["obj"][0]
            assert obj["sort"] == "theorem"
            assert "kind" not in obj
            # 边的 relation 应该被迁移为 sort
            mor = graph["mor"][0]
            assert mor["sort"] == "related"
            assert "relation" not in mor

    def test_load_old_format_resaves_as_new(self):
        """加载旧格式后，下次保存应该是新格式。"""
        with tempfile.TemporaryDirectory() as tmp:
            old_data = {
                "nodes": {"a": {"id": "a", "name": "N", "kind": "lemma", "status": "stated",
                                "statement": "", "proof": "", "intuition": "", "notes": "",
                                "position": {"x": 0, "y": 0, "z": 0},
                                "created_at": "2026-01-01", "updated_at": "2026-01-01"}},
                "edges": {},
            }
            store = _make_store(Path(tmp), old_data)
            # Trigger a save by creating a new node
            store.create_node(name="New", sort="definition")
            raw = json.loads((Path(tmp) / ".netmath" / "knowledge.json").read_text())
            assert "obj" in raw
            assert "nodes" not in raw
            assert "mor" in raw
            assert "edges" not in raw

    def test_old_generalizes_specializes_migrated(self):
        """旧的 generalizes/specializes 边应该在加载时被迁移为 uses。"""
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
                           "relation": "generalizes", "strict": True, "label": "", "notes": ""},
                    "e2": {"id": "e2", "source": "b", "target": "a",
                           "relation": "specializes", "strict": True, "label": "", "notes": ""},
                },
            }
            store = _make_store(Path(tmp), old_data)
            graph = store.get_graph()
            for mor in graph["mor"]:
                assert mor["sort"] in ("uses", "related"), \
                    f"generalizes/specializes should be migrated, got: {mor['sort']}"
