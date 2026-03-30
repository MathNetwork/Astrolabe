"""Build a complete skeleton view: atoms as nodes, degree-1 as edges, with computed size/color."""
import json
import hashlib
from .graph_builder import build_skeleton_graph
from .degree import compute_degree
from .centrality import compute_centrality
from .dag import compute_dag_metric
from .community import detect_communities
from .cluster import compute_clusters


def _sort_to_color(sort: str) -> str:
    """Deterministic sort → hex color (matches frontend sortColors.ts)."""
    h = 0
    for c in sort:
        h = ((h << 5) - h + ord(c)) & 0xFFFFFFFF
    h = abs(h) if h < 0x80000000 else h
    hue = h % 360
    sat = 50 + (h >> 8) % 30
    lit = 45 + (h >> 16) % 20
    return _hsl_to_hex(hue, sat, lit)


def _hsl_to_hex(h: int, s: int, l: int) -> str:
    s_f, l_f = s / 100, l / 100
    def f(n):
        k = (n + h / 30) % 12
        a = s_f * min(l_f, 1 - l_f)
        return round((l_f - a * max(-1, min(k - 3, 9 - k, 1))) * 255)
    return f'#{f(0):02x}{f(8):02x}{f(4):02x}'


def _blend_hex(a: str, b: str) -> str:
    ar, ag, ab = int(a[1:3], 16), int(a[3:5], 16), int(a[5:7], 16)
    br, bg, bb = int(b[1:3], 16), int(b[3:5], 16), int(b[5:7], 16)
    return f'#{(ar+br)//2:02x}{(ag+bg)//2:02x}{(ab+bb)//2:02x}'


def _normalize(values: dict, min_out: float, max_out: float) -> dict:
    if not values:
        return {}
    vals = list(values.values())
    lo, hi = min(vals), max(vals)
    mid = (min_out + max_out) / 2
    if hi == lo:
        return {k: mid for k in values}
    return {k: min_out + (v - lo) / (hi - lo) * (max_out - min_out) for k, v in values.items()}


def _gradient(values: dict) -> dict:
    """Map values to cool→warm hex colors."""
    if not values:
        return {}
    vals = list(values.values())
    lo, hi = min(vals), max(vals)
    result = {}
    for k, v in values.items():
        t = 0.5 if hi == lo else (v - lo) / (hi - lo)
        hue = round(220 * (1 - t))
        result[k] = _hsl_to_hex(hue, 70, 50)
    return result


def build_skeleton_view(
    entries: dict,
    size_by: str = "uniform",
    color_by: str = "sort",
    cluster_by: str = "none",
) -> dict:
    """Build complete skeleton view data for frontend rendering.

    Returns: { nodes: [...], edges: [...] }
    """
    if not entries:
        return {"nodes": [], "edges": []}

    G = build_skeleton_graph(entries)
    if G.number_of_nodes() == 0:
        return {"nodes": [], "edges": []}

    # Compute size
    if size_by == "uniform":
        radii = {n: 6.0 for n in G.nodes()}
    elif size_by in ("degree", "in-degree", "out-degree"):
        mode = {"degree": "total", "in-degree": "in", "out-degree": "out"}[size_by]
        raw = compute_degree(entries, mode)
        radii = _normalize(raw, 3, 14)
    elif size_by in ("pagerank", "betweenness", "katz", "hub", "authority"):
        raw = compute_centrality(entries, size_by)
        radii = _normalize(raw, 3, 14)
    elif size_by in ("depth", "reachability"):
        raw = compute_dag_metric(entries, size_by)
        radii = _normalize(raw, 3, 14)
    else:
        radii = {n: 6.0 for n in G.nodes()}

    # Compute color
    if color_by == "sort":
        colors = {n: _sort_to_color(G.nodes[n].get("sort", "")) for n in G.nodes()}
    elif color_by == "community":
        communities = detect_communities(entries)
        unique_ids = sorted(set(communities.values()))
        palette = {cid: _hsl_to_hex((i * 137) % 360, 65, 55) for i, cid in enumerate(unique_ids)}
        colors = {n: palette.get(communities.get(n, 0), "#888888") for n in G.nodes()}
    elif color_by == "layer":
        raw = compute_dag_metric(entries, "depth")
        colors = _gradient(raw)
    elif color_by in ("pagerank", "betweenness", "katz", "hub", "authority"):
        raw = compute_centrality(entries, color_by)
        colors = _gradient(raw)
    elif color_by in ("depth", "reachability"):
        raw = compute_dag_metric(entries, color_by)
        colors = _gradient(raw)
    elif color_by == "spectral":
        # Fallback to community for now
        communities = detect_communities(entries)
        unique_ids = sorted(set(communities.values()))
        palette = {cid: _hsl_to_hex((i * 97) % 360, 70, 50) for i, cid in enumerate(unique_ids)}
        colors = {n: palette.get(communities.get(n, 0), "#888888") for n in G.nodes()}
    elif color_by == "curvature":
        # Placeholder: use betweenness as proxy
        raw = compute_centrality(entries, "betweenness")
        colors = _gradient(raw)
    else:
        colors = {n: "#888888" for n in G.nodes()}

    # Compute clusters
    clusters: dict[str, int] = {}
    if cluster_by != "none":
        method = cluster_by.replace("cluster-", "") if cluster_by.startswith("cluster-") else cluster_by
        try:
            clusters = compute_clusters(entries, method)
        except ValueError:
            pass

    # Build nodes
    nodes = []
    for n, data in G.nodes(data=True):
        node = {
            "id": n,
            "sort": data.get("sort", ""),
            "title": data.get("title", ""),
            "radius": radii.get(n, 6.0),
            "color": colors.get(n, "#888888"),
        }
        if n in clusters:
            node["cluster"] = clusters[n]
        nodes.append(node)

    # Build edges
    edges = []
    for u, v, data in G.edges(data=True):
        sort = data.get("sort", "")
        # Edge color: blend of endpoint sorts
        c1 = colors.get(u, "#888888")
        c2 = colors.get(v, "#888888")
        edges.append({
            "source": u,
            "target": v,
            "sort": sort,
            "hash": data.get("hash", ""),
            "color": _blend_hex(c1, c2),
        })

    return {"nodes": nodes, "edges": edges}
