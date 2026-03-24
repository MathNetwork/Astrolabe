"""
AstrolabeFunctor — functor base class.

Each functor has name, version, optional router (FastAPI APIRouter),
skills, analysis_endpoints, and metadata (description, author, etc.).
"""
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class AstrolabeFunctor:
    name: str
    version: str
    description: str = "No description"
    signature: str = ""  # mathematical definition, e.g. "F: E → A(Σ)"
    author: str = "Unknown"
    updated_at: str = ""
    icon: str = ""
    router: Optional[object] = None
    skills: list = field(default_factory=list)
    analysis_endpoints: list = field(default_factory=list)
