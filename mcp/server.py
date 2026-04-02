"""
Astrolabe MCP Server — bridge between AI assistants and Astrolabe Store.

18 tools organized as:
  Core (10):    store_summary, query, search, get, create, update, delete, validate, stages, ref_graph
  LeanNets (5): propagate, skeleton, metrics, cross_source, frontier
  Lean (3):     lean_project_info, lean_sorry_scan, lean_sync_state

Usage:
    python3 mcp/server.py                     # stdio mode (for Claude Code)
    python3 mcp/server.py --transport sse     # SSE mode (for web clients)
"""
import sys
import os

# Ensure backend and mcp dirs are on sys.path before any local imports
_mcp_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.join(_mcp_dir, '..', 'backend')
if _mcp_dir not in sys.path:
    sys.path.insert(0, _mcp_dir)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from mcp.server.fastmcp import FastMCP
from core_tools import register_core_tools
from leannets_tools import register_leannets_tools
from lean_tools import register_lean_tools

mcp = FastMCP("astrolabe")

register_core_tools(mcp)
register_leannets_tools(mcp)
register_lean_tools(mcp)

if __name__ == "__main__":
    mcp.run()
