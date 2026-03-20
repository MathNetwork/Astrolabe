"""
函子元信息测试（TDD — 先写测试）

/api/functors/list 返回的函子包含 description, author, updated_at 字段。
"""
import json
import tempfile
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport

from astrolabe.server import app, _loaded_functors


@pytest.fixture(autouse=True)
def clear_functor_cache():
    _loaded_functors.clear()
    yield
    _loaded_functors.clear()


@pytest.fixture
def project(tmp_path):
    astrolabe_dir = tmp_path / ".astrolabe"
    astrolabe_dir.mkdir()
    (astrolabe_dir / "signature.json").write_text('{"obj": {}, "mor": {}}')
    return tmp_path


@pytest.mark.anyio
async def test_functors_have_description(project):
    """每个函子有 description 字段。"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get(f"/api/project/status?path={project}")
        resp = await client.get(f"/api/functors/list?path={project}")
        data = resp.json()
        for functor in data:
            assert "description" in functor, f"Functor {functor['name']} missing description"
            assert isinstance(functor["description"], str)


@pytest.mark.anyio
async def test_functors_have_author(project):
    """每个函子有 author 字段。"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get(f"/api/project/status?path={project}")
        resp = await client.get(f"/api/functors/list?path={project}")
        data = resp.json()
        for functor in data:
            assert "author" in functor, f"Functor {functor['name']} missing author"


@pytest.mark.anyio
async def test_functors_have_updated_at(project):
    """每个函子有 updated_at 字段。"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get(f"/api/project/status?path={project}")
        resp = await client.get(f"/api/functors/list?path={project}")
        data = resp.json()
        for functor in data:
            assert "updated_at" in functor, f"Functor {functor['name']} missing updated_at"


@pytest.mark.anyio
async def test_builtin_functors_have_meaningful_descriptions(project):
    """内置函子有有意义的描述（不是 'No description'）。"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get(f"/api/project/status?path={project}")
        resp = await client.get(f"/api/functors/list?path={project}")
        data = resp.json()
        for functor in data:
            assert len(functor["description"]) > 10, f"Functor {functor['name']} has too short description"
