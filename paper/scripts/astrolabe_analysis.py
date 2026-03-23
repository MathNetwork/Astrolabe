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


def is_atom(entry: dict, hash_key: str) -> bool:
    ref = entry["ref"]
    return len(ref) == 1 and ref[0] == hash_key


def compute_stages(data: dict) -> dict:
    """Compute stage of each entry. Cycle entries get stage -1."""
    stages = {}
    for h, entry in data.items():
        if is_atom(entry, h):
            stages[h] = 0

    changed = True
    while changed:
        changed = False
        for h, entry in data.items():
            if h in stages:
                continue
            ref = entry["ref"]
            refs_excl_self = [r for r in ref if r != h]
            if not refs_excl_self:
                continue
            if all(r in stages for r in refs_excl_self):
                stages[h] = max(stages[r] for r in refs_excl_self) + 1
                changed = True

    for h in data:
        if h not in stages:
            stages[h] = -1
    return stages


def assign_stage_colors(stages: dict) -> dict:
    cycle_color = "#9ca3af"
    unique_stages = sorted(s for s in set(stages.values()) if s >= 0)
    stage_to_color = {-1: cycle_color}
    for i, s in enumerate(unique_stages):
        stage_to_color[s] = PALETTE[i % len(PALETTE)]
    return {h: stage_to_color[s] for h, s in stages.items()}


def assign_stage_tikz_colors(stages: dict) -> dict:
    cycle_color = "gray"
    unique_stages = sorted(s for s in set(stages.values()) if s >= 0)
    stage_to_color = {-1: cycle_color}
    for i, s in enumerate(unique_stages):
        stage_to_color[s] = TIKZ_PALETTE[i % len(TIKZ_PALETTE)]
    return {h: stage_to_color[s] for h, s in stages.items()}


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


def generate_tikz(data: dict, positions: dict, scale=0.8, color_mode=None, legend=True) -> str:
    """color_mode: None (plain), 'degree', or 'stage'."""
    edges = build_edges(data)
    lines = ["\\begin{tikzpicture}[v/.style={circle, fill, inner sep=0.5pt}]"]

    # Compute per-node color
    node_tikz_color = {}
    label_keys = {}
    if color_mode == "degree":
        degrees = compute_all_degrees(data)
        node_tikz_color = assign_tikz_colors(degrees)
        unique = sorted(set(degrees.values()))
        for k in unique:
            c = TIKZ_PALETTE[unique.index(k) % len(TIKZ_PALETTE)]
            lines.append(f"  \\tikzset{{s{k}/.style={{circle, fill={c}, inner sep=1.2pt}}}}")
        label_keys = degrees
    elif color_mode == "stage":
        stages = compute_stages(data)
        node_tikz_color = assign_stage_tikz_colors(stages)
        unique = sorted(set(stages.values()))
        for s in unique:
            c = node_tikz_color[[h for h, v in stages.items() if v == s][0]]
            tag = f"sm{abs(s)}" if s < 0 else f"s{s}"
            lines.append(f"  \\tikzset{{{tag}/.style={{circle, fill={c}, inner sep=1.2pt}}}}")
        label_keys = stages

    # Edges
    for src, dst in edges:
        if src in positions and dst in positions:
            sx, sy = positions[src][0] * scale, positions[src][1] * scale
            dx, dy = positions[dst][0] * scale, positions[dst][1] * scale
            lines.append(f"  \\draw[very thin] ({sx:.2f},{sy:.2f}) -- ({dx:.2f},{dy:.2f});")

    # Nodes
    for h, (x, y) in positions.items():
        sx, sy = x * scale, y * scale
        if color_mode:
            k = label_keys[h]
            c = node_tikz_color[h]
            tag = f"sm{abs(k)}" if k < 0 else f"s{k}" if color_mode == "stage" else f"s{k}"
            lines.append(f"  \\node[{tag}] ({h}) at ({sx:.2f},{sy:.2f}) {{}};")
            lines.append(f"  \\node[font=\\tiny, above=1pt, text={c}] at ({h}) {{\\texttt{{{h}}}}};")
        else:
            lines.append(f"  \\node[v] ({h}) at ({sx:.2f},{sy:.2f}) {{}};")
            lines.append(f"  \\node[font=\\tiny, above=1pt] at ({h}) {{\\texttt{{{h}}}}};")

    # Legend
    if color_mode and legend:
        unique = sorted(set(label_keys.values()))
        all_y = [positions[h][1] * scale for h in positions]
        all_x = [positions[h][0] * scale for h in positions]
        lx = max(all_x) + 0.15
        ly = min(all_y) - 0.1
        for i, k in enumerate(unique):
            sample_h = [h for h, v in label_keys.items() if v == k][0]
            c = node_tikz_color[sample_h]
            if color_mode == "degree":
                label = "atom" if k == 0 else f"$k={k}$"
            else:
                label = "cycle" if k < 0 else ("atom" if k == 0 else f"stage {k}")
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
    parser.add_argument("--color-by", choices=["degree", "stage"], default=None, help="Color mode")
    parser.add_argument("--no-legend", action="store_true", help="Omit legend")
    args = parser.parse_args()

    with open(args.input) as f:
        data = json.load(f)

    degrees = compute_all_degrees(data)
    stages = compute_stages(data)
    edges = build_edges(data)
    cycles = find_cycles(data)

    print(f"Nodes: {len(data)}  Edges: {len(edges)}  Cycles: {len(cycles)}")
    for i, c in enumerate(cycles):
        print(f"  cycle {i+1}: {' -> '.join(c)}")
    for k in sorted(set(degrees.values())):
        print(f"  degree {k}: {sum(1 for d in degrees.values() if d == k)} entries")
    for s in sorted(set(stages.values())):
        label = "cycle" if s < 0 else f"stage {s}"
        print(f"  {label}: {sum(1 for v in stages.values() if v == s)} entries")

    positions = graphviz_layout(data, engine=args.engine)
    tikz = generate_tikz(data, positions, scale=args.scale, color_mode=args.color_by, legend=not args.no_legend)

    out = args.output or args.input.rsplit(".", 1)[0] + ".tex"
    with open(out, "w") as f:
        f.write(tikz)
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
