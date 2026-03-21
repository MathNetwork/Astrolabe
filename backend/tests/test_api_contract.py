"""
API Contract Tests — the SINGLE SOURCE OF TRUTH for frontend-backend communication.

Every API endpoint that the frontend calls is tested here.
If a test fails, the frontend WILL break.

Rules:
- Test request format (what frontend sends)
- Test response format (what frontend expects to receive)
- Test status codes
- Test error cases
- Every field the frontend reads MUST be asserted
"""
import json
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport

from astrolabe.server import app, _signature_stores, _loaded_functors


# ── Fixtures ──

@pytest.fixture(autouse=True)
def clear_caches():
    _signature_stores.clear()
    _loaded_functors.clear()
    yield
    _signature_stores.clear()
    _loaded_functors.clear()


@pytest.fixture
def project(tmp_path):
    """A project with signature data and docs."""
    astrolabe = tmp_path / ".astrolabe"
    astrolabe.mkdir()
    (astrolabe / "signature.json").write_text(json.dumps({
        "obj": {
            "aaa": {"name": "Theorem A", "sort": "theorem", "status": "stated",
                    "statement": "For all x", "proof": "By induction", "notes": "Important"},
            "bbb": {"name": "Definition B", "sort": "definition", "status": "stated",
                    "statement": "Let X be", "notes": ""},
        },
        "mor": {
            "eee": {"source": "aaa", "target": "bbb", "strict": True,
                    "label": "uses", "notes": "A uses B"},
        },
    }))
    (astrolabe / "meta.json").write_text(json.dumps({"viewport": {}}))
    docs = astrolabe / "docs"
    docs.mkdir()
    (docs / "00-index.mdx").write_text("# Index\n\nWelcome.")
    (docs / "01-chapter.mdx").write_text("# Chapter 1\n\nContent here.")

    # Project-level files
    (tmp_path / "README.md").write_text("# Project")
    leancode = tmp_path / "leancode"
    leancode.mkdir()
    (leancode / "Signature.lean").write_text("structure Sig where")

    return tmp_path


# ============================================
# /api/signature — Full signature
# ============================================

