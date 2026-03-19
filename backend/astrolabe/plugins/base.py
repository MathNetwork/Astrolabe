"""
AstrolabePlugin — 插件基类

每个插件有 name, version, 可选的 router (FastAPI APIRouter) 和 skills 列表。
"""
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class AstrolabePlugin:
    name: str
    version: str
    router: Optional[object] = None
    skills: list = field(default_factory=list)
