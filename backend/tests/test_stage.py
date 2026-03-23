"""
Stage decomposition tests (Definition 2.15).

S_0 = atoms (stage 0)
S_{m+1} = S_m ∪ { σ | all ref(σ) ∈ S_m }
Δ^(m) = S_{m+1} \ S_m  (stage layer m+1)
H_m = hashes in S_m (vertex pool)
Cyclic entries (ref cycle) → stage = -1
"""
import json
import pytest

from astrolabe.storage import AstrolabeStorage


@pytest.fixture
def multi_stage(tmp_path):
    """
    a1, a2, a3 → stage 0 (atoms)
    e1=[a1,a2], e2=[a2,a3], f1=[a1,a2,a3] → stage 1 (all refs are atoms)
    m1=[e1,e2], m2=[e1,f1] → stage 2 (refs are stage-1 entries)
    """
    data = {
        "a1": {"ref": ["a1"], "record": {"name": "atom1"}},
        "a2": {"ref": ["a2"], "record": {"name": "atom2"}},
        "a3": {"ref": ["a3"], "record": {"name": "atom3"}},
        "e1": {"ref": ["a1", "a2"], "record": {"sort": "uses"}},
        "e2": {"ref": ["a2", "a3"], "record": {"sort": "uses"}},
        "f1": {"ref": ["a1", "a2", "a3"], "record": {"sort": "chain"}},
        "m1": {"ref": ["e1", "e2"], "record": {"sort": "parallel"}},
        "m2": {"ref": ["e1", "f1"], "record": {"sort": "subsumption"}},
    }
    p = tmp_path / ".astrolabe"
    p.mkdir()
    (p / "astrolabe.json").write_text(json.dumps(data), encoding="utf-8")
    return AstrolabeStorage(str(tmp_path))


@pytest.fixture
def cyclic_store(tmp_path):
    """c1 → c2 → c3 → c1: all cyclic, stage = -1."""
    data = {
        "a1": {"ref": ["a1"], "record": {}},
        "c1": {"ref": ["c2", "a1"], "record": {}},
        "c2": {"ref": ["c3", "a1"], "record": {}},
        "c3": {"ref": ["c1", "a1"], "record": {}},
    }
    p = tmp_path / ".astrolabe"
    p.mkdir()
    (p / "astrolabe.json").write_text(json.dumps(data), encoding="utf-8")
    return AstrolabeStorage(str(tmp_path))


class TestStageValues:
    def test_atoms_are_stage_0(self, multi_stage):
        st = multi_stage.stages()
        assert st["a1"] == 0
        assert st["a2"] == 0
        assert st["a3"] == 0

    def test_edges_and_faces_are_stage_1(self, multi_stage):
        st = multi_stage.stages()
        assert st["e1"] == 1
        assert st["e2"] == 1
        assert st["f1"] == 1

    def test_meta_entries_are_stage_2(self, multi_stage):
        st = multi_stage.stages()
        assert st["m1"] == 2
        assert st["m2"] == 2

    def test_all_entries_have_stage(self, multi_stage):
        st = multi_stage.stages()
        assert set(st.keys()) == set(multi_stage.all_entries().keys())


class TestCyclic:
    def test_cyclic_entries_stage_minus_1(self, cyclic_store):
        st = cyclic_store.stages()
        assert st["c1"] == -1
        assert st["c2"] == -1
        assert st["c3"] == -1

    def test_non_cyclic_atom_still_stage_0(self, cyclic_store):
        st = cyclic_store.stages()
        assert st["a1"] == 0


class TestVertexPool:
    def test_H0_is_atoms(self, multi_stage):
        H0 = multi_stage.vertex_pool(0)
        assert H0 == {"a1", "a2", "a3"}

    def test_H1_includes_stage_0_and_1(self, multi_stage):
        H1 = multi_stage.vertex_pool(1)
        assert H1 == {"a1", "a2", "a3", "e1", "e2", "f1"}

    def test_H2_is_everything(self, multi_stage):
        H2 = multi_stage.vertex_pool(2)
        assert H2 == {"a1", "a2", "a3", "e1", "e2", "f1", "m1", "m2"}


class TestStageLayer:
    def test_layer_0_is_atoms(self, multi_stage):
        """Δ^(-1) doesn't exist; stage_layer(0) = entries with stage == 0 (atoms)."""
        layer = multi_stage.stage_layer(0)
        assert set(layer.keys()) == {"a1", "a2", "a3"}

    def test_layer_1(self, multi_stage):
        layer = multi_stage.stage_layer(1)
        assert set(layer.keys()) == {"e1", "e2", "f1"}

    def test_layer_2(self, multi_stage):
        layer = multi_stage.stage_layer(2)
        assert set(layer.keys()) == {"m1", "m2"}

    def test_layer_3_empty(self, multi_stage):
        layer = multi_stage.stage_layer(3)
        assert layer == {}
