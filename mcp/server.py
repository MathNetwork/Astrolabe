"""
Astrolabe MCP Server — bridge between AI assistants and Astrolabe Store.

14 tools organized as:
  Core (9):     store_summary, query, get, create, update, delete, validate, stages, ref_graph
  LeanNets (5): propagate, skeleton, metrics, cross_source, frontier

Usage:
    python3 mcp/server.py                     # stdio mode (for Claude Code)
    python3 mcp/server.py --transport sse     # SSE mode (for web clients)
"""
from mcp.server.fastmcp import FastMCP
from core_tools import register_core_tools
from leannets_tools import register_leannets_tools

mcp = FastMCP("astrolabe")

register_core_tools(mcp)
register_leannets_tools(mcp)

if __name__ == "__main__":
    mcp.run()
