"""
插件分析端点测试（TDD — 先写测试）

插件可以声明 analysis_endpoints，通过 /api/plugins/list 暴露。
"""
import json
import tempfile
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport

from astrolabe.server import app, _loaded_plugins


@pytest.fixture(autouse=True)
def clear_plugin_cache():
    """每个测试前清空插件缓存。"""
    _loaded_plugins.clear()
    yield
    _loaded_plugins.clear()


@pytest.fixture
def project_with_analysis_plugin(tmp_path):
    """创建带分析插件的项目目录。"""
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
        },
        "mor": {
            "e1": {"id": "e1", "source": "a", "target": "b",
                   "strict": True, "label": "", "notes": ""},
        },
    }))

    plugin_dir = astrolabe_dir / "plugins" / "simple-degree"
    plugin_dir.mkdir(parents=True)
    (plugin_dir / "plugin.json").write_text(json.dumps({
        "name": "simple-degree",
        "version": "0.1.0",
        "entry": "main.py",
        "analysis_endpoints": [
            {"key": "simpleDegree", "path": "/compute", "label": "Simple Degree", "type": "size"}
        ],
    }))
    (plugin_dir / "main.py").write_text("""
from fastapi import APIRouter, Query
from pathlib import Path
import json

router = APIRouter()

@router.get("/compute")
async def compute_degree(path: str = Query(...)):
    kp = Path(path) / ".astrolabe" / "knowledge.json"
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
async def test_plugin_list_includes_analysis_endpoints(project_with_analysis_plugin):
    """/api/plugins/list 返回插件的 analysis_endpoints。"""
    path = str(project_with_analysis_plugin)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get(f"/api/project/status?path={path}")
        resp = await client.get(f"/api/plugins/list?path={path}")
        data = resp.json()
        plugin = next(p for p in data if p["name"] == "simple-degree")
        assert "analysis_endpoints" in plugin
        assert len(plugin["analysis_endpoints"]) == 1
        ep = plugin["analysis_endpoints"][0]
        assert ep["key"] == "simpleDegree"
        assert ep["type"] == "size"


@pytest.mark.anyio
async def test_plugin_analysis_endpoint_returns_data(project_with_analysis_plugin):
    """插件分析端点返回 {node_id: value} 格式。"""
    path = str(project_with_analysis_plugin)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.get(f"/api/project/status?path={path}")
        resp = await client.get(f"/api/plugins/simple-degree/compute?path={path}")
        assert resp.status_code == 200
        data = resp.json()
        assert "a" in data
        assert "b" in data
        assert isinstance(data["a"], (int, float))
