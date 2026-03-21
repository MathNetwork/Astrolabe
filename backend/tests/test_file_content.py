"""
File content endpoint tests (TDD).

ALL files in project directory MUST be readable.
Files OUTSIDE project directory MUST be blocked.
"""
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport

from astrolabe.server import app


def _make_project(tmp: Path) -> Path:
    astrolabe = tmp / ".astrolabe"
    astrolabe.mkdir()
    (astrolabe / "signature.json").write_text('{"obj": {}, "mor": {}}')
    docs = astrolabe / "docs"
    docs.mkdir()
    (docs / "index.mdx").write_text("# Index content")
    (tmp / "README.md").write_text("# Project README")
    (tmp / "lakefile.toml").write_text('name = "test"')
    leancode = tmp / "leancode"
    leancode.mkdir()
    (leancode / "Signature.lean").write_text("structure Sig where")
    sub = leancode / "Functors"
    sub.mkdir()
    (sub / "Import.lean").write_text("-- Import functor")
    return tmp


@pytest.mark.anyio
async def test_read_astrolabe_file(tmp_path):
    p = _make_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get(f"/api/project/file-content?path={p}&file=.astrolabe/signature.json")
        assert r.status_code == 200
        assert len(r.json()["content"]) > 0


@pytest.mark.anyio
async def test_read_docs(tmp_path):
    p = _make_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get(f"/api/project/file-content?path={p}&file=.astrolabe/docs/index.mdx")
        assert r.status_code == 200
        assert "# Index content" in r.json()["content"]


@pytest.mark.anyio
async def test_read_readme(tmp_path):
    p = _make_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get(f"/api/project/file-content?path={p}&file=README.md")
        assert r.status_code == 200
        assert "# Project README" in r.json()["content"]


@pytest.mark.anyio
async def test_read_lean_code(tmp_path):
    p = _make_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get(f"/api/project/file-content?path={p}&file=leancode/Signature.lean")
        assert r.status_code == 200
        assert "structure Sig" in r.json()["content"]


@pytest.mark.anyio
async def test_read_nested_lean(tmp_path):
    p = _make_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get(f"/api/project/file-content?path={p}&file=leancode/Functors/Import.lean")
        assert r.status_code == 200
        assert "Import functor" in r.json()["content"]


@pytest.mark.anyio
async def test_read_lakefile(tmp_path):
    p = _make_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get(f"/api/project/file-content?path={p}&file=lakefile.toml")
        assert r.status_code == 200
        assert 'name = "test"' in r.json()["content"]


@pytest.mark.anyio
async def test_nonexistent_404(tmp_path):
    p = _make_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get(f"/api/project/file-content?path={p}&file=nope.txt")
        assert r.status_code == 404


@pytest.mark.anyio
async def test_path_traversal_blocked(tmp_path):
    p = _make_project(tmp_path)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get(f"/api/project/file-content?path={p}&file=../../etc/passwd")
        assert r.status_code == 403
