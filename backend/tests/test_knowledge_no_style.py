"""
Signature storage is field-agnostic — stores any key-value info.
Legacy migration still strips deprecated fields from old data.
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


def test_create_obj_stores_arbitrary_fields():
    """Field-agnostic: any key-value pair is stored."""
    with tempfile.TemporaryDirectory() as tmp:
        store = _make_store(Path(tmp))
        obj = store.create_obj(custom_field="hello", another=42)
        assert obj["custom_field"] == "hello"
        assert obj["another"] == 42
        assert "id" in obj


def test_update_obj_stores_arbitrary_fields():
    """update_obj merges any key-value pair."""
    with tempfile.TemporaryDirectory() as tmp:
        store = _make_store(Path(tmp))
        obj = store.create_obj(name="Test")
        updated = store.update_obj(
            obj["id"],
            style={"color": "#ff0000"},
            confidence=3,
            tags=["x"],
        )
        assert updated["style"] == {"color": "#ff0000"}
        assert updated["confidence"] == 3
        assert updated["tags"] == ["x"]


def test_get_graph_preserves_all_fields():
    """All fields in signature.json are preserved, including legacy ones."""
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
                    "position": {"x": 0, "y": 0, "z": 0},
                    "created_at": "2026-01-01T00:00:00+00:00",
                    "updated_at": "2026-01-01T00:00:00+00:00",
                }
            },
            "edges": {},
        }
        store = _make_store(Path(tmp), old_data)
        graph = store.get_graph()
        obj = graph["obj"][0]
        # kind → sort migration happens
        assert obj["sort"] == "theorem"
        assert "kind" not in obj
        # All other fields preserved
        assert obj["confidence"] == 5
        assert obj["tags"] == ["foo"]


def test_mors_as_list_does_not_crash():
    """mor 是列表格式时不应该崩溃。"""
    with tempfile.TemporaryDirectory() as tmp:
        old_data = {"nodes": {}, "edges": []}
        store = _make_store(Path(tmp), old_data)
        graph = store.get_graph()
        assert graph["obj"] == []
        assert graph["mor"] == []
