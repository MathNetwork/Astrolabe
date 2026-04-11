"""Build a networkx DiGraph from the 1-skeleton of astrolabe entries."""
import json
import networkx as nx


def _parse_record(raw) -> dict | None:
    """Safely parse a record field into a dict, skipping non-dict values."""
    if isinstance(raw, dict):
        return raw
    if not isinstance(raw, str):
        return None
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return None
    return parsed if isinstance(parsed, dict) else None


def build_skeleton_graph(entries: dict) -> nx.DiGraph:
    """Atoms become nodes, degree-1 entries become directed edges (ref[0] → ref[1])."""
    G = nx.DiGraph()

    # Add atoms as nodes
    for h, e in entries.items():
        if len(e["ref"]) == 1 and e["ref"][0] == h:
            parsed = _parse_record(e["record"])
            if parsed is not None:
                G.add_node(h, sort=parsed.get("sort", ""), title=parsed.get("title", ""), source=parsed.get("source", ""), state=parsed.get("state", ""))
            else:
                G.add_node(h, sort="", title="")

    # Add degree-1 entries as edges
    for h, e in entries.items():
        if len(e["ref"]) == 2:
            src, tgt = e["ref"]
            if src in G.nodes and tgt in G.nodes:
                parsed = _parse_record(e["record"])
                sort = parsed.get("sort", "") if parsed else ""
                G.add_edge(src, tgt, hash=h, sort=sort)

    return G
