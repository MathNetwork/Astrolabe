"""
插件加载器测试（TDD — 先写测试）

scan_plugins 扫描 .astrolabe/plugins/ 目录，
加载 plugin.json 声明和 Python 入口模块。
"""
import json
import tempfile
from pathlib import Path

from astrolabe.plugins import scan_plugins
from astrolabe.plugins.base import AstrolabePlugin


# =========================================
# 1. AstrolabePlugin 基类
# =========================================

class TestPluginBase:

    def test_plugin_has_name(self):
        """插件有 name 属性。"""
        plugin = AstrolabePlugin(name="test", version="0.1.0")
        assert plugin.name == "test"

    def test_plugin_has_version(self):
        """插件有 version 属性。"""
        plugin = AstrolabePlugin(name="test", version="0.1.0")
        assert plugin.version == "0.1.0"

    def test_plugin_router_is_none_by_default(self):
        """默认无 router。"""
        plugin = AstrolabePlugin(name="test", version="0.1.0")
        assert plugin.router is None

    def test_plugin_skills_is_empty_by_default(self):
        """默认无 skills。"""
        plugin = AstrolabePlugin(name="test", version="0.1.0")
        assert plugin.skills == []


# =========================================
# 2. scan_plugins
# =========================================

class TestScanPlugins:

    def test_no_plugins_dir_returns_empty(self):
        """无 plugins 目录时返回空列表。"""
        with tempfile.TemporaryDirectory() as tmp:
            plugins = scan_plugins(Path(tmp))
            assert plugins == []

    def test_empty_plugins_dir_returns_empty(self):
        """plugins 目录为空时返回空列表。"""
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / ".astrolabe" / "plugins").mkdir(parents=True)
            plugins = scan_plugins(Path(tmp))
            assert plugins == []

    def test_dir_without_plugin_json_skipped(self):
        """无 plugin.json 的子目录被跳过。"""
        with tempfile.TemporaryDirectory() as tmp:
            plugin_dir = Path(tmp) / ".astrolabe" / "plugins" / "bad"
            plugin_dir.mkdir(parents=True)
            (plugin_dir / "random.py").write_text("x = 1")
            plugins = scan_plugins(Path(tmp))
            assert plugins == []

    def test_loads_plugin_from_plugin_json(self):
        """有 plugin.json 的子目录被加载为插件。"""
        with tempfile.TemporaryDirectory() as tmp:
            plugin_dir = Path(tmp) / ".astrolabe" / "plugins" / "dummy"
            plugin_dir.mkdir(parents=True)
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "dummy",
                "version": "1.0.0",
            }))
            plugins = scan_plugins(Path(tmp))
            assert len(plugins) == 1
            assert plugins[0].name == "dummy"
            assert plugins[0].version == "1.0.0"

    def test_loads_router_from_entry_module(self):
        """plugin.json 指定 entry 时加载模块的 router。"""
        with tempfile.TemporaryDirectory() as tmp:
            plugin_dir = Path(tmp) / ".astrolabe" / "plugins" / "hello"
            plugin_dir.mkdir(parents=True)
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "hello",
                "version": "0.1.0",
                "entry": "main.py",
            }))
            (plugin_dir / "main.py").write_text("""
from fastapi import APIRouter
router = APIRouter()

@router.get("/greet")
async def greet():
    return {"message": "hello from plugin"}
""")
            plugins = scan_plugins(Path(tmp))
            assert len(plugins) == 1
            assert plugins[0].router is not None

    def test_loads_skills_from_entry_module(self):
        """entry 模块导出 skills 列表时被加载。"""
        with tempfile.TemporaryDirectory() as tmp:
            plugin_dir = Path(tmp) / ".astrolabe" / "plugins" / "skillful"
            plugin_dir.mkdir(parents=True)
            (plugin_dir / "plugin.json").write_text(json.dumps({
                "name": "skillful",
                "version": "0.1.0",
                "entry": "main.py",
            }))
            (plugin_dir / "main.py").write_text("""
skills = [
    {"id": "my-skill", "name": "My Skill", "command": "/my-skill", "description": "test", "prompt": "do something"}
]
""")
            plugins = scan_plugins(Path(tmp))
            assert len(plugins) == 1
            assert len(plugins[0].skills) == 1
            assert plugins[0].skills[0]["id"] == "my-skill"

    def test_multiple_plugins_loaded(self):
        """多个插件目录全部加载。"""
        with tempfile.TemporaryDirectory() as tmp:
            for name in ["alpha", "beta"]:
                plugin_dir = Path(tmp) / ".astrolabe" / "plugins" / name
                plugin_dir.mkdir(parents=True)
                (plugin_dir / "plugin.json").write_text(json.dumps({
                    "name": name, "version": "1.0.0",
                }))
            plugins = scan_plugins(Path(tmp))
            assert len(plugins) == 2
            names = {p.name for p in plugins}
            assert names == {"alpha", "beta"}
