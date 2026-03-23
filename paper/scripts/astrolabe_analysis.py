#!/usr/bin/env python3
"""Astrolabe analysis: degree computation, color assignment, and TikZ/PDF output."""

import json
import argparse
import subprocess
import sys

PALETTE = [
    "#222222",  # degree 0: black
    "#2563eb",  # degree 1: blue
    "#dc2626",  # degree 2: red
    "#7c3aed",  # degree 3: purple
    "#059669",  # degree 4: green
    "#d97706",  # degree 5: amber
    "#be185d",  # degree 6: pink
]

TIKZ_PALETTE = [
    "black",
    "blue!70!black",
    "red!70!black",
    "violet!70!black",
    "green!50!black",
    "orange!70!black",
    "pink!70!black",
]


def compute_degree(entry: dict, hash_key: str) -> int:
    ref = entry["ref"]
    if len(ref) == 1 and ref[0] == hash_key:
        return 0
    return len(ref) - 1


def compute_all_degrees(data: dict) -> dict:
    return {h: compute_degree(entry, h) for h, entry in data.items()}


def assign_colors(degrees: dict) -> dict:
    unique_degrees = sorted(set(degrees.values()))
    degree_to_color = {d: PALETTE[i % len(PALETTE)] for i, d in enumerate(unique_degrees)}
    return {h: degree_to_color[d] for h, d in degrees.items()}


def assign_tikz_colors(degrees: dict) -> dict:
    unique_degrees = sorted(set(degrees.values()))
    degree_to_color = {d: TIKZ_PALETTE[i % len(TIKZ_PALETTE)] for i, d in enumerate(unique_degrees)}
    return {h: degree_to_color[d] for h, d in degrees.items()}


def build_edges(data: dict) -> list:
    edges = []
    for h, entry in data.items():
        for r in entry["ref"]:
            if r != h:
                edges.append((h, r))
    return edges


def find_cycles(data: dict) -> list:
    edges = build_edges(data)
    adj = {}
    for src, dst in edges:
        adj.setdefault(src, []).append(dst)

    cycles = []
    visited = set()
    on_stack = set()
    stack_path = []

    def dfs(node):
        visited.add(node)
        on_stack.add(node)
        stack_path.append(node)
        for nbr in adj.get(node, []):
            if nbr not in visited:
                dfs(nbr)
            elif nbr in on_stack:
                idx = stack_path.index(nbr)
                cycles.append(stack_path[idx:] + [nbr])
        stack_path.pop()
        on_stack.remove(node)

    for n in data:
        if n not in visited:
            dfs(n)
    return cycles


def graphviz_layout(data: dict, engine="dot") -> dict:
    edges = build_edges(data)
    lines = ["digraph G {", "  rankdir=BT;"]
    for h in data:
        lines.append(f'  {h} [label="{h}", width=0.3, height=0.3, fixedsize=true];')
    for src, dst in edges:
        lines.append(f"  {src} -> {dst};")
    lines.append("}")

    result = subprocess.run(
        [engine, "-Tplain"], input="\n".join(lines), capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"graphviz error: {result.stderr}", file=sys.stderr)
        sys.exit(1)

    positions = {}
    for line in result.stdout.splitlines():
        parts = line.split()
        if parts[0] == "node":
            positions[parts[1]] = (float(parts[2]), float(parts[3]))
    return positions


def generate_tikz(data: dict, positions: dict, scale=0.8, color=False, legend=True) -> str:
    degrees = compute_all_degrees(data)
    edges = build_edges(data)
    lines = ["\\begin{tikzpicture}[v/.style={circle, fill, inner sep=0.5pt}]"]

    if color:
        tikz_colors = assign_tikz_colors(degrees)
        unique_degrees = sorted(set(degrees.values()))
        for k in unique_degrees:
            c = TIKZ_PALETTE[unique_degrees.index(k) % len(TIKZ_PALETTE)]
            lines.append(f"  \\tikzset{{d{k}/.style={{circle, fill={c}, inner sep=1.2pt}}}}")

    for src, dst in edges:
        if src in positions and dst in positions:
            sx, sy = positions[src][0] * scale, positions[src][1] * scale
            dx, dy = positions[dst][0] * scale, positions[dst][1] * scale
            lines.append(f"  \\draw[very thin] ({sx:.2f},{sy:.2f}) -- ({dx:.2f},{dy:.2f});")

    for h, (x, y) in positions.items():
        sx, sy = x * scale, y * scale
        if color:
            k = degrees[h]
            c = tikz_colors[h]
            lines.append(f"  \\node[d{k}] ({h}) at ({sx:.2f},{sy:.2f}) {{}};")
            lines.append(f"  \\node[font=\\tiny, above=1pt, text={c}] at ({h}) {{\\texttt{{{h}}}}};")
        else:
            lines.append(f"  \\node[v] ({h}) at ({sx:.2f},{sy:.2f}) {{}};")
            lines.append(f"  \\node[font=\\tiny, above=1pt] at ({h}) {{\\texttt{{{h}}}}};")

    if color and legend:
        unique_degrees = sorted(set(degrees.values()))
        all_y = [positions[h][1] * scale for h in positions]
        all_x = [positions[h][0] * scale for h in positions]
        lx = max(all_x) + 0.15
        ly = min(all_y) - 0.1
        for i, k in enumerate(unique_degrees):
            c = TIKZ_PALETTE[i % len(TIKZ_PALETTE)]
            label = "atom" if k == 0 else f"$k={k}$"
            yy = ly - i * 0.22
            lines.append(f"  \\node[circle, fill={c}, inner sep=1.2pt] at ({lx:.2f},{yy:.2f}) {{}};")
            lines.append(f"  \\node[font=\\tiny, anchor=west] at ({lx + 0.1:.2f},{yy:.2f}) {{{label}}};")

    lines.append("\\end{tikzpicture}")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Astrolabe analysis and visualization")
    parser.add_argument("input", help="Path to astrolabe.json")
    parser.add_argument("-o", "--output", default=None, help="Output file (.tex)")
    parser.add_argument("--engine", default="dot", help="Graphviz layout engine")
    parser.add_argument("--scale", type=float, default=0.8, help="Coordinate scale")
    parser.add_argument("--color", action="store_true", help="Color nodes by degree")
    parser.add_argument("--no-legend", action="store_true", help="Omit legend from colored output")
    args = parser.parse_args()

    with open(args.input) as f:
        data = json.load(f)

    degrees = compute_all_degrees(data)
    edges = build_edges(data)
    cycles = find_cycles(data)

    print(f"Nodes: {len(data)}  Edges: {len(edges)}  Cycles: {len(cycles)}")
    for i, c in enumerate(cycles):
        print(f"  cycle {i+1}: {' -> '.join(c)}")

    deg_counts = {}
    for d in degrees.values():
        deg_counts[d] = deg_counts.get(d, 0) + 1
    for k in sorted(deg_counts):
        print(f"  degree {k}: {deg_counts[k]} entries")

    positions = graphviz_layout(data, engine=args.engine)
    tikz = generate_tikz(data, positions, scale=args.scale, color=args.color, legend=not args.no_legend)

    out = args.output or args.input.rsplit(".", 1)[0] + ".tex"
    with open(out, "w") as f:
        f.write(tikz)
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
