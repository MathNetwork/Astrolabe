"""LeanNets tools (Paper section 4): propagation, metrics, skeleton, cross-source, frontier."""
import json

from astrolabe_app.analysis.graph_builder import build_skeleton_graph
from astrolabe_app.analysis.semantic_propagation import semantic_propagation
from astrolabe_app.analysis.skeleton_graph import build_skeleton_view
from astrolabe_app.analysis.degree import compute_degree
from astrolabe_app.analysis.centrality import compute_centrality
from astrolabe_app.analysis.dag import compute_dag_metric
from astrolabe_app.analysis.community import detect_communities
from utils import get_store, parse_record


def do_semantic_propagation(path: str, changed_hash: str) -> dict:
    """Find all atoms affected by a change via reverse BFS on the skeleton graph."""
    entries = get_store(path).all_entries()
    G = build_skeleton_graph(entries)
    if changed_hash not in G:
        return {"changed": changed_hash, "affected": [], "error": "Hash not found in skeleton graph"}
    affected = semantic_propagation(G, changed_hash)
    return {"changed": changed_hash, "affected": sorted(affected)}


def get_skeleton_graph(path: str, size: str = "uniform", color: str = "sort", cluster: str = "none") -> dict:
    """Skeleton graph: atoms as nodes, edges as links, with optional size/color/cluster metrics."""
    entries = get_store(path).all_entries()
    return build_skeleton_view(entries, size_by=size, color_by=color, cluster_by=cluster)


def get_network_metrics(path: str, metric: str) -> dict:
    """Compute a network metric: degree, in-degree, out-degree, pagerank, betweenness, katz, hub, authority, depth, reachability, community."""
    entries = get_store(path).all_entries()
    if metric in ("degree", "in-degree", "out-degree"):
        mode = {"degree": "total", "in-degree": "in", "out-degree": "out"}[metric]
        return compute_degree(entries, mode)
    elif metric in ("pagerank", "betweenness", "katz", "hub", "authority"):
        return compute_centrality(entries, metric)
    elif metric in ("depth", "reachability"):
        return compute_dag_metric(entries, metric)
    elif metric == "community":
        return detect_communities(entries)
    else:
        return {"error": f"Unknown metric: {metric}"}


def get_cross_source(path: str, hash: str) -> dict:
    """Find the cross-source counterpart (tex<->lean) for an atom."""
    entries = get_store(path).all_entries()
    entry = entries.get(hash)
    if not entry:
        return {"error": f"Entry {hash!r} not found"}

    parsed = parse_record(entry["record"])
    if parsed is None:
        return {"error": "Cannot parse record"}
    my_source = parsed.get("source", "")

    for h, e in entries.items():
        if len(e["ref"]) != 2:
            continue
        if hash not in e["ref"]:
            continue
        other_hash = e["ref"][0] if e["ref"][1] == hash else e["ref"][1]
        other = entries.get(other_hash)
        if not other:
            continue
        other_parsed = parse_record(other["record"])
        if other_parsed is None:
            continue
        other_source = other_parsed.get("source", "")
        if other_source and other_source != my_source:
            return {
                "hash": hash,
                "source": my_source,
                "counterpart_hash": other_hash,
                "counterpart_source": other_source,
                "counterpart_record": other_parsed,
                "edge_hash": h,
            }

    return {"hash": hash, "source": my_source, "counterpart": None}


def get_formalization_frontier(path: str) -> dict:
    """Tex atoms most worth formalizing, ranked by PageRank. Returns atoms without lean counterparts."""
    entries = get_store(path).all_entries()
    G = build_skeleton_graph(entries)

    if G.number_of_nodes() == 0:
        return {"frontier": []}

    try:
        pagerank = compute_centrality(entries, "pagerank")
    except Exception:
        pagerank = {}

    tex_atoms = {}
    for h, e in entries.items():
        if len(e["ref"]) != 1 or e["ref"][0] != h:
            continue
        parsed = parse_record(e["record"])
        if parsed is None:
            continue
        if parsed.get("source") == "tex" and parsed.get("sort") != "proof":
            tex_atoms[h] = parsed

    has_lean = set()
    for h, e in entries.items():
        if len(e["ref"]) != 2:
            continue
        r0, r1 = e["ref"]
        for a, b in [(r0, r1), (r1, r0)]:
            if a in tex_atoms:
                other = entries.get(b)
                if other:
                    op = parse_record(other["record"])
                    if op and op.get("source") == "lean":
                        has_lean.add(a)

    frontier = []
    for h, parsed in tex_atoms.items():
        if h in has_lean:
            continue
        frontier.append({
            "hash": h,
            "sort": parsed.get("sort", ""),
            "title": parsed.get("title", ""),
            "pagerank": pagerank.get(h, 0),
            "has_lean": False,
        })

    frontier.sort(key=lambda x: x["pagerank"], reverse=True)
    return {"frontier": frontier, "total_tex": len(tex_atoms), "formalized": len(has_lean)}


def register_leannets_tools(mcp):
    """Register all LeanNets tools on the given FastMCP instance."""

    @mcp.tool()
    def propagate(path: str, changed_hash: str) -> str:
        """Find all atoms affected by a change via reverse BFS on the skeleton graph."""
        return json.dumps(do_semantic_propagation(path, changed_hash), ensure_ascii=False)

    @mcp.tool()
    def skeleton(path: str, size: str = "uniform", color: str = "sort", cluster: str = "none") -> str:
        """Skeleton graph (atoms as nodes, edges as links) with size/color/cluster metrics."""
        return json.dumps(get_skeleton_graph(path, size, color, cluster), ensure_ascii=False)

    @mcp.tool()
    def metrics(path: str, metric: str) -> str:
        """Compute a network metric: degree, in-degree, out-degree, pagerank, betweenness, katz, hub, authority, depth, reachability, community."""
        return json.dumps(get_network_metrics(path, metric), ensure_ascii=False)

    @mcp.tool()
    def cross_source(path: str, hash: str) -> str:
        """Find the cross-source counterpart (tex<->lean) for an atom."""
        return json.dumps(get_cross_source(path, hash), ensure_ascii=False)

    @mcp.tool()
    def frontier(path: str) -> str:
        """Tex atoms most worth formalizing, ranked by PageRank importance."""
        return json.dumps(get_formalization_frontier(path), ensure_ascii=False)
