"""
Astrolabe MCP Server — bridge between Claude Code and Astrolabe Store.

Registers tools for querying, creating, validating entries, semantic
propagation, network metrics, and formalization frontier analysis.

Usage:
    python3 mcp/server.py                     # stdio mode (for Claude Code)
    python3 mcp/server.py --transport sse     # SSE mode (for web clients)
"""
from mcp.server.fastmcp import FastMCP

from tools import (
    store_summary, query_entries, get_entry, create_entry, update_entry, delete_entry,
    do_validate_store, get_stages, get_ref_graph,
    do_semantic_propagation, get_skeleton_graph, get_network_metrics,
    get_cross_source, get_formalization_frontier,
)

mcp = FastMCP("astrolabe")


# ── Core Tools (Paper §2) ──

@mcp.tool()
def astrolabe_store_summary(path: str) -> str:
    """One-shot store summary: total entries, atoms, edges, tex/lean/bib counts, lean state distribution (proven/sorry/no_state)."""
    import json
    return json.dumps(store_summary(path), ensure_ascii=False)


@mcp.tool()
def astrolabe_query(path: str, sort: str = "", source: str = "", degree: int | None = None, include_records: bool = False) -> str:
    """Query entries in the astrolabe store. Filter by sort (definition/theorem/lemma/...), source (tex/lean/bib), or degree (0=atom, 1=edge). Returns count + hash list by default; set include_records=True for full entry content."""
    import json
    return json.dumps(query_entries(path, sort, source, degree, include_records), ensure_ascii=False)


@mcp.tool()
def astrolabe_get(path: str, hash: str) -> str:
    """Get a single entry by its 12-char hex hash."""
    import json
    return json.dumps(get_entry(path, hash), ensure_ascii=False)


@mcp.tool()
def astrolabe_create(path: str, ref: list[str], record: str) -> str:
    """Create a new entry. ref=["__self__"] for atoms. record is a JSON string with sort, source, title, notes, etc. Validates well-formedness after creation."""
    import json
    return json.dumps(create_entry(path, ref, record), ensure_ascii=False)


@mcp.tool()
def astrolabe_update(path: str, hash: str, new_record: str) -> str:
    """Update an entry's record. Triggers hash propagation to all referencing entries."""
    import json
    return json.dumps(update_entry(path, hash, new_record), ensure_ascii=False)


@mcp.tool()
def astrolabe_delete(path: str, hash: str) -> str:
    """Delete an entry. Cascades to all degree-1+ entries that reference it."""
    import json
    return json.dumps(delete_entry(path, hash), ensure_ascii=False)


@mcp.tool()
def astrolabe_validate(path: str) -> str:
    """Validate the store against Definition 2.2 well-formedness conditions."""
    import json
    return json.dumps(do_validate_store(path), ensure_ascii=False)


@mcp.tool()
def astrolabe_stages(path: str) -> str:
    """Get stage decomposition: {hash: stage_number}. Atoms=0, cyclic=-1."""
    import json
    return json.dumps(get_stages(path), ensure_ascii=False)


@mcp.tool()
def astrolabe_ref_graph(path: str) -> str:
    """Get the full reference graph with nodes and links."""
    import json
    return json.dumps(get_ref_graph(path), ensure_ascii=False)


# ── LeanNets Tools (Paper §4) ──

@mcp.tool()
def astrolabe_propagate(path: str, changed_hash: str) -> str:
    """Semantic propagation: find all atoms affected by a change (reverse BFS on skeleton graph)."""
    import json
    return json.dumps(do_semantic_propagation(path, changed_hash), ensure_ascii=False)


@mcp.tool()
def astrolabe_skeleton(path: str, size: str = "uniform", color: str = "sort", cluster: str = "none") -> str:
    """Get skeleton graph (atoms as nodes, edges as links) with computed size/color/cluster metrics."""
    import json
    return json.dumps(get_skeleton_graph(path, size, color, cluster), ensure_ascii=False)


@mcp.tool()
def astrolabe_metrics(path: str, metric: str) -> str:
    """Compute a network metric: degree, in-degree, out-degree, pagerank, betweenness, katz, hub, authority, depth, reachability, community."""
    import json
    return json.dumps(get_network_metrics(path, metric), ensure_ascii=False)


@mcp.tool()
def astrolabe_cross_source(path: str, hash: str) -> str:
    """Find the cross-source counterpart (tex↔lean) for an atom."""
    import json
    return json.dumps(get_cross_source(path, hash), ensure_ascii=False)


@mcp.tool()
def astrolabe_frontier(path: str) -> str:
    """Find tex atoms most worth formalizing, ranked by PageRank importance. Returns atoms without lean counterparts."""
    import json
    return json.dumps(get_formalization_frontier(path), ensure_ascii=False)


if __name__ == "__main__":
    mcp.run()
