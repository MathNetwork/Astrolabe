"""
确保后端 knowledge storage 永远不输出被禁字段。
style/confidence/tags/scope/source 都不该出现在节点数据里。
"""
import json
import tempfile
from pathlib import Path

from astrolabe.knowledge_storage import KnowledgeStorage

FORBIDDEN_FIELDS = {"style", "confidence", "tags", "scope", "source"}


def _make_store(tmp: Path, data: dict | None = None) -> KnowledgeStorage:
    astrolabe_dir = tmp / ".astrolabe"
    astrolabe_dir.mkdir(parents=True, exist_ok=True)
    if data:
        (astrolabe_dir / "signature.json").write_text(json.dumps(data), encoding="utf-8")
    return KnowledgeStorage(tmp)


def _assert_no_forbidden(obj: dict):
    for field in FORBIDDEN_FIELDS:
        assert field not in obj, f"obj 不应该包含 {field}，但拿到了: {obj.get(field)}"


def test_create_obj_no_forbidden_fields():
    """新建 obj 不能包含被禁字段。"""
    with tempfile.TemporaryDirectory() as tmp:
        store = _make_store(Path(tmp))
        obj = store.create_node(name="Test Theorem", kind="theorem")
        _assert_no_forbidden(obj)


def test_get_graph_strips_forbidden_fields():
    """即使 JSON 里有旧的被禁字段，API 输出也不能包含。"""
    with tempfile.TemporaryDirectory() as tmp:
        old_data = {
            "nodes": {
                "abc123": {
                    "id": "abc123",
                    "name": "Old Node",
                    "kind": "theorem",
                    "status": "stated",
                    "confidence": 5,
                    "statement": "",
                    "proof": "",
                    "intuition": "",
                    "notes": "",
                    "tags": ["foo"],
                    "scope": "global",
                    "source": {"text": "x", "chapter": "1", "label": "1.1"},
                    "style": {"color": "#833AB4"},
                    "position": {"x": 0, "y": 0, "z": 0},
                    "created_at": "2026-01-01T00:00:00+00:00",
                    "updated_at": "2026-01-01T00:00:00+00:00",
                }
            },
            "edges": {},
        }
        store = _make_store(Path(tmp), old_data)
        graph = store.get_graph()
        for obj in graph["obj"]:
            _assert_no_forbidden(obj)


def test_update_obj_ignores_forbidden_fields():
    """update_node 传入被禁字段应该被忽略。"""
    with tempfile.TemporaryDirectory() as tmp:
        store = _make_store(Path(tmp))
        obj = store.create_node(name="Test", kind="lemma")
        updated = store.update_node(
            obj["id"],
            style={"color": "#ff0000"},
            confidence=3,
            tags=["x"],
            scope="local",
            source={"text": "y"},
        )
        _assert_no_forbidden(updated)


def test_mors_as_list_does_not_crash():
    """mor 是列表格式时不应该崩溃。"""
    with tempfile.TemporaryDirectory() as tmp:
        old_data = {"nodes": {}, "edges": []}
        store = _make_store(Path(tmp), old_data)
        graph = store.get_graph()
        assert graph["obj"] == []
        assert graph["mor"] == []
