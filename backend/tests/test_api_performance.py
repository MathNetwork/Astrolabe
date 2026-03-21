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


class TestSignatureAPIPerformance:
    """Signature endpoints should respond quickly."""

    def test_obj_list_under_200ms(self):
        elapsed, data = _timed_fetch(
            f"{API_BASE}/api/signature/obj?path={TEST_PATH}"
        )
        assert elapsed < 0.2, f"GET /api/signature/obj took {elapsed:.3f}s (limit 200ms)"
        assert isinstance(data, list)

    def test_mor_list_under_200ms(self):
        elapsed, data = _timed_fetch(
            f"{API_BASE}/api/signature/mor?path={TEST_PATH}"
        )
        assert elapsed < 0.2, f"GET /api/signature/mor took {elapsed:.3f}s (limit 200ms)"
        assert isinstance(data, list)

    def test_signature_under_200ms(self):
        elapsed, data = _timed_fetch(
            f"{API_BASE}/api/signature?path={TEST_PATH}"
        )
        assert elapsed < 0.2, f"GET /api/signature took {elapsed:.3f}s (limit 200ms)"


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


class TestViewportAPIPerformance:
    """Viewport endpoints should respond quickly."""

    def test_viewport_under_200ms(self):
        elapsed, data = _timed_fetch(
            f"{API_BASE}/api/canvas/viewport?path={TEST_PATH}"
        )
        assert elapsed < 0.2, f"GET /api/canvas/viewport took {elapsed:.3f}s (limit 200ms)"
