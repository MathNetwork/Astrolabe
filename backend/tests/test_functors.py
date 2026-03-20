"""
函子系统测试（TDD — 先写测试）

AstrolabeFunctor 基类 + scan_functors 加载器。
"""
import json
import tempfile
from pathlib import Path

from astrolabe.functors import scan_functors
from astrolabe.functors.base import AstrolabeFunctor


class TestFunctorBase:

    def test_functor_has_name(self):
        f = AstrolabeFunctor(name="test", version="0.1.0")
        assert f.name == "test"

    def test_functor_has_version(self):
        f = AstrolabeFunctor(name="test", version="0.1.0")
        assert f.version == "0.1.0"

    def test_functor_has_description(self):
        f = AstrolabeFunctor(name="test", version="0.1.0", description="A functor")
        assert f.description == "A functor"

    def test_functor_router_is_none_by_default(self):
        f = AstrolabeFunctor(name="test", version="0.1.0")
        assert f.router is None

    def test_functor_skills_empty_by_default(self):
        f = AstrolabeFunctor(name="test", version="0.1.0")
        assert f.skills == []

    def test_functor_analysis_endpoints_empty_by_default(self):
        f = AstrolabeFunctor(name="test", version="0.1.0")
        assert f.analysis_endpoints == []


class TestScanFunctors:

    def test_no_functors_dir_returns_empty(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = scan_functors(Path(tmp))
            assert result == []

    def test_empty_functors_dir_returns_empty(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / ".astrolabe" / "functors").mkdir(parents=True)
            result = scan_functors(Path(tmp))
            assert result == []

    def test_loads_functor_from_functor_json(self):
        """扫描 .astrolabe/functors/ 目录，加载 functor.json。"""
        with tempfile.TemporaryDirectory() as tmp:
            fdir = Path(tmp) / ".astrolabe" / "functors" / "dummy"
            fdir.mkdir(parents=True)
            (fdir / "functor.json").write_text(json.dumps({
                "name": "dummy", "version": "1.0.0",
            }))
            result = scan_functors(Path(tmp))
            assert len(result) == 1
            assert result[0].name == "dummy"

    def test_loads_router_from_entry_module(self):
        with tempfile.TemporaryDirectory() as tmp:
            fdir = Path(tmp) / ".astrolabe" / "functors" / "hello"
            fdir.mkdir(parents=True)
            (fdir / "functor.json").write_text(json.dumps({
                "name": "hello", "version": "0.1.0", "entry": "main.py",
            }))
            (fdir / "main.py").write_text("""
from fastapi import APIRouter
router = APIRouter()

@router.get("/greet")
async def greet():
    return {"message": "hello from functor"}
""")
            result = scan_functors(Path(tmp))
            assert len(result) == 1
            assert result[0].router is not None

    def test_multiple_functors_loaded(self):
        with tempfile.TemporaryDirectory() as tmp:
            for name in ["alpha", "beta"]:
                fdir = Path(tmp) / ".astrolabe" / "functors" / name
                fdir.mkdir(parents=True)
                (fdir / "functor.json").write_text(json.dumps({
                    "name": name, "version": "1.0.0",
                }))
            result = scan_functors(Path(tmp))
            assert len(result) == 2
            names = {f.name for f in result}
            assert names == {"alpha", "beta"}
