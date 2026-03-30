"""Tests for hash propagation including record text references — TDD."""
import json
import pytest
import tempfile
import os


def make_storage(entries):
    """Create a temp AstrolabeStorage with given entries."""
    from astrolabe_app.storage import AstrolabeStorage
    td = tempfile.mkdtemp()
    os.makedirs(os.path.join(td, ".astrolabe"), exist_ok=True)
    path = os.path.join(td, ".astrolabe", "astrolabe.json")
    with open(path, "w") as f:
        json.dump(entries, f)
    return AstrolabeStorage(td)


def test_ref_propagation_basic():
    """Updating an atom's record should update edges that ref it."""
    s = make_storage({})
    h1, _ = s.create_entry(ref=["__self__"], record='{"sort":"definition"}')
    h2, _ = s.create_entry(ref=["__self__"], record='{"sort":"theorem"}')
    h_edge, _ = s.create_entry(ref=[h2, h1], record='{"sort":"(theorem, definition)"}')

    # Update h1's record → h1 gets new hash → edge should update ref
    result = s.update_record(h1, '{"sort":"definition","notes":"updated"}')
    new_h1 = result[0]
    assert new_h1 != h1

    # Old edge should be gone, new edge should exist with new ref
    assert s.get(h_edge) is None
    # Find the new edge
    edges = [e for e in s.data.values() if len(e["ref"]) == 2]
    assert len(edges) == 1
    assert new_h1 in edges[0]["ref"]


def test_record_text_propagation():
    """Updating an atom should fix \\entryref{old_hash} in other records."""
    s = make_storage({})
    h1, _ = s.create_entry(ref=["__self__"], record='{"sort":"theorem","title":"T1"}')
    h2, _ = s.create_entry(ref=["__self__"], record=f'{{"sort":"proof","notes":"By \\\\entryref{{{h1}}}{{T1}}"}}')

    # Update h1 → hash changes
    result = s.update_record(h1, '{"sort":"theorem","title":"T1","notes":"updated"}')
    new_h1 = result[0]
    assert new_h1 != h1

    # h2's record should now reference new_h1
    # h2 itself may have a new hash too (because its record changed)
    found = False
    for h, e in s.data.items():
        if len(e["ref"]) == 1 and "proof" in e["record"]:
            assert new_h1 in e["record"], f"Record should contain {new_h1}: {e['record']}"
            assert h1 not in e["record"], f"Record should NOT contain old {h1}: {e['record']}"
            found = True
    assert found, "Proof atom not found after propagation"


def test_record_text_propagation_no_false_positive():
    """Entries without the old hash in record should not be affected."""
    s = make_storage({})
    h1, _ = s.create_entry(ref=["__self__"], record='{"sort":"definition"}')
    h2, _ = s.create_entry(ref=["__self__"], record='{"sort":"theorem","notes":"no refs here"}')

    old_h2_record = s.get(h2)["record"]
    s.update_record(h1, '{"sort":"definition","notes":"changed"}')

    # h2 should still exist with same record (may have same or different hash but record unchanged)
    found = False
    for e in s.data.values():
        if e["record"] == old_h2_record:
            found = True
    assert found


def test_no_infinite_recursion():
    """Two atoms referencing each other in record text should not loop."""
    s = make_storage({})
    h1, _ = s.create_entry(ref=["__self__"], record='{"sort":"a"}')
    h2, _ = s.create_entry(ref=["__self__"], record=f'{{"sort":"b","notes":"see \\\\entryref{{{h1}}}{{A}}"}}')
    # Now update h1 to reference h2
    s.update_record(h1, f'{{"sort":"a","notes":"see \\\\entryref{{{h2}}}{{B}}"}}')
    # Should complete without recursion error
    assert len(s.data) >= 2


def test_cascading_record_propagation():
    """A→B in record, B→C in record. Changing C should cascade to B then A."""
    s = make_storage({})
    hC, _ = s.create_entry(ref=["__self__"], record='{"sort":"c"}')
    hB, _ = s.create_entry(ref=["__self__"], record=f'{{"sort":"b","notes":"\\\\entryref{{{hC}}}{{C}}"}}')
    hA, _ = s.create_entry(ref=["__self__"], record=f'{{"sort":"a","notes":"\\\\entryref{{{hB}}}{{B}}"}}')

    # Update C
    result = s.update_record(hC, '{"sort":"c","notes":"updated"}')
    new_hC = result[0]

    # B should now reference new_hC
    found_B = False
    new_hB = None
    for h, e in s.data.items():
        if '"sort": "b"' in e["record"] or '"sort":"b"' in e["record"]:
            assert new_hC in e["record"]
            assert hC not in e["record"]
            found_B = True
            new_hB = h

    # A should now reference new_hB
    found_A = False
    for h, e in s.data.items():
        if '"sort": "a"' in e["record"] or '"sort":"a"' in e["record"]:
            assert new_hB in e["record"]
            assert hB not in e["record"]
            found_A = True

    assert found_B and found_A
