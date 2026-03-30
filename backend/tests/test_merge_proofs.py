"""Tests for proof merging — TDD: write tests first."""

ENTRIES = {
    # Atoms
    "thm": {"ref": ["thm"], "record": '{"sort":"theorem","source":"tex","title":"T1"}'},
    "prf": {"ref": ["prf"], "record": '{"sort":"proof","source":"tex","notes":"proof of T1"}'},
    "def1": {"ref": ["def1"], "record": '{"sort":"definition","source":"tex","title":"D1"}'},
    "lem": {"ref": ["lem"], "record": '{"sort":"lemma","source":"tex","title":"L1"}'},
    # Edges
    "e_thm_prf": {"ref": ["thm", "prf"], "record": '{"sort":"(theorem, proof)"}'},   # statement→proof
    "e_thm_def": {"ref": ["thm", "def1"], "record": '{"sort":"(theorem, definition)"}'},  # depends
    "e_prf_lem": {"ref": ["prf", "lem"], "record": '{"sort":"(proof, lemma)"}'},      # proof uses lemma
}


def test_merge_removes_proof_nodes():
    from astrolabe_app.analysis.merge_proofs import merge_proofs
    merged = merge_proofs(ENTRIES)
    atoms = [h for h, e in merged.items() if len(e["ref"]) == 1]
    # prf should be gone
    assert "prf" not in merged
    assert "thm" in merged
    assert "def1" in merged
    assert "lem" in merged


def test_merge_removes_statement_proof_edge():
    from astrolabe_app.analysis.merge_proofs import merge_proofs
    merged = merge_proofs(ENTRIES)
    # e_thm_prf edge should be gone
    assert "e_thm_prf" not in merged


def test_merge_redirects_proof_edges_to_statement():
    from astrolabe_app.analysis.merge_proofs import merge_proofs
    merged = merge_proofs(ENTRIES)
    # e_prf_lem (proof→lemma) should become thm→lem
    edges = {h: e for h, e in merged.items() if len(e["ref"]) == 2}
    refs = [tuple(e["ref"]) for e in edges.values()]
    assert ("thm", "lem") in refs, f"Expected (thm, lem) in {refs}"


def test_merge_preserves_other_edges():
    from astrolabe_app.analysis.merge_proofs import merge_proofs
    merged = merge_proofs(ENTRIES)
    edges = {h: e for h, e in merged.items() if len(e["ref"]) == 2}
    refs = [tuple(e["ref"]) for e in edges.values()]
    assert ("thm", "def1") in refs


def test_merge_adds_proofs_field_to_statement():
    from astrolabe_app.analysis.merge_proofs import merge_proofs
    merged = merge_proofs(ENTRIES)
    import json
    rec = json.loads(merged["thm"]["record"])
    assert "proofs" in rec
    assert "prf" in rec["proofs"]


def test_merge_multiple_proofs():
    """A statement with two proofs (tex + lean)."""
    entries = {
        **ENTRIES,
        "prf2": {"ref": ["prf2"], "record": '{"sort":"proof","source":"lean","content":"by simp"}'},
        "e_thm_prf2": {"ref": ["thm", "prf2"], "record": '{"sort":"(theorem, proof)"}'},
    }
    from astrolabe_app.analysis.merge_proofs import merge_proofs
    merged = merge_proofs(entries)
    import json
    rec = json.loads(merged["thm"]["record"])
    assert len(rec["proofs"]) == 2
    assert "prf" not in merged
    assert "prf2" not in merged


def test_merge_no_proofs():
    """Entries with no proofs should pass through unchanged."""
    entries = {
        "def1": {"ref": ["def1"], "record": '{"sort":"definition","source":"tex"}'},
        "def2": {"ref": ["def2"], "record": '{"sort":"definition","source":"tex"}'},
        "e": {"ref": ["def1", "def2"], "record": '{"sort":"(definition, definition)"}'},
    }
    from astrolabe_app.analysis.merge_proofs import merge_proofs
    merged = merge_proofs(entries)
    assert len(merged) == 3  # unchanged


def test_merge_empty():
    from astrolabe_app.analysis.merge_proofs import merge_proofs
    assert merge_proofs({}) == {}
