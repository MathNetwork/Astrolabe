"""
分析路由迁移测试（TDD — 先写测试）

验证分析路由从 server.py 迁移到 analysis/router.py 后仍可访问。
第一批：centrality 相关（degree, pagerank, betweenness, katz, structural）
"""
import json
import tempfile
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport

from astrolabe.server import app


@pytest.fixture
def project_with_graph(tmp_path):
    """创建有节点和边的项目。"""
    astrolabe_dir = tmp_path / ".astrolabe"
    astrolabe_dir.mkdir()
    (astrolabe_dir / "knowledge.json").write_text(json.dumps({
        "obj": {
            "a": {"id": "a", "name": "A", "sort": "theorem", "status": "stated",
                  "statement": "", "proof": "", "intuition": "", "notes": "",
                  "position": {"x": 0, "y": 0, "z": 0},
                  "created_at": "2026-01-01", "updated_at": "2026-01-01"},
            "b": {"id": "b", "name": "B", "sort": "definition", "status": "stated",
                  "statement": "", "proof": "", "intuition": "", "notes": "",
                  "position": {"x": 0, "y": 0, "z": 0},
                  "created_at": "2026-01-01", "updated_at": "2026-01-01"},
            "c": {"id": "c", "name": "C", "sort": "lemma", "status": "stated",
                  "statement": "", "proof": "", "intuition": "", "notes": "",
                  "position": {"x": 0, "y": 0, "z": 0},
                  "created_at": "2026-01-01", "updated_at": "2026-01-01"},
        },
        "mor": {
            "e1": {"id": "e1", "source": "a", "target": "b", "strict": True, "label": "", "notes": ""},
            "e2": {"id": "e2", "source": "b", "target": "c", "strict": True, "label": "", "notes": ""},
        },
    }))
    return tmp_path


class TestAnalysisRouterCentrality:
    """第一批：centrality 路由迁移后仍可访问。"""

    @pytest.mark.anyio
    async def test_degree_endpoint(self, project_with_graph):
        path = str(project_with_graph)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(f"/api/project/analysis/degree?path={path}")
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "ok"
            assert data["analysis"] == "degree"

    @pytest.mark.anyio
    async def test_pagerank_endpoint(self, project_with_graph):
        path = str(project_with_graph)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(f"/api/project/analysis/pagerank?path={path}&top_k=10")
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "ok"
            assert "data" in data
            assert "topNodes" in data["data"]

    @pytest.mark.anyio
    async def test_betweenness_endpoint(self, project_with_graph):
        path = str(project_with_graph)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(f"/api/project/analysis/betweenness?path={path}&include_all=true")
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "ok"

    @pytest.mark.anyio
    async def test_katz_endpoint(self, project_with_graph):
        path = str(project_with_graph)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(f"/api/project/analysis/katz?path={path}")
            assert resp.status_code == 200

    @pytest.mark.anyio
    async def test_structural_endpoint(self, project_with_graph):
        path = str(project_with_graph)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(f"/api/project/analysis/structural?path={path}")
            assert resp.status_code == 200


class TestAnalysisRouterRegistration:
    """分析路由应该通过 analysis router 注册，不在 server.py 里。"""

    def test_server_py_has_no_analysis_route_decorators(self):
        """server.py 不应该有 @app.get('/api/project/analysis/...')"""
        source = Path("backend/astrolabe/server.py").read_text()
        import re
        analysis_decorators = re.findall(r'@app\.\w+\("/api/project/analysis/', source)
        assert len(analysis_decorators) == 0, (
            f"server.py still has {len(analysis_decorators)} analysis route decorators: "
            f"{analysis_decorators[:3]}..."
        )

    def test_analysis_router_exists(self):
        """analysis/router.py 文件应该存在。"""
        assert Path("backend/astrolabe/analysis/router.py").exists()

    def test_server_includes_analysis_router(self):
        """server.py 应该 include analysis_router。"""
        source = Path("backend/astrolabe/server.py").read_text()
        assert "analysis_router" in source or "include_router" in source
