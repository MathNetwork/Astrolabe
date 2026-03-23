"""Tests for astrolabe_analysis.py core logic."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from astrolabe_analysis import (
    is_atom,
    compute_degree,
    compute_all_degrees,
    assign_colors,
    compute_stages,
    assign_stage_colors,
    find_cycles,
)

SAMPLE = {
    "a1": {"ref": ["a1"]},
    "a2": {"ref": ["a2"]},
    "a3": {"ref": ["a3"]},
    "a4": {"ref": ["a4"]},
    "e1": {"ref": ["a1", "a2"]},
    "e2": {"ref": ["a2", "a3"]},
    "e3": {"ref": ["a3", "a4"]},
    "e4": {"ref": ["a1", "a4"]},
    "f1": {"ref": ["a1", "e1", "e2"]},
    "f2": {"ref": ["e3", "e4"]},
    "m1": {"ref": ["f1", "e3"]},
    "m2": {"ref": ["m1", "f2", "a2"]},
    "c1": {"ref": ["c2", "a1"]},
    "c2": {"ref": ["c3", "a2"]},
    "c3": {"ref": ["c1", "a3"]},
}


# --- is_atom ---

def test_is_atom_true():
    assert is_atom({"ref": ["a1"]}, "a1") is True

def test_is_atom_false_form():
    assert is_atom({"ref": ["a1", "a2"]}, "e1") is False

def test_is_atom_false_single_ref_other():
    assert is_atom({"ref": ["x"]}, "y") is False


# --- degree ---

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

def test_all_degrees():
    degrees = compute_all_degrees(SAMPLE)
    assert degrees["a1"] == 0
    assert degrees["a2"] == 0
    assert degrees["e1"] == 1
    assert degrees["f1"] == 2
    assert degrees["m1"] == 1
    assert degrees["m2"] == 2
    assert degrees["c1"] == 1

def test_color_assignment():
    degrees = compute_all_degrees(SAMPLE)
    colors = assign_colors(degrees)
    assert colors["a1"] == colors["a2"]
    assert colors["a1"] != colors["e1"]
    assert colors["e1"] != colors["f1"]

def test_color_count():
    degrees = compute_all_degrees(SAMPLE)
    colors = assign_colors(degrees)
    assert len(set(colors.values())) == len(set(degrees.values()))


# --- stage ---

def test_stage_atoms():
    stages = compute_stages(SAMPLE)
    assert stages["a1"] == 0
    assert stages["a2"] == 0
    assert stages["a3"] == 0
    assert stages["a4"] == 0

def test_stage_pure_atom_forms():
    stages = compute_stages(SAMPLE)
    assert stages["e1"] == 1
    assert stages["e2"] == 1
    assert stages["e3"] == 1
    assert stages["e4"] == 1

def test_stage_2():
    stages = compute_stages(SAMPLE)
    assert stages["f1"] == 2
    assert stages["f2"] == 2

def test_stage_3():
    stages = compute_stages(SAMPLE)
    assert stages["m1"] == 3

def test_stage_4():
    stages = compute_stages(SAMPLE)
    assert stages["m2"] == 4

def test_cycle_entries():
    stages = compute_stages(SAMPLE)
    assert stages["c1"] == -1
    assert stages["c2"] == -1
    assert stages["c3"] == -1

def test_stage_colors_atoms_same():
    stages = compute_stages(SAMPLE)
    colors = assign_stage_colors(stages)
    assert colors["a1"] == colors["a2"] == colors["a3"] == colors["a4"]

def test_stage_colors_different_stages():
    stages = compute_stages(SAMPLE)
    colors = assign_stage_colors(stages)
    assert colors["a1"] != colors["e1"]
    assert colors["e1"] != colors["f1"]
    assert colors["f1"] != colors["m1"]

def test_stage_colors_same_stage():
    stages = compute_stages(SAMPLE)
    colors = assign_stage_colors(stages)
    assert colors["e1"] == colors["e2"] == colors["e3"] == colors["e4"]
    assert colors["f1"] == colors["f2"]

def test_stage_colors_cycle_is_gray():
    stages = compute_stages(SAMPLE)
    colors = assign_stage_colors(stages)
    assert colors["c1"] == colors["c2"] == colors["c3"]
    assert colors["c1"] != colors["a1"]
    assert colors["c1"] != colors["e1"]

def test_stage_vs_degree():
    """Same degree, different stage."""
    stages = compute_stages(SAMPLE)
    assert stages["f2"] == 2  # degree 1, stage 2
    assert stages["e1"] == 1  # degree 1, stage 1

def test_empty_file():
    assert compute_stages({}) == {}

def test_atoms_only():
    data = {"x": {"ref": ["x"]}, "y": {"ref": ["y"]}}
    stages = compute_stages(data)
    assert stages["x"] == 0
    assert stages["y"] == 0

def test_pure_cycle():
    data = {
        "p": {"ref": ["q", "r"]},
        "q": {"ref": ["p"]},
        "r": {"ref": ["p"]},
    }
    stages = compute_stages(data)
    assert stages["p"] == -1
    assert stages["q"] == -1
    assert stages["r"] == -1


# --- cycles ---

def test_cycle_detection():
    cycles = find_cycles(SAMPLE)
    assert len(cycles) >= 1
    cycle_nodes = set()
    for cyc in cycles:
        cycle_nodes.update(cyc)
    assert {"c1", "c2", "c3"}.issubset(cycle_nodes)

def test_no_false_cycles():
    dag = {"a": {"ref": ["a"]}, "b": {"ref": ["a", "a"]}}
    cycles = find_cycles(dag)
    assert len(cycles) == 0
