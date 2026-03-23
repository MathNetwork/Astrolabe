#!/usr/bin/env python3
"""Read an astrolabe.json file and draw its reference network."""

import json
import argparse


def load_astrolabe(path):
    with open(path) as f:
        return json.load(f)


def build_graph(data):
    """Return nodes (with metadata) and edges."""
    nodes = {}
    edges = []
    for h, entry in data.items():
        ref = entry["ref"]
        is_atom = len(ref) == 1 and ref[0] == h
        degree = len(ref) - 1 if not is_atom else 0
        nodes[h] = {"is_atom": is_atom, "degree": degree, "ref_len": len(ref)}
        for r in ref:
            if r != h:
                edges.append((h, r))
    return nodes, edges


def draw_graphviz(nodes, edges, output_path, engine="dot"):
    """Draw with graphviz."""
    from graphviz import Digraph

    fmt = output_path.rsplit(".", 1)[-1]
    dot = Digraph(format=fmt, engine=engine)
    dot.attr(rankdir="BT", bgcolor="white", margin="0.1", size="4,5")
    dot.attr(
        "node",
        shape="circle",
        style="filled",
        fillcolor="white",
        color="black",
        penwidth="0.8",
        fontname="Courier",
        fontsize="7",
    )
    dot.attr("edge", color="black", arrowsize="0.5", penwidth="0.6")

    for h, meta in nodes.items():
        width = "0.28" if meta["is_atom"] else "0.32"
        dot.node(h, h, width=width, height=width, fixedsize="true")

    for src, dst in edges:
        dot.edge(src, dst)

    stem = output_path.rsplit(".", 1)[0]
    dot.render(stem, cleanup=True)


def main():
    parser = argparse.ArgumentParser(
        description="Draw astrolabe reference network"
    )
    parser.add_argument("input", help="Path to astrolabe.json")
    parser.add_argument(
        "-o",
        "--output",
        default="reference_network.pdf",
        help="Output file (pdf, svg, png)",
    )
    parser.add_argument(
        "--engine",
        default="dot",
        help="Graphviz engine: dot, neato, fdp, sfdp",
    )
    args = parser.parse_args()

    data = load_astrolabe(args.input)
    nodes, edges = build_graph(data)
    print(f"Nodes: {len(nodes)}  Edges: {len(edges)}")
    draw_graphviz(nodes, edges, args.output, engine=args.engine)
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