class TestSignatureAPI:

    @pytest.mark.anyio
    async def test_get_signature(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            await c.get(f"/api/project/status?path={project}")
            r = await c.get(f"/api/signature?path={project}")
            assert r.status_code == 200
            data = r.json()
            # Frontend expects: { obj: [...], mor: [...] }
            assert "obj" in data
            assert "mor" in data
            assert isinstance(data["obj"], list)
            assert isinstance(data["mor"], list)

    @pytest.mark.anyio
    async def test_obj_has_required_fields(self, project):
        """Frontend reads: id, name, sort — these MUST exist."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            await c.get(f"/api/project/status?path={project}")
            r = await c.get(f"/api/signature?path={project}")
            for obj in r.json()["obj"]:
                assert "id" in obj, f"obj missing id: {obj}"
                assert isinstance(obj["id"], str)
                assert len(obj["id"]) > 0

    @pytest.mark.anyio
    async def test_mor_has_required_fields(self, project):
        """Frontend reads: id, source, target — these MUST exist."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            await c.get(f"/api/project/status?path={project}")
            r = await c.get(f"/api/signature?path={project}")
            for mor in r.json()["mor"]:
                assert "id" in mor
                assert "source" in mor
                assert "target" in mor
                assert isinstance(mor["id"], str)
                assert isinstance(mor["source"], str)
                assert isinstance(mor["target"], str)


# ============================================
# /api/signature/obj — Obj CRUD
# ============================================

class TestObjCRUD:

    @pytest.mark.anyio
    async def test_list_objs(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            await c.get(f"/api/project/status?path={project}")
            r = await c.get(f"/api/signature/obj?path={project}")
            assert r.status_code == 200
            data = r.json()
            assert isinstance(data, list)
            assert len(data) == 2
            for obj in data:
                assert "id" in obj

    @pytest.mark.anyio
    async def test_get_obj(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            await c.get(f"/api/project/status?path={project}")
            r = await c.get(f"/api/signature/obj/aaa?path={project}")
            assert r.status_code == 200
            obj = r.json()
            assert obj["id"] == "aaa"
            assert obj["name"] == "Theorem A"

    @pytest.mark.anyio
    async def test_get_obj_404(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            await c.get(f"/api/project/status?path={project}")
            r = await c.get(f"/api/signature/obj/nonexistent?path={project}")
            assert r.status_code == 404

    @pytest.mark.anyio
    async def test_create_obj(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            await c.get(f"/api/project/status?path={project}")
            r = await c.post("/api/signature/obj", json={
                "path": str(project),
                "name": "New Lemma",
                "sort": "lemma",
            })
            assert r.status_code == 200
            data = r.json()
            # Frontend expects: { status: "ok", obj: { id, name, sort, ... } }
            assert data["status"] == "ok"
            assert "obj" in data
            assert "id" in data["obj"]
            assert data["obj"]["name"] == "New Lemma"
            assert data["obj"]["sort"] == "lemma"
            # Timestamps from timestamp functor
            assert "created_at" in data["obj"]
            assert "updated_at" in data["obj"]

    @pytest.mark.anyio
    async def test_create_obj_with_no_fields(self, project):
        """Math domain functor fills defaults."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            await c.get(f"/api/project/status?path={project}")
            r = await c.post("/api/signature/obj", json={
                "path": str(project),
            })
            assert r.status_code == 200
            obj = r.json()["obj"]
            assert obj["name"] == "Untitled"
            assert obj["sort"] == "insight"
            assert obj["status"] == "stated"

    @pytest.mark.anyio
    async def test_update_obj(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            await c.get(f"/api/project/status?path={project}")
            r = await c.patch("/api/signature/obj/aaa", json={
                "path": str(project),
                "status": "proven",
            })
            assert r.status_code == 200
            data = r.json()
            assert data["status"] == "ok"
            assert data["obj"]["id"] == "aaa"
            assert data["obj"]["status"] == "proven"
            # updated_at should be set by timestamp functor
            assert "updated_at" in data["obj"]

    @pytest.mark.anyio
    async def test_delete_obj(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            await c.get(f"/api/project/status?path={project}")
            r = await c.delete(f"/api/signature/obj/aaa?path={project}")
            assert r.status_code == 200
            assert r.json()["status"] == "ok"
            # Verify deleted
            r2 = await c.get(f"/api/signature/obj/aaa?path={project}")
            assert r2.status_code == 404
            # Verify cascade: mor eee (aaa→bbb) should be deleted
            r3 = await c.get(f"/api/signature/mor?path={project}")
            assert len(r3.json()) == 0


# ============================================
# /api/signature/mor — Mor CRUD
# ============================================

class TestMorCRUD:

    @pytest.mark.anyio
    async def test_list_mors(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            await c.get(f"/api/project/status?path={project}")
            r = await c.get(f"/api/signature/mor?path={project}")
            assert r.status_code == 200
            data = r.json()
            assert isinstance(data, list)
            assert len(data) == 1
            assert data[0]["source"] == "aaa"
            assert data[0]["target"] == "bbb"

    @pytest.mark.anyio
    async def test_create_mor(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            await c.get(f"/api/project/status?path={project}")
            r = await c.post("/api/signature/mor", json={
                "path": str(project),
                "source": "bbb",
                "target": "aaa",
            })
            assert r.status_code == 200
            data = r.json()
            assert data["status"] == "ok"
            assert "mor" in data
            assert data["mor"]["source"] == "bbb"
            assert data["mor"]["target"] == "aaa"
            assert "id" in data["mor"]

    @pytest.mark.anyio
    async def test_create_mor_invalid_source(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            await c.get(f"/api/project/status?path={project}")
            r = await c.post("/api/signature/mor", json={
                "path": str(project),
                "source": "nonexistent",
                "target": "aaa",
            })
            assert r.status_code == 400

    @pytest.mark.anyio
    async def test_delete_mor(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            await c.get(f"/api/project/status?path={project}")
            r = await c.delete(f"/api/signature/mor/eee?path={project}")
            assert r.status_code == 200


# ============================================
# /api/docs — Document reading
# ============================================

class TestDocsAPI:

    @pytest.mark.anyio
    async def test_list_docs(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.get(f"/api/docs/list?path={project}")
            assert r.status_code == 200
            data = r.json()
            # Frontend expects: { files: [{ name, path, title }, ...] }
            assert "files" in data
            assert isinstance(data["files"], list)
            assert len(data["files"]) == 2
            for f in data["files"]:
                assert "name" in f
                assert "path" in f
                assert "title" in f
                assert f["name"].endswith(".mdx")

    @pytest.mark.anyio
    async def test_read_doc(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.get(f"/api/docs/list?path={project}")
            first = r.json()["files"][0]
            r2 = await c.get(f"/api/docs/read?path={first['path']}")
            assert r2.status_code == 200
            data = r2.json()
            # Frontend expects: { content: "..." }
            assert "content" in data
            assert isinstance(data["content"], str)
            assert len(data["content"]) > 0

    @pytest.mark.anyio
    async def test_read_doc_has_actual_content(self, project):
        """Content must match what's on disk."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            path = str(project / ".astrolabe" / "docs" / "00-index.mdx")
            r = await c.get(f"/api/docs/read?path={path}")
            assert "# Index" in r.json()["content"]
            assert "Welcome." in r.json()["content"]


# ============================================
# /api/project/files — File browser
# ============================================

class TestFileBrowserAPI:

    @pytest.mark.anyio
    async def test_list_files(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.get(f"/api/project/files?path={project}")
            assert r.status_code == 200
            data = r.json()
            assert isinstance(data, list)
            names = {item["name"] for item in data}
            assert ".astrolabe" in names
            assert "README.md" in names
            assert "leancode" in names

    @pytest.mark.anyio
    async def test_file_entries_have_type(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.get(f"/api/project/files?path={project}")
            for item in r.json():
                assert "type" in item
                assert item["type"] in ("file", "directory")
                assert "name" in item
                assert "path" in item

    @pytest.mark.anyio
    async def test_read_project_file(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.get(
                f"/api/project/file-content?path={project}&file=README.md"
            )
            assert r.status_code == 200
            assert "# Project" in r.json()["content"]

    @pytest.mark.anyio
    async def test_read_lean_file(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.get(
                f"/api/project/file-content?path={project}&file=leancode/Signature.lean"
            )
            assert r.status_code == 200
            assert "structure Sig" in r.json()["content"]

    @pytest.mark.anyio
    async def test_path_traversal_blocked(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.get(
                f"/api/project/file-content?path={project}&file=../../etc/passwd"
            )
            assert r.status_code == 403


# ============================================
# /api/canvas/viewport — Viewport state
# ============================================

class TestViewportAPI:

    @pytest.mark.anyio
    async def test_get_viewport(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            await c.get(f"/api/project/status?path={project}")
            r = await c.get(f"/api/canvas/viewport?path={project}")
            assert r.status_code == 200
            assert isinstance(r.json(), dict)

    @pytest.mark.anyio
    async def test_update_viewport(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            await c.get(f"/api/project/status?path={project}")
            r = await c.patch("/api/canvas/viewport", json={
                "path": str(project),
                "zoom": 1.5,
            })
            assert r.status_code == 200
            assert r.json()["status"] == "ok"
            # Verify persisted
            r2 = await c.get(f"/api/canvas/viewport?path={project}")
            assert r2.json()["zoom"] == 1.5


# ============================================
# /api/functors/list — Functor registry
# ============================================

class TestFunctorsAPI:

    @pytest.mark.anyio
    async def test_list_functors(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            await c.get(f"/api/project/status?path={project}")
            r = await c.get(f"/api/functors/list?path={project}")
            assert r.status_code == 200
            data = r.json()
            assert isinstance(data, list)
            assert len(data) >= 4  # at least our built-in functors
            for f in data:
                assert "name" in f
                assert "version" in f
                assert "description" in f

    @pytest.mark.anyio
    async def test_functor_has_analysis_endpoints(self, project):
        """Network Analysis functor must have endpoints."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            await c.get(f"/api/project/status?path={project}")
            r = await c.get(f"/api/functors/list?path={project}")
            na = next((f for f in r.json() if f["name"] == "Network Analysis"), None)
            assert na is not None
            assert len(na["analysis_endpoints"]) > 0
            for ep in na["analysis_endpoints"]:
                assert "key" in ep
                assert "url" in ep or "path" in ep


# ============================================
# /api/project/status — Project init
# ============================================

class TestProjectStatusAPI:

    @pytest.mark.anyio
    async def test_status_existing_project(self, project):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.get(f"/api/project/status?path={project}")
            assert r.status_code == 200
            data = r.json()
            assert data["exists"] is True
            assert data["isSignatureProject"] is True

    @pytest.mark.anyio
    async def test_status_nonexistent(self, tmp_path):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.get(f"/api/project/status?path={tmp_path}/nope")
            assert r.status_code == 200
            data = r.json()
            assert data["exists"] is False


# ============================================
# /api/health — Health check
# ============================================

class TestHealthAPI:

    @pytest.mark.anyio
    async def test_health(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.get("/api/health")
            assert r.status_code == 200
            assert r.json()["status"] == "ok"
