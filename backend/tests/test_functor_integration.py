"""
函子集成测试（TDD — 先写测试）

验证 server.py 的函子 API：
- /api/functors/list 返回已加载函子列表
- 函子 router 在 /api/functors/{name}/ 下可访问
"""
import json
import tempfile
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport

from astrolabe.server import app


@pytest.fixture
def project_with_functor(tmp_path):
    """创建带 dummy 函子的项目目录。"""
    astrolabe_dir = tmp_path / ".astrolabe"
    astrolabe_dir.mkdir()
    (astrolabe_dir / "signature.json").write_text('{"obj": {}, "mor": {}}')

    functor_dir = astrolabe_dir / "functors" / "dummy"
    functor_dir.mkdir(parents=True)
    (functor_dir / "functor.json").write_text(json.dumps({
        "name": "dummy",
        "version": "1.0.0",
        "entry": "main.py",
    }))
    (functor_dir / "main.py").write_text("""
from fastapi import APIRouter
router = APIRouter()

@router.get("/hello")
async def hello():
    return {"message": "hello from dummy functor"}

skills = [
    {"id": "dummy-skill", "name": "Dummy", "command": "/dummy", "description": "test skill", "prompt": "do nothing"}
]
""")
    return tmp_path


@pytest.mark.anyio
async def test_functors_list_endpoint(project_with_functor):
    """GET /api/functors/list 返回已加载的函子信息。"""
    path = str(project_with_functor)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 先初始化项目（触发函子加载）
        await client.get(f"/api/project/status?path={path}")
        resp = await client.get(f"/api/functors/list?path={path}")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert any(f["name"] == "dummy" for f in data)


@pytest.mark.anyio
async def test_functor_router_accessible(project_with_functor):
    """函子的 router 端点可通过 /api/functors/{name}/... 访问。"""
    path = str(project_with_functor)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get(f"/api/project/status?path={path}")
        resp = await client.get(f"/api/functors/dummy/hello?path={path}")
        assert resp.status_code == 200
        assert resp.json()["message"] == "hello from dummy functor"


@pytest.mark.anyio
async def test_functor_skills_in_list(project_with_functor):
    """函子的 skills 出现在 /api/functors/list 的返回值里。"""
    path = str(project_with_functor)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get(f"/api/project/status?path={path}")
        resp = await client.get(f"/api/functors/list?path={path}")
        data = resp.json()
        dummy = next(f for f in data if f["name"] == "dummy")
        assert len(dummy["skills"]) == 1
        assert dummy["skills"][0]["id"] == "dummy-skill"
