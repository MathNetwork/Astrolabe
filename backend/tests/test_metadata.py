"""
metadata 扩展字段测试（TDD — 先写测试）

obj 和 mor 支持可选的 metadata 字典，
函子可以通过 metadata 写回分析结果。
"""
import json
import tempfile
from pathlib import Path

from astrolabe.knowledge_storage import KnowledgeStorage


def _make_store(tmp: Path, data: dict | None = None) -> KnowledgeStorage:
    astrolabe_dir = tmp / ".astrolabe"
    astrolabe_dir.mkdir(parents=True, exist_ok=True)
    if data:
        (astrolabe_dir / "signature.json").write_text(json.dumps(data), encoding="utf-8")
    return KnowledgeStorage(tmp)


# =========================================
# 1. Obj metadata
# =========================================

class TestObjMetadata:
    """obj 支持 metadata 字典字段。"""

    def test_create_obj_with_metadata(self):
        """create_node 可以传 metadata 字典。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            obj = store.create_node(
                name="Test", sort="theorem",
                metadata={"centrality": 0.85, "functor": "degree"}
            )
            assert "metadata" in obj
            assert obj["metadata"]["centrality"] == 0.85
            assert obj["metadata"]["functor"] == "degree"

    def test_create_obj_without_metadata(self):
        """不传 metadata 时 obj 正常创建，无 metadata 字段。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            obj = store.create_node(name="Test", sort="theorem")
            assert "metadata" not in obj or obj.get("metadata") is None

    def test_update_obj_metadata(self):
        """update_node 可以设置/更新 metadata。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            obj = store.create_node(name="Test", sort="theorem")
            updated = store.update_node(obj["id"], metadata={"score": 0.5})
            assert updated["metadata"]["score"] == 0.5

    def test_update_obj_metadata_merge(self):
        """update_node 的 metadata 应该合并而非覆盖。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            obj = store.create_node(
                name="Test", sort="theorem",
                metadata={"a": 1, "b": 2}
            )
            updated = store.update_node(obj["id"], metadata={"b": 3, "c": 4})
            assert updated["metadata"]["a"] == 1  # 保留
            assert updated["metadata"]["b"] == 3  # 更新
            assert updated["metadata"]["c"] == 4  # 新增

    def test_obj_metadata_persists_to_disk(self):
        """metadata 应该持久化到 signature.json。"""
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            obj = store.create_node(
                name="Test", sort="theorem",
                metadata={"key": "value"}
            )
            raw = json.loads((Path(tmp) / ".astrolabe" / "signature.json").read_text())
            saved = raw["obj"][obj["id"]]
            assert saved["metadata"]["key"] == "value"

    def test_load_old_data_without_metadata(self):
        """旧数据无 metadata 字段加载不报错。"""
        with tempfile.TemporaryDirectory() as tmp:
            old_data = {
                "obj": {
                    "a": {"id": "a", "name": "A", "sort": "theorem", "status": "stated",
                          "statement": "", "proof": "", "intuition": "", "notes": "",
                          "position": {"x": 0, "y": 0, "z": 0},
                          "created_at": "2026-01-01", "updated_at": "2026-01-01"},
                },
                "mor": {},
            }
            store = _make_store(Path(tmp), old_data)
            graph = store.get_graph()
            obj = graph["obj"][0]
            assert obj["name"] == "A"
            # 无 metadata 不报错

    def test_migrate_does_not_strip_metadata(self):
        """_migrate_schema 不应该 strip metadata 字段。"""
        with tempfile.TemporaryDirectory() as tmp:
            data = {
                "obj": {
                    "a": {"id": "a", "name": "A", "sort": "theorem", "status": "stated",
                          "statement": "", "proof": "", "intuition": "", "notes": "",
                          "position": {"x": 0, "y": 0, "z": 0},
                          "metadata": {"functor_result": 42},
                          "created_at": "2026-01-01", "updated_at": "2026-01-01"},
                },
                "mor": {},
            }
            store = _make_store(Path(tmp), data)
            obj = store.get_node("a")
            assert obj["metadata"]["functor_result"] == 42


# =========================================
# 2. Mor metadata
# =========================================

class TestMorMetadata:
    """mor 支持 metadata 字典字段。"""

    def test_create_mor_with_metadata(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            n1 = store.create_node(name="A", sort="theorem")
            n2 = store.create_node(name="B", sort="definition")
            mor = store.create_edge(
                source=n1["id"], target=n2["id"],
                metadata={"weight": 0.7}
            )
            assert mor["metadata"]["weight"] == 0.7

    def test_create_mor_without_metadata(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            n1 = store.create_node(name="A", sort="theorem")
            n2 = store.create_node(name="B", sort="definition")
            mor = store.create_edge(source=n1["id"], target=n2["id"])
            assert "metadata" not in mor or mor.get("metadata") is None

    def test_update_mor_metadata(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            n1 = store.create_node(name="A", sort="theorem")
            n2 = store.create_node(name="B", sort="definition")
            mor = store.create_edge(source=n1["id"], target=n2["id"])
            updated = store.update_edge(mor["id"], metadata={"curvature": -0.3})
            assert updated["metadata"]["curvature"] == -0.3

    def test_mor_metadata_persists_to_disk(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = _make_store(Path(tmp))
            n1 = store.create_node(name="A", sort="theorem")
            n2 = store.create_node(name="B", sort="definition")
            mor = store.create_edge(
                source=n1["id"], target=n2["id"],
                metadata={"key": "val"}
            )
            raw = json.loads((Path(tmp) / ".astrolabe" / "signature.json").read_text())
            saved = raw["mor"][mor["id"]]
            assert saved["metadata"]["key"] == "val"
