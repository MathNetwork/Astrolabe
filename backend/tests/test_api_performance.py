"""API response time tests.

Ensure key endpoints respond within acceptable time limits.
Requires backend running on localhost:8765.
"""
import time
import pytest
import urllib.request
import json

API_BASE = "http://127.0.0.1:8765"
# Use a real project path if available, otherwise skip
TEST_PATH = "/Users/moqian/GMTNet"

def _timed_fetch(url: str) -> tuple[float, dict]:
    """Fetch URL and return (elapsed_seconds, json_data)."""
    start = time.perf_counter()
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read())
    elapsed = time.perf_counter() - start
    return elapsed, data


@pytest.fixture(autouse=True)
def check_server():
    """Skip all tests if backend is not running."""
    try:
        urllib.request.urlopen(f"{API_BASE}/api/health", timeout=2)
    except Exception:
        pytest.skip("Backend not running on localhost:8765")


class TestKnowledgeAPIPerformance:
    """Knowledge endpoints should respond quickly."""

    def test_nodes_under_200ms(self):
        elapsed, data = _timed_fetch(
            f"{API_BASE}/api/knowledge/nodes?path={TEST_PATH}"
        )
        assert elapsed < 0.2, f"GET /api/knowledge/nodes took {elapsed:.3f}s (limit 200ms)"
        assert isinstance(data, list)

    def test_edges_under_200ms(self):
        elapsed, data = _timed_fetch(
            f"{API_BASE}/api/knowledge/edges?path={TEST_PATH}"
        )
        assert elapsed < 0.2, f"GET /api/knowledge/edges took {elapsed:.3f}s (limit 200ms)"
        assert isinstance(data, list)

    def test_graph_under_200ms(self):
        elapsed, data = _timed_fetch(
            f"{API_BASE}/api/knowledge/graph?path={TEST_PATH}"
        )
        assert elapsed < 0.2, f"GET /api/knowledge/graph took {elapsed:.3f}s (limit 200ms)"


class TestDocAPIPerformance:
    """Doc endpoints should respond quickly."""

    def test_docs_list_under_100ms(self):
        elapsed, data = _timed_fetch(
            f"{API_BASE}/api/docs/list?path={TEST_PATH}"
        )
        assert elapsed < 0.1, f"GET /api/docs/list took {elapsed:.3f}s (limit 100ms)"

    def test_doc_read_under_200ms(self):
        # First get list to find a real file
        _, files = _timed_fetch(f"{API_BASE}/api/docs/list?path={TEST_PATH}")
        if not files.get("files"):
            pytest.skip("No doc files found")

        first_file = files["files"][0]["path"]
        elapsed, data = _timed_fetch(
            f"{API_BASE}/api/docs/read?path={first_file}"
        )
        assert elapsed < 0.2, f"GET /api/docs/read took {elapsed:.3f}s (limit 200ms)"


class TestCanvasAPIPerformance:
    """Canvas endpoints should respond quickly."""

    def test_canvas_under_200ms(self):
        elapsed, data = _timed_fetch(
            f"{API_BASE}/api/canvas?path={TEST_PATH}"
        )
        assert elapsed < 0.2, f"GET /api/canvas took {elapsed:.3f}s (limit 200ms)"
