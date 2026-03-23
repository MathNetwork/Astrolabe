#!/usr/bin/env python3
"""Read an astrolabe.json file and draw its reference network."""

import json
import argparse
import subprocess
import re


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


def make_dot_source(nodes, edges, engine="dot"):
    """Build graphviz DOT source string."""
    lines = ["digraph G {"]
    lines.append('  rankdir=BT;')
    lines.append('  node [shape=circle, style=filled, fillcolor=white,')
    lines.append('        color=black, penwidth=0.8, fontname=Courier, fontsize=7];')
    lines.append('  edge [color=black, arrowsize=0.5, penwidth=0.6];')
    for h, meta in nodes.items():
        w = "0.28" if meta["is_atom"] else "0.32"
        lines.append(f'  {h} [label="{h}", width={w}, height={w}, fixedsize=true];')
    for src, dst in edges:
        lines.append(f"  {src} -> {dst};")
    lines.append("}")
    return "\n".join(lines)


def graphviz_layout(dot_source, engine="dot"):
    """Run graphviz to get node positions (plain format)."""
    result = subprocess.run(
        [engine, "-Tplain"],
        input=dot_source, capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr)

    positions = {}
    edge_list = []
    for line in result.stdout.splitlines():
        parts = line.split()
        if parts[0] == "node":
            name = parts[1]
            x, y = float(parts[2]), float(parts[3])
            positions[name] = (x, y)
        elif parts[0] == "edge":
            src, dst = parts[1], parts[2]
            edge_list.append((src, dst))
    return positions, edge_list


def generate_tikz(nodes, edges, positions, scale=1.0):
    """Generate TikZ code matching the paper's visual style."""
    lines = []
    lines.append("\\begin{tikzpicture}[")
    lines.append("  v/.style={circle, fill, inner sep=0.8pt},")
    lines.append("  vg/.style={circle, draw=gray!60, inner sep=0.8pt}]")

    # Draw edges first (behind nodes)
    for src, dst in edges:
        if src in positions and dst in positions:
            sx, sy = positions[src][0] * scale, positions[src][1] * scale
            dx, dy = positions[dst][0] * scale, positions[dst][1] * scale
            lines.append(f"  \\draw[semithick, blue!60!black] ({sx:.2f},{sy:.2f}) -- ({dx:.2f},{dy:.2f});")

    # Draw nodes on top
    for h, (x, y) in positions.items():
        sx, sy = x * scale, y * scale
        if nodes[h]["is_atom"]:
            lines.append(f"  \\node[v] ({h}) at ({sx:.2f},{sy:.2f}) {{}};")
        else:
            lines.append(f"  \\node[vg] ({h}) at ({sx:.2f},{sy:.2f}) {{}};")
        lines.append(f"  \\node[font=\\tiny, above=2pt] at ({h}) {{\\texttt{{{h}}}}};")

    lines.append("\\end{tikzpicture}")
    return "\n".join(lines)


def draw_graphviz(nodes, edges, output_path, engine="dot"):
    """Draw with graphviz (PDF/SVG/PNG output)."""
    from graphviz import Digraph

    fmt = output_path.rsplit(".", 1)[-1]
    dot = Digraph(format=fmt, engine=engine)
    dot.attr(rankdir="BT", bgcolor="white", margin="0.1", size="4,5")
    dot.attr(
        "node",
        shape="circle", style="filled", fillcolor="white",
        color="black", penwidth="0.8", fontname="Courier", fontsize="7",
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
        "-o", "--output", default="reference_network.pdf",
        help="Output file (pdf, svg, png, tex)",
    )
    parser.add_argument(
        "--engine", default="dot",
        help="Graphviz engine: dot, neato, fdp, sfdp",
    )
    parser.add_argument(
        "--tikz", action="store_true",
        help="Output TikZ code instead of graphviz rendering",
    )
    parser.add_argument(
        "--scale", type=float, default=0.8,
        help="Scale factor for TikZ coordinates (default 0.8)",
    )
    args = parser.parse_args()

    data = load_astrolabe(args.input)
    nodes, edges = build_graph(data)
    print(f"Nodes: {len(nodes)}  Edges: {len(edges)}")

    if args.tikz or args.output.endswith(".tex"):
        dot_source = make_dot_source(nodes, edges, engine=args.engine)
        positions, edge_list = graphviz_layout(dot_source, engine=args.engine)
        tikz = generate_tikz(nodes, edges, positions, scale=args.scale)
        out = args.output if args.output.endswith(".tex") else args.output.rsplit(".", 1)[0] + ".tex"
        with open(out, "w") as f:
            f.write(tikz)
        print(f"Wrote {out}")
    else:
        draw_graphviz(nodes, edges, args.output, engine=args.engine)
        print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
