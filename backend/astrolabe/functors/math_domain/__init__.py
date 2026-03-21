"""
Math Domain Functor — defines field semantics for mathematical knowledge.

Provides default values for obj/mor info records in the math domain:
name, sort, status, statement, proof, intuition, notes.

This functor interprets the open info records of the signature
as mathematical objects (theorems, definitions, lemmas, etc.).
"""

from ..base import AstrolabeFunctor

OBJ_DEFAULTS = {
    "name": "Untitled",
    "sort": "insight",
    "status": "stated",
    "statement": "",
    "proof": "",
    "notes": "",
}

MOR_DEFAULTS = {
    "strict": True,
    "label": "",
    "notes": "",
}

VALID_STATUSES = {"stated", "proven", "wip", "review", "open"}


def apply_obj_defaults(obj: dict) -> dict:
    """Fill missing keys with math domain defaults. Does not overwrite existing keys."""
    for key, default in OBJ_DEFAULTS.items():
        if key not in obj:
            obj[key] = default
    return obj


def apply_mor_defaults(mor: dict) -> dict:
    """Fill missing keys with math domain defaults. Does not overwrite existing keys."""
    for key, default in MOR_DEFAULTS.items():
        if key not in mor:
            mor[key] = default
    return mor


def validate_obj(obj: dict) -> None:
    """Validate math domain constraints on an obj. Raises ValueError if invalid."""
    status = obj.get("status")
    if status is not None and status not in VALID_STATUSES:
        raise ValueError(
            f"Invalid status: {status}. Must be one of: {', '.join(sorted(VALID_STATUSES))}"
        )


FUNCTOR_INFO = AstrolabeFunctor(
    name="Math Domain",
    version="0.1.0",
    description="Interprets signature objects as mathematical knowledge: theorems, definitions, lemmas, with statement/proof/intuition fields.",
    signature=r"$D: \mathcal{A}(\Sigma) \to \mathcal{A}(\Sigma)$ — enriches each object with math-domain fields (name, sort, status, statement, proof, intuition, notes)",
    author="Xinze-Li-Moqian",
    updated_at="2026-03-20",
    icon="academic-cap",
    skills=[],
    analysis_endpoints=[],
)
