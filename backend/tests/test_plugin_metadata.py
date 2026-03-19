"""
插件元信息测试（TDD — 先写测试）

/api/plugins/list 返回的插件包含 description, author, updated_at 字段。
"""
import json
import tempfile
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport

from astrolabe.server import app, _loaded_plugins


@pytest.fixture(autouse=True)
def clear_plugin_cache():
    _loaded_plugins.clear()
    yield
    _loaded_plugins.clear()


@pytest.fixture
def project(tmp_path):
    astrolabe_dir = tmp_path / ".astrolabe"
    astrolabe_dir.mkdir()
    (astrolabe_dir / "knowledge.json").write_text('{"obj": {}, "mor": {}}')
    return tmp_path


@pytest.mark.anyio
async def test_plugins_have_description(project):
    """每个插件有 description 字段。"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get(f"/api/project/status?path={project}")
        resp = await client.get(f"/api/plugins/list?path={project}")
        data = resp.json()
        for plugin in data:
            assert "description" in plugin, f"Plugin {plugin['name']} missing description"
            assert isinstance(plugin["description"], str)


@pytest.mark.anyio
async def test_plugins_have_author(project):
    """每个插件有 author 字段。"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get(f"/api/project/status?path={project}")
        resp = await client.get(f"/api/plugins/list?path={project}")
        data = resp.json()
        for plugin in data:
            assert "author" in plugin, f"Plugin {plugin['name']} missing author"


@pytest.mark.anyio
async def test_plugins_have_updated_at(project):
    """每个插件有 updated_at 字段。"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get(f"/api/project/status?path={project}")
        resp = await client.get(f"/api/plugins/list?path={project}")
        data = resp.json()
        for plugin in data:
            assert "updated_at" in plugin, f"Plugin {plugin['name']} missing updated_at"


@pytest.mark.anyio
async def test_builtin_plugins_have_meaningful_descriptions(project):
    """内置插件有有意义的描述（不是 'No description'）。"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get(f"/api/project/status?path={project}")
        resp = await client.get(f"/api/plugins/list?path={project}")
        data = resp.json()
        for plugin in data:
            assert len(plugin["description"]) > 10, f"Plugin {plugin['name']} has too short description"
