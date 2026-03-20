"""
函子分析端点测试（TDD — 先写测试）

函子可以声明 analysis_endpoints，通过 /api/functors/list 暴露。
"""
import json
import tempfile
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport

from astrolabe.server import app, _loaded_functors


@pytest.fixture(autouse=True)
def clear_functor_cache():
    """每个测试前清空函子缓存。"""
    _loaded_functors.clear()
    yield
    _loaded_functors.clear()


@pytest.fixture
def project_with_analysis_functor(tmp_path):
    """创建带分析函子的项目目录。"""
    astrolabe_dir = tmp_path / ".astrolabe"
    astrolabe_dir.mkdir()
    (astrolabe_dir / "signature.json").write_text(json.dumps({
        "obj": {
            "a": {"id": "a", "name": "A", "sort": "theorem", "status": "stated",
                  "statement": "", "proof": "", "intuition": "", "notes": "",
                  "position": {"x": 0, "y": 0, "z": 0},
                  "created_at": "2026-01-01", "updated_at": "2026-01-01"},
            "b": {"id": "b", "name": "B", "sort": "definition", "status": "stated",
                  "statement": "", "proof": "", "intuition": "", "notes": "",
                  "position": {"x": 0, "y": 0, "z": 0},
                  "created_at": "2026-01-01", "updated_at": "2026-01-01"},
        },
        "mor": {
            "e1": {"id": "e1", "source": "a", "target": "b",
                   "strict": True, "label": "", "notes": ""},
        },
    }))

    functor_dir = astrolabe_dir / "functors" / "simple-degree"
    functor_dir.mkdir(parents=True)
    (functor_dir / "functor.json").write_text(json.dumps({
        "name": "simple-degree",
        "version": "0.1.0",
        "entry": "main.py",
        "analysis_endpoints": [
            {"key": "simpleDegree", "path": "/compute", "label": "Simple Degree", "type": "size"}
        ],
    }))
    (functor_dir / "main.py").write_text("""
from fastapi import APIRouter, Query
from pathlib import Path
import json

router = APIRouter()

@router.get("/compute")
async def compute_degree(path: str = Query(...)):
    kp = Path(path) / ".astrolabe" / "signature.json"
    data = json.loads(kp.read_text())
    mor = data.get("mor", {})
    degree = {}
    for edge in mor.values():
        s, t = edge["source"], edge["target"]
        degree[s] = degree.get(s, 0) + 1
        degree[t] = degree.get(t, 0) + 1
    # Normalize to 0-1
    max_d = max(degree.values()) if degree else 1
    return {node_id: d / max_d for node_id, d in degree.items()}
""")
    return tmp_path


@pytest.mark.anyio
async def test_functor_list_includes_analysis_endpoints(project_with_analysis_functor):
    """/api/functors/list 返回函子的 analysis_endpoints。"""
    path = str(project_with_analysis_functor)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get(f"/api/project/status?path={path}")
        resp = await client.get(f"/api/functors/list?path={path}")
        data = resp.json()
        functor = next(f for f in data if f["name"] == "simple-degree")
        assert "analysis_endpoints" in functor
        assert len(functor["analysis_endpoints"]) == 1
        ep = functor["analysis_endpoints"][0]
        assert ep["key"] == "simpleDegree"
        assert ep["type"] == "size"


@pytest.mark.anyio
async def test_functor_analysis_endpoint_returns_data(project_with_analysis_functor):
    """函子分析端点返回 {obj_id: value} 格式。"""
    path = str(project_with_analysis_functor)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get(f"/api/project/status?path={path}")
        resp = await client.get(f"/api/functors/simple-degree/compute?path={path}")
        assert resp.status_code == 200
        data = resp.json()
        assert "a" in data
        assert "b" in data
        assert isinstance(data["a"], (int, float))
