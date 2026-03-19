"""
插件集成测试（TDD — 先写测试）

验证 server.py 的插件 API：
- /api/plugins/list 返回已加载插件列表
- 插件 router 在 /api/plugins/{name}/ 下可访问
"""
import json
import tempfile
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport

from astrolabe.server import app


@pytest.fixture
def project_with_plugin(tmp_path):
    """创建带 dummy 插件的项目目录。"""
    astrolabe_dir = tmp_path / ".astrolabe"
    astrolabe_dir.mkdir()
    (astrolabe_dir / "knowledge.json").write_text('{"obj": {}, "mor": {}}')

    plugin_dir = astrolabe_dir / "plugins" / "dummy"
    plugin_dir.mkdir(parents=True)
    (plugin_dir / "plugin.json").write_text(json.dumps({
        "name": "dummy",
        "version": "1.0.0",
        "entry": "main.py",
    }))
    (plugin_dir / "main.py").write_text("""
from fastapi import APIRouter
router = APIRouter()

@router.get("/hello")
async def hello():
    return {"message": "hello from dummy plugin"}

skills = [
    {"id": "dummy-skill", "name": "Dummy", "command": "/dummy", "description": "test skill", "prompt": "do nothing"}
]
""")
    return tmp_path


@pytest.mark.anyio
async def test_plugins_list_endpoint(project_with_plugin):
    """GET /api/plugins/list 返回已加载的插件信息。"""
    path = str(project_with_plugin)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 先初始化项目（触发插件加载）
        await client.get(f"/api/project/status?path={path}")
        resp = await client.get(f"/api/plugins/list?path={path}")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert any(p["name"] == "dummy" for p in data)


@pytest.mark.anyio
async def test_plugin_router_accessible(project_with_plugin):
    """插件的 router 端点可通过 /api/plugins/{name}/... 访问。"""
    path = str(project_with_plugin)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get(f"/api/project/status?path={path}")
        resp = await client.get(f"/api/plugins/dummy/hello?path={path}")
        assert resp.status_code == 200
        assert resp.json()["message"] == "hello from dummy plugin"


@pytest.mark.anyio
async def test_plugin_skills_in_list(project_with_plugin):
    """插件的 skills 出现在 /api/plugins/list 的返回值里。"""
    path = str(project_with_plugin)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get(f"/api/project/status?path={path}")
        resp = await client.get(f"/api/plugins/list?path={path}")
        data = resp.json()
        dummy = next(p for p in data if p["name"] == "dummy")
        assert len(dummy["skills"]) == 1
        assert dummy["skills"][0]["id"] == "dummy-skill"
