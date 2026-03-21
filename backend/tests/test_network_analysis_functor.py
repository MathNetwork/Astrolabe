"""
Network Analysis Functor tests (TDD).

Tests the network analysis functor's endpoint registry,
graph builder, and key analysis functions.
"""
import json
import tempfile
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport

from astrolabe.server import app, _loaded_functors
from astrolabe.functors.network_analysis import (
    ANALYSIS_ENDPOINTS,
    FUNCTOR_INFO,
    build_networkx_graph,
)


# =========================================
# Endpoint registry tests
# =========================================

class TestEndpointRegistry:
    """ANALYSIS_ENDPOINTS must be well-formed."""

    def test_all_endpoints_have_key(self):
        for ep in ANALYSIS_ENDPOINTS:
            assert "key" in ep, f"Endpoint missing key: {ep}"

    def test_all_endpoints_have_path(self):
        for ep in ANALYSIS_ENDPOINTS:
            assert "path" in ep, f"Endpoint missing path: {ep}"

    def test_all_endpoints_have_label(self):
        for ep in ANALYSIS_ENDPOINTS:
            assert "label" in ep, f"Endpoint missing label: {ep}"

    def test_all_endpoints_have_type(self):
        for ep in ANALYSIS_ENDPOINTS:
            assert "type" in ep, f"Endpoint missing type: {ep}"
            assert ep["type"] in {"size", "color", "info"}, \
                f"Invalid type '{ep['type']}' for {ep['key']}"

    def test_paths_start_with_api(self):
        for ep in ANALYSIS_ENDPOINTS:
            assert ep["path"].startswith("/api/"), \
                f"Path doesn't start with /api/: {ep['path']}"

    def test_keys_are_unique(self):
        keys = [ep["key"] for ep in ANALYSIS_ENDPOINTS]
        assert len(keys) == len(set(keys)), \
            f"Duplicate keys: {[k for k in keys if keys.count(k) > 1]}"

    def test_paths_are_unique(self):
        paths = [ep["path"] for ep in ANALYSIS_ENDPOINTS]
        assert len(paths) == len(set(paths)), \
            f"Duplicate paths: {[p for p in paths if paths.count(p) > 1]}"

    def test_has_pagerank(self):
        keys = {ep["key"] for ep in ANALYSIS_ENDPOINTS}
        assert "pagerank" in keys

    def test_has_betweenness(self):
        keys = {ep["key"] for ep in ANALYSIS_ENDPOINTS}
        assert "betweenness" in keys

    def test_has_communities(self):
        keys = {ep["key"] for ep in ANALYSIS_ENDPOINTS}
        assert "communities" in keys

    def test_has_metricsAll(self):
        keys = {ep["key"] for ep in ANALYSIS_ENDPOINTS}
        assert "metricsAll" in keys

    def test_no_endpoint_has_id_field(self):
        """Endpoints should not have an 'id' field."""
        for ep in ANALYSIS_ENDPOINTS:
            assert "id" not in ep

    def test_params_are_strings_or_absent(self):
        for ep in ANALYSIS_ENDPOINTS:
            if "params" in ep:
                assert isinstance(ep["params"], str), \
                    f"params should be string: {ep['key']}"


# =========================================
# FUNCTOR_INFO tests
# =========================================

class TestFunctorInfo:
    """FUNCTOR_INFO metadata must be well-formed."""

    def test_has_name(self):
        assert FUNCTOR_INFO.name == "Network Analysis"

    def test_has_version(self):
        assert FUNCTOR_INFO.version

    def test_has_description(self):
        assert len(FUNCTOR_INFO.description) > 10

    def test_has_signature(self):
        assert FUNCTOR_INFO.signature
        assert "$" in FUNCTOR_INFO.signature  # LaTeX

    def test_has_analysis_endpoints(self):
        assert len(FUNCTOR_INFO.analysis_endpoints) > 0

    def test_analysis_endpoints_match(self):
        assert FUNCTOR_INFO.analysis_endpoints is ANALYSIS_ENDPOINTS


# =========================================
# Graph builder tests
# =========================================

class TestGraphBuilder:
    """build_networkx_graph must handle obj/mor correctly."""

    def test_builds_from_obj_mor(self):
        objs = [
            {"id": "a", "name": "A", "sort": "theorem"},
            {"id": "b", "name": "B", "sort": "definition"},
        ]
        mors = [
            {"id": "e1", "source": "a", "target": "b"},
        ]
        G = build_networkx_graph(objs, mors)
        assert G.number_of_nodes() == 2
        assert G.number_of_edges() == 1

    def test_empty_input(self):
        G = build_networkx_graph([], [])
        assert G.number_of_nodes() == 0
        assert G.number_of_edges() == 0

    def test_skips_mor_with_missing_obj(self):
        objs = [{"id": "a", "name": "A", "sort": "theorem"}]
        mors = [{"id": "e1", "source": "a", "target": "zzz"}]
        G = build_networkx_graph(objs, mors)
        assert G.number_of_nodes() == 1
        assert G.number_of_edges() == 0


# =========================================
# API endpoint integration tests
# =========================================

@pytest.fixture(autouse=True)
def clear_cache():
    _loaded_functors.clear()
    yield
    _loaded_functors.clear()


@pytest.fixture
def project(tmp_path):
    astrolabe_dir = tmp_path / ".astrolabe"
    astrolabe_dir.mkdir()
    (astrolabe_dir / "signature.json").write_text(json.dumps({
        "obj": {
            "a": {"name": "A", "sort": "theorem", "status": "stated"},
            "b": {"name": "B", "sort": "definition", "status": "stated"},
            "c": {"name": "C", "sort": "lemma", "status": "stated"},
        },
        "mor": {
            "e1": {"source": "a", "target": "b"},
            "e2": {"source": "a", "target": "c"},
        },
    }))
    return tmp_path


@pytest.mark.anyio
async def test_pagerank_returns_200(project):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        await c.get(f"/api/project/status?path={project}")
        resp = await c.get(
            f"/api/project/analysis/pagerank?path={project}&top_k=10"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "data" in data


@pytest.mark.anyio
async def test_betweenness_returns_200(project):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        await c.get(f"/api/project/status?path={project}")
        resp = await c.get(
            f"/api/project/analysis/betweenness?path={project}&include_all=true"
        )
        assert resp.status_code == 200


@pytest.mark.anyio
async def test_communities_returns_200(project):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        await c.get(f"/api/project/status?path={project}")
        resp = await c.get(
            f"/api/project/analysis/communities?path={project}"
        )
        assert resp.status_code == 200


@pytest.mark.anyio
async def test_metrics_all_returns_200(project):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        await c.get(f"/api/project/status?path={project}")
        resp = await c.get(
            f"/api/project/analysis/metrics/all?path={project}"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        assert "nodeMetrics" in data["data"]


@pytest.mark.anyio
async def test_all_endpoints_return_200(project):
    """Every registered endpoint must return 200 on valid data."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        await c.get(f"/api/project/status?path={project}")
        failed = []
        for ep in ANALYSIS_ENDPOINTS:
            params = ep.get("params", "")
            sep = "&" if params else ""
            url = f"{ep['path']}?path={project}{sep}{params}"
            resp = await c.get(url)
            if resp.status_code != 200:
                failed.append(f"{ep['key']}: {resp.status_code}")
        assert failed == [], f"Failed endpoints: {failed}"
