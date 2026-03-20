"""
API 路径重命名测试（TDD — 先写测试）

/api/plugins/* → /api/functors/*
"""
import json
import tempfile
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport

from astrolabe.server import app, _loaded_functors


@pytest.fixture(autouse=True)
def clear_cache():
    _loaded_functors.clear()
    yield
    _loaded_functors.clear()


@pytest.fixture
def project(tmp_path):
    astrolabe_dir = tmp_path / ".astrolabe"
    astrolabe_dir.mkdir()
    (astrolabe_dir / "knowledge.json").write_text('{"obj": {}, "mor": {}}')
    return tmp_path


@pytest.mark.anyio
async def test_functors_list_endpoint(project):
    """GET /api/functors/list 可访问。"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get(f"/api/project/status?path={project}")
        resp = await client.get(f"/api/functors/list?path={project}")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)


@pytest.mark.anyio
async def test_lean_import_via_functors_path(project):
    """POST /api/functors/lean/import 可访问。"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/functors/lean/import", json={"path": str(project)})
        assert resp.status_code == 200
