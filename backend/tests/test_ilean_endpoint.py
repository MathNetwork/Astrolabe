"""
ilean 插件 endpoint 测试（TDD — 先写测试）

POST /api/functors/lean/import 接受 Lean 项目路径，返回 proposals。
"""
import json
import tempfile
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport

from astrolabe.server import app, _loaded_functors


@pytest.fixture(autouse=True)
def clear_plugin_cache():
    _loaded_functors.clear()
    yield
    _loaded_functors.clear()


def _make_lean_project(tmp: Path) -> Path:
    """创建最小 Lean 项目。"""
    astrolabe_dir = tmp / ".astrolabe"
    astrolabe_dir.mkdir()
    (astrolabe_dir / "knowledge.json").write_text('{"obj": {}, "mor": {}}')

    # .ilean
    ilean_dir = tmp / ".lake" / "build" / "lib" / "lean" / "TestProj"
    ilean_dir.mkdir(parents=True)
    (ilean_dir / "Main.ilean").write_text(json.dumps({
        "module": "TestProj.Main",
        "directImports": [],
        "references": {
            '{"c":{"m":"TestProj.Main","n":"myThm"}}': {
                "definition": [2, 8, 2, 13],
                "usages": [],
            },
        },
    }))

    # lakefile
    (tmp / "lakefile.lean").write_text("lean_lib TestProj")

    # Source
    src_dir = tmp / "TestProj"
    src_dir.mkdir()
    (src_dir / "Main.lean").write_text("theorem myThm : True := trivial\n")

    return tmp


@pytest.mark.anyio
async def test_lean_import_endpoint_exists():
    """POST /api/functors/lean/import 端点存在。"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Without proper path it may 422 but should not 404
        resp = await client.post("/api/functors/lean/import", json={"path": "/nonexistent"})
        assert resp.status_code != 404


@pytest.mark.anyio
async def test_lean_import_returns_proposals(tmp_path):
    """调用 import 端点返回 proposals（objects + morphisms）。"""
    project = _make_lean_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/functors/lean/import", json={"path": str(project)})
        assert resp.status_code == 200
        data = resp.json()
        assert "objects" in data
        assert "morphisms" in data
        assert isinstance(data["objects"], list)
        assert len(data["objects"]) > 0


@pytest.mark.anyio
async def test_proposals_schema_compatible(tmp_path):
    """proposals 格式与 Astrolabe knowledge.json schema 兼容。"""
    project = _make_lean_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/functors/lean/import", json={"path": str(project)})
        data = resp.json()
        obj = data["objects"][0]
        assert "id" in obj
        assert "name" in obj
        assert "sort" in obj
        assert "status" in obj
        assert len(obj["id"]) == 12  # 12-char hex hash
