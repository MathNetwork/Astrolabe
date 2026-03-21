"""
项目文件树 endpoint 测试（TDD）

GET /api/project/files 返回整个项目目录结构（排除 build artifacts）。
"""
import json
import tempfile
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport

from astrolabe.server import app


def _make_project(tmp: Path) -> Path:
    """创建有 .astrolabe 目录和其他文件的项目。"""
    astrolabe = tmp / ".astrolabe"
    astrolabe.mkdir()
    (astrolabe / "signature.json").write_text('{"obj": {}, "mor": {}}')

    docs = astrolabe / "docs"
    docs.mkdir()
    (docs / "intro.mdx").write_text("# Intro")
    (docs / "chapter1.mdx").write_text("# Chapter 1")

    # Project-level files
    (tmp / "README.md").write_text("# Project")
    src = tmp / "leancode"
    src.mkdir()
    (src / "Signature.lean").write_text("-- Lean code")

    return tmp


@pytest.mark.anyio
async def test_files_endpoint_exists():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/project/files?path=/nonexistent")
        assert resp.status_code != 404


@pytest.mark.anyio
async def test_files_returns_project_tree(tmp_path):
    """返回整个项目目录树。"""
    project = _make_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/project/files?path={project}")
        assert resp.status_code == 200
        data = resp.json()
        names = {item["name"] for item in data}
        assert ".astrolabe" in names
        assert "README.md" in names
        assert "leancode" in names


@pytest.mark.anyio
async def test_astrolabe_dir_has_docs(tmp_path):
    """`.astrolabe` 包含 docs 子目录。"""
    project = _make_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/project/files?path={project}")
        data = resp.json()
        astrolabe = next(i for i in data if i["name"] == ".astrolabe")
        assert astrolabe["type"] == "directory"
        child_names = {c["name"] for c in astrolabe["children"]}
        assert "docs" in child_names
        assert "signature.json" in child_names


@pytest.mark.anyio
async def test_lean_files_visible(tmp_path):
    """Lean 代码文件可见。"""
    project = _make_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/project/files?path={project}")
        data = resp.json()
        leancode = next(i for i in data if i["name"] == "leancode")
        child_names = {c["name"] for c in leancode["children"]}
        assert "Signature.lean" in child_names


@pytest.mark.anyio
async def test_files_have_type_and_size(tmp_path):
    project = _make_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/project/files?path={project}")
        data = resp.json()
        readme = next(i for i in data if i["name"] == "README.md")
        assert readme["type"] == "file"
        assert "size" in readme
        assert isinstance(readme["size"], int)


@pytest.mark.anyio
async def test_excluded_dirs_not_visible(tmp_path):
    """构建目录 (.git, node_modules 等) 不出现。"""
    project = _make_project(tmp_path)
    (tmp_path / ".git").mkdir()
    (tmp_path / "node_modules").mkdir()
    (tmp_path / ".lake").mkdir()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/project/files?path={project}")
        data = resp.json()
        names = {item["name"] for item in data}
        assert ".git" not in names
        assert "node_modules" not in names
        assert ".lake" not in names


@pytest.mark.anyio
async def test_nonexistent_project_returns_empty(tmp_path):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/project/files?path={tmp_path}/nonexistent")
        assert resp.status_code == 200
        assert resp.json() == []
