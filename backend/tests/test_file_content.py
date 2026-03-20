"""
文件内容读取 endpoint 测试（TDD — 先写测试）

GET /api/project/file-content 返回 .astrolabe/ 下指定文件的文本内容。
"""
import json
import tempfile
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport

from astrolabe.server import app


def _make_project(tmp: Path) -> Path:
    astrolabe = tmp / ".astrolabe"
    astrolabe.mkdir()
    (astrolabe / "knowledge.json").write_text('{"obj": {}, "mor": {}}')
    docs = astrolabe / "docs"
    docs.mkdir()
    (docs / "intro.mdx").write_text("# Introduction\n\nHello world")
    return tmp


@pytest.mark.anyio
async def test_file_content_endpoint_exists():
    """Endpoint 存在（返回 404 因为文件不存在，但不是 405 Method Not Allowed）。"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/project/file-content?path=/nonexistent&file=test.txt")
        assert resp.status_code != 405


@pytest.mark.anyio
async def test_file_content_returns_text(tmp_path):
    project = _make_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            f"/api/project/file-content?path={project}&file=docs/intro.mdx"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "content" in data
        assert "# Introduction" in data["content"]


@pytest.mark.anyio
async def test_file_content_nonexistent_file(tmp_path):
    project = _make_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            f"/api/project/file-content?path={project}&file=nonexistent.txt"
        )
        assert resp.status_code == 404


@pytest.mark.anyio
async def test_file_content_prevents_path_traversal(tmp_path):
    """不允许读取 .astrolabe/ 之外的文件。"""
    project = _make_project(tmp_path)
    (tmp_path / "secret.txt").write_text("secret data")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            f"/api/project/file-content?path={project}&file=../secret.txt"
        )
        assert resp.status_code in (400, 403, 404)
