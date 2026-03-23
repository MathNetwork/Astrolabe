"""Tests for astrolabe_analysis.py core logic."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from astrolabe_analysis import compute_degree, compute_all_degrees, assign_colors, find_cycles

SAMPLE = {
    "a1": {"ref": ["a1"]},
    "a2": {"ref": ["a2"]},
    "e1": {"ref": ["a1", "a2"]},
    "e2": {"ref": ["a2", "a1", "a1"]},
    "f1": {"ref": ["a1", "e1"]},
    "c1": {"ref": ["c2", "a1"]},
    "c2": {"ref": ["c1", "a2"]},
}


def test_atom_degree():
    assert compute_degree({"ref": ["a1"]}, "a1") == 0


def test_non_atom_single_ref():
    assert compute_degree({"ref": ["x"]}, "y") == 0


def test_degree_1():
    assert compute_degree({"ref": ["a1", "a2"]}, "e1") == 1


def test_degree_2():
    assert compute_degree({"ref": ["a2", "a1", "a1"]}, "e2") == 2


def test_cycle_degree():
    assert compute_degree({"ref": ["c2", "a1"]}, "c1") == 1
    assert compute_degree({"ref": ["c1", "a2"]}, "c2") == 1


def test_all_degrees():
    degrees = compute_all_degrees(SAMPLE)
    assert degrees["a1"] == 0
    assert degrees["a2"] == 0
    assert degrees["e1"] == 1
    assert degrees["e2"] == 2
    assert degrees["f1"] == 1
    assert degrees["c1"] == 1
    assert degrees["c2"] == 1


def test_color_assignment():
    degrees = compute_all_degrees(SAMPLE)
    colors = assign_colors(degrees)
    assert colors["a1"] == colors["a2"]
    assert colors["e1"] == colors["f1"] == colors["c1"] == colors["c2"]
    assert colors["a1"] != colors["e1"]
    assert colors["e1"] != colors["e2"]


def test_color_count():
    degrees = compute_all_degrees(SAMPLE)
    colors = assign_colors(degrees)
    unique_colors = set(colors.values())
    unique_degrees = set(degrees.values())
    assert len(unique_colors) == len(unique_degrees)


def test_cycle_detection():
    cycles = find_cycles(SAMPLE)
    assert len(cycles) >= 1
    cycle_nodes = set()
    for cyc in cycles:
        cycle_nodes.update(cyc)
    assert {"c1", "c2"}.issubset(cycle_nodes)


def test_no_false_cycles():
    dag = {
        "a": {"ref": ["a"]},
        "b": {"ref": ["a", "a"]},
    }
    cycles = find_cycles(dag)
    assert len(cycles) == 0
