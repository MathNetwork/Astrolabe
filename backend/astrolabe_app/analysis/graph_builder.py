"""Build a networkx DiGraph from the 1-skeleton of astrolabe entries."""
import json
import networkx as nx


def build_skeleton_graph(entries: dict) -> nx.DiGraph:
    """Atoms become nodes, degree-1 entries become directed edges (ref[0] → ref[1])."""
    G = nx.DiGraph()

    # Add atoms as nodes
    for h, e in entries.items():
        if len(e["ref"]) == 1 and e["ref"][0] == h:
            try:
                parsed = json.loads(e["record"])
                G.add_node(h, sort=parsed.get("sort", ""), title=parsed.get("title", ""), source=parsed.get("source", ""), state=parsed.get("state", ""))
            except (json.JSONDecodeError, TypeError):
                G.add_node(h, sort="", title="")

    # Add degree-1 entries as edges
    for h, e in entries.items():
        if len(e["ref"]) == 2:
            src, tgt = e["ref"]
            if src in G.nodes and tgt in G.nodes:
                try:
                    parsed = json.loads(e["record"])
                    sort = parsed.get("sort", "")
                except (json.JSONDecodeError, TypeError):
                    sort = ""
                G.add_edge(src, tgt, hash=h, sort=sort)

    return G
