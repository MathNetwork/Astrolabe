"""
Timestamp Functor — manages created_at and updated_at fields.

Automatically sets created_at on creation and updated_at on every update.
"""

from datetime import datetime, timezone

from ..base import AstrolabeFunctor


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def on_create(record: dict) -> dict:
    """Set created_at and updated_at on a newly created record."""
    now = _now()
    record.setdefault("created_at", now)
    record.setdefault("updated_at", now)
    return record


def on_update(record: dict) -> dict:
    """Update the updated_at timestamp."""
    record["updated_at"] = _now()
    return record


FUNCTOR_INFO = AstrolabeFunctor(
    name="Timestamp",
    version="0.1.0",
    description="Manages created_at and updated_at timestamps on signature records.",
    signature=r"$T: \mathcal{A}(\Sigma) \to \mathcal{A}(\Sigma)$ — enriches each record with temporal metadata",
    author="Xinze-Li-Moqian",
    updated_at="2026-03-20",
    icon="clock",
    skills=[],
    analysis_endpoints=[],
)
