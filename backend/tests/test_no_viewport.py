"""Confirm /api/canvas/viewport routes have been removed."""
import pytest
from fastapi.testclient import TestClient
from astrolabe_app.server import app

client = TestClient(app)


def test_viewport_get_returns_404():
    resp = client.get("/api/canvas/viewport", params={"path": "/tmp"})
    assert resp.status_code == 404


def test_viewport_patch_returns_404():
    resp = client.patch("/api/canvas/viewport", json={"path": "/tmp"})
    assert resp.status_code == 404
