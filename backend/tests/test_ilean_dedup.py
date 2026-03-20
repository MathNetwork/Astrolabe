"""
ilean 导入去重测试（TDD — 先写测试）

第二次导入同一个 .ilean 文件时，已存在的 obj/mor 被标记为 existing。
"""
import json
import tempfile
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport

from astrolabe.server import app, _loaded_plugins
from astrolabe.knowledge_storage import KnowledgeStorage


@pytest.fixture(autouse=True)
def clear_plugin_cache():
    _loaded_plugins.clear()
    yield
    _loaded_plugins.clear()


def _make_lean_project(tmp: Path) -> Path:
    astrolabe_dir = tmp / ".astrolabe"
    astrolabe_dir.mkdir()
    (astrolabe_dir / "knowledge.json").write_text('{"obj": {}, "mor": {}}')

    ilean_dir = tmp / ".lake" / "build" / "lib" / "lean" / "TestProj"
    ilean_dir.mkdir(parents=True)
    (ilean_dir / "Main.ilean").write_text(json.dumps({
        "module": "TestProj.Main",
        "directImports": [],
        "references": {
            '{"c":{"m":"TestProj.Main","n":"alpha"}}': {
                "definition": [1, 0, 1, 5], "usages": [],
            },
            '{"c":{"m":"TestProj.Main","n":"beta"}}': {
                "definition": [3, 0, 3, 4], "usages": [],
            },
        },
    }))
    (tmp / "lakefile.lean").write_text("lean_lib TestProj")
    src_dir = tmp / "TestProj"
    src_dir.mkdir()
    (src_dir / "Main.lean").write_text("theorem alpha : True := trivial\n\ndef beta : Nat := 1\n")
    return tmp


@pytest.mark.anyio
async def test_first_import_all_new(tmp_path):
    """第一次导入，所有 obj 标记为 new。"""
    project = _make_lean_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/plugins/lean/import",
                                 json={"path": str(project)})
        data = resp.json()
        assert len(data["objects"]) == 2
        for obj in data["objects"]:
            assert obj.get("_status") == "new"


@pytest.mark.anyio
async def test_second_import_marks_existing(tmp_path):
    """写入后再导入，已存在的 obj 标记为 existing。"""
    project = _make_lean_project(tmp_path)
    store = KnowledgeStorage(project)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 第一次导入获取 proposals
        resp1 = await client.post("/api/plugins/lean/import",
                                  json={"path": str(project)})
        proposals = resp1.json()

        # 模拟写入第一个 obj
        first_obj = proposals["objects"][0]
        store.create_node(
            name=first_obj["name"],
            sort=first_obj["sort"],
            status=first_obj["status"],
            node_id=first_obj["id"],
        )

        # 第二次导入
        resp2 = await client.post("/api/plugins/lean/import",
                                  json={"path": str(project)})
        data2 = resp2.json()

        statuses = {o["id"]: o["_status"] for o in data2["objects"]}
        assert statuses[first_obj["id"]] == "existing"
        # 另一个应该仍然是 new
        other = [o for o in data2["objects"] if o["id"] != first_obj["id"]]
        assert other[0]["_status"] == "new"


@pytest.mark.anyio
async def test_no_duplicate_objects(tmp_path):
    """导入不产生重复的 obj（同一个 id 不重复出现）。"""
    project = _make_lean_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/plugins/lean/import",
                                 json={"path": str(project)})
        data = resp.json()
        ids = [o["id"] for o in data["objects"]]
        assert len(ids) == len(set(ids))
