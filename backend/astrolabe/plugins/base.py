"""
AstrolabePlugin — 插件基类

每个插件有 name, version, 可选的 router (FastAPI APIRouter)、skills、
analysis_endpoints 和元信息（description, author, updated_at, icon）。
"""
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class AstrolabePlugin:
    name: str
    version: str
    description: str = "No description"
    author: str = "Unknown"
    updated_at: str = ""
    icon: str = ""
    router: Optional[object] = None
    skills: list = field(default_factory=list)
    analysis_endpoints: list = field(default_factory=list)
