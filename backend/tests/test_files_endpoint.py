"""
项目文件树 endpoint 测试（TDD — 先写测试）

GET /api/project/files 返回 .astrolabe/ 目录结构。
"""
import json
import tempfile
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport

from astrolabe.server import app


def _make_project(tmp: Path) -> Path:
    """创建有 .astrolabe 目录结构的项目。"""
    astrolabe = tmp / ".astrolabe"
    astrolabe.mkdir()
    (astrolabe / "signature.json").write_text('{"obj": {}, "mor": {}}')
    (astrolabe / "meta.json").write_text('{}')

    docs = astrolabe / "docs"
    docs.mkdir()
    (docs / "intro.mdx").write_text("# Intro")
    (docs / "chapter1.mdx").write_text("# Chapter 1")

    functors = astrolabe / "functors"
    functors.mkdir()
    lean_dir = functors / "lean"
    lean_dir.mkdir()
    (lean_dir / "functor.json").write_text('{"name": "lean"}')

    return tmp


@pytest.mark.anyio
async def test_files_endpoint_exists():
    """GET /api/project/files 端点存在。"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/project/files?path=/nonexistent")
        assert resp.status_code != 404


@pytest.mark.anyio
async def test_files_returns_tree(tmp_path):
    """返回 .astrolabe/ 的目录树结构。"""
    project = _make_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/project/files?path={project}")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        # 应包含顶层文件和目录
        names = {item["name"] for item in data}
        assert "signature.json" in names
        assert "meta.json" in names
        assert "docs" in names


@pytest.mark.anyio
async def test_files_has_type_field(tmp_path):
    """每个 entry 有 type 字段（file 或 directory）。"""
    project = _make_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/project/files?path={project}")
        data = resp.json()
        docs = next(item for item in data if item["name"] == "docs")
        assert docs["type"] == "directory"
        kj = next(item for item in data if item["name"] == "signature.json")
        assert kj["type"] == "file"


@pytest.mark.anyio
async def test_directories_have_children(tmp_path):
    """目录包含 children 子数组。"""
    project = _make_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/project/files?path={project}")
        data = resp.json()
        docs = next(item for item in data if item["name"] == "docs")
        assert "children" in docs
        child_names = {c["name"] for c in docs["children"]}
        assert "intro.mdx" in child_names
        assert "chapter1.mdx" in child_names


@pytest.mark.anyio
async def test_files_have_size(tmp_path):
    """文件有 size 字段。"""
    project = _make_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/project/files?path={project}")
        data = resp.json()
        kj = next(item for item in data if item["name"] == "signature.json")
        assert "size" in kj
        assert isinstance(kj["size"], int)


@pytest.mark.anyio
async def test_nonexistent_project_returns_empty(tmp_path):
    """不存在的项目返回空数组。"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/project/files?path={tmp_path}/nonexistent")
        assert resp.status_code == 200
        assert resp.json() == []
