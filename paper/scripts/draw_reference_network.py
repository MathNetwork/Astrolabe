#!/usr/bin/env python3
"""Read an astrolabe.json file, detect cycles, and output a TikZ reference network."""

import json
import argparse
import subprocess
import sys

DEGREE_COLORS = {
    0: "black",
    1: "blue!70!black",
    2: "red!70!black",
    3: "violet!70!black",
    4: "green!50!black",
}


def load_astrolabe(path):
    with open(path) as f:
        return json.load(f)


def build_graph(data):
    """Return nodes dict and edge list. Skip atom self-references."""
    nodes = {}
    edges = []
    for h, entry in data.items():
        ref = entry["ref"]
        is_atom = len(ref) == 1 and ref[0] == h
        degree = 0 if is_atom else len(ref) - 1
        nodes[h] = {"is_atom": is_atom, "degree": degree, "ref_len": len(ref)}
        for r in ref:
            if r != h:
                edges.append((h, r))
    return nodes, edges


def find_cycles(nodes, edges):
    """Find all cycles via DFS. Return list of cycles (each a list of hashes)."""
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

    for n in nodes:
        if n not in visited:
            dfs(n)
    return cycles


def graphviz_layout(nodes, edges, engine="dot"):
    """Run graphviz to compute node positions."""
    lines = ["digraph G {", "  rankdir=BT;"]
    for h in nodes:
        lines.append(f'  {h} [label="{h}", width=0.3, height=0.3, fixedsize=true];')
    for src, dst in edges:
        lines.append(f"  {src} -> {dst};")
    lines.append("}")
    dot_source = "\n".join(lines)

    result = subprocess.run(
        [engine, "-Tplain"], input=dot_source, capture_output=True, text=True
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


def generate_tikz(nodes, edges, positions, scale=0.8, color_by=None):
    """Generate TikZ code."""
    lines = ["\\begin{tikzpicture}[v/.style={circle, fill, inner sep=0.5pt}]"]

    if color_by == "degree":
        # Define colored node styles
        degrees_used = sorted(set(m["degree"] for m in nodes.values()))
        for k in degrees_used:
            c = DEGREE_COLORS.get(k, "gray")
            lines.append(
                f"  \\tikzset{{d{k}/.style={{circle, fill={c}, inner sep=1.2pt}}}}"
            )

    # Edges
    for src, dst in edges:
        if src in positions and dst in positions:
            sx, sy = positions[src][0] * scale, positions[src][1] * scale
            dx, dy = positions[dst][0] * scale, positions[dst][1] * scale
            lines.append(
                f"  \\draw[very thin] ({sx:.2f},{sy:.2f}) -- ({dx:.2f},{dy:.2f});"
            )

    # Nodes
    for h, (x, y) in positions.items():
        sx, sy = x * scale, y * scale
        if color_by == "degree":
            k = nodes[h]["degree"]
            style = f"d{k}"
            lines.append(f"  \\node[{style}] ({h}) at ({sx:.2f},{sy:.2f}) {{}};")
            lines.append(
                f"  \\node[font=\\tiny, above=1pt, text={DEGREE_COLORS.get(k, 'gray')}] at ({h}) {{\\texttt{{{h}}}}};"
            )
        else:
            lines.append(f"  \\node[v] ({h}) at ({sx:.2f},{sy:.2f}) {{}};")
            lines.append(
                f"  \\node[font=\\tiny, above=1pt] at ({h}) {{\\texttt{{{h}}}}};"
            )

    # Legend for degree coloring
    if color_by == "degree":
        degrees_used = sorted(set(m["degree"] for m in nodes.values()))
        all_y = [positions[h][1] * scale for h in positions]
        all_x = [positions[h][0] * scale for h in positions]
        lx = max(all_x) + 0.15
        ly = min(all_y) - 0.1
        for i, k in enumerate(degrees_used):
            c = DEGREE_COLORS.get(k, "gray")
            label = "atom" if k == 0 else f"$k={k}$"
            yy = ly - i * 0.22
            lines.append(
                f"  \\node[circle, fill={c}, inner sep=1.2pt] at ({lx:.2f},{yy:.2f}) {{}};"
            )
            lines.append(
                f"  \\node[font=\\tiny, anchor=west] at ({lx + 0.1:.2f},{yy:.2f}) {{{label}}};"
            )

    lines.append("\\end{tikzpicture}")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Astrolabe reference network -> TikZ")
    parser.add_argument("input", help="Path to astrolabe.json")
    parser.add_argument("-o", "--output", default=None, help="Output .tex file")
    parser.add_argument("--engine", default="dot", help="Graphviz layout engine")
    parser.add_argument("--scale", type=float, default=0.8, help="Coordinate scale")
    parser.add_argument(
        "--color-by",
        choices=["degree"],
        default=None,
        help="Color nodes by degree",
    )
    parser.add_argument("--test", action="store_true", help="Run self-tests")
    args = parser.parse_args()

    if args.test:
        run_tests()
        return

    data = load_astrolabe(args.input)
    nodes, edges = build_graph(data)
    cycles = find_cycles(nodes, edges)

    print(f"Nodes: {len(nodes)}  Edges: {len(edges)}  Cycles: {len(cycles)}")
    for i, c in enumerate(cycles):
        print(f"  cycle {i+1}: {' -> '.join(c)}")

    positions = graphviz_layout(nodes, edges, engine=args.engine)
    tikz = generate_tikz(
        nodes, edges, positions, scale=args.scale, color_by=args.color_by
    )

    out = args.output or args.input.rsplit(".", 1)[0] + ".tex"
    with open(out, "w") as f:
        f.write(tikz)
    print(f"Wrote {out}")


def run_tests():
    """Self-tests."""
    # Test 1: atom detection
    data = {"a": {"ref": ["a"]}, "b": {"ref": ["b"]}, "e": {"ref": ["a", "b"]}}
    nodes, edges = build_graph(data)
    assert nodes["a"]["is_atom"] is True
    assert nodes["a"]["degree"] == 0
    assert nodes["e"]["is_atom"] is False
    assert nodes["e"]["degree"] == 1
    assert len(edges) == 2
    print("PASS: atom detection + degree")

    # Test 2: self-ref skipped
    data = {"x": {"ref": ["x"]}}
    nodes, edges = build_graph(data)
    assert edges == []
    print("PASS: self-ref skipped")

    # Test 3: cycle detection
    data = {
        "c1": {"ref": ["c2", "a"]},
        "c2": {"ref": ["c3", "b"]},
        "c3": {"ref": ["c1", "c"]},
        "a": {"ref": ["a"]},
        "b": {"ref": ["b"]},
        "c": {"ref": ["c"]},
    }
    nodes, edges = build_graph(data)
    cycles = find_cycles(nodes, edges)
    assert len(cycles) >= 1
    cycle_nodes = set()
    for cyc in cycles:
        cycle_nodes.update(cyc)
    assert {"c1", "c2", "c3"}.issubset(cycle_nodes)
    print("PASS: cycle detection")

    # Test 4: no cycles in DAG
    data = {"a": {"ref": ["a"]}, "b": {"ref": ["a", "a"]}}
    nodes, edges = build_graph(data)
    cycles = find_cycles(nodes, edges)
    assert len(cycles) == 0
    print("PASS: no false cycles in DAG")

    # Test 5: degree coloring
    data = {
        "a": {"ref": ["a"]},
        "e": {"ref": ["a", "a"]},
        "f": {"ref": ["a", "e", "a"]},
    }
    nodes, _ = build_graph(data)
    assert nodes["a"]["degree"] == 0
    assert nodes["e"]["degree"] == 1
    assert nodes["f"]["degree"] == 2
    print("PASS: degree values")

    print("All tests passed.")


if __name__ == "__main__":
    main()
