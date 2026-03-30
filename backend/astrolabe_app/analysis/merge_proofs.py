"""Merge proof atoms into their parent statements."""
import json


def merge_proofs(entries: dict) -> dict:
    """Collapse proof atoms into their statements.

    - Find (statement, proof) edges
    - Remove proof atoms and those edges
    - Redirect edges that referenced proof to statement
    - Add proofs: [proof_hash, ...] to statement record
    """
    if not entries:
        return {}

    # Find statement→proof pairs
    proof_to_stmt: dict[str, str] = {}  # proof_hash → statement_hash
    stmt_proofs: dict[str, list[str]] = {}  # statement_hash → [proof_hash, ...]
    proof_edges: set[str] = set()  # edge hashes to remove

    for h, e in entries.items():
        if len(e["ref"]) != 2:
            continue
        try:
            rec = json.loads(e["record"])
            sort = rec.get("sort", "")
        except:
            sort = ""

        if sort.endswith(", proof)"):
            stmt_h, proof_h = e["ref"]
            # Verify proof_h is actually a proof atom
            if proof_h in entries and len(entries[proof_h]["ref"]) == 1:
                try:
                    proof_rec = json.loads(entries[proof_h]["record"])
                    if proof_rec.get("sort") == "proof":
                        proof_to_stmt[proof_h] = stmt_h
                        stmt_proofs.setdefault(stmt_h, []).append(proof_h)
                        proof_edges.add(h)
                except:
                    pass

    if not proof_to_stmt:
        return dict(entries)

    result: dict = {}

    # Copy atoms, skip proofs, augment statements
    for h, e in entries.items():
        if len(e["ref"]) == 1:
            if h in proof_to_stmt:
                continue  # skip proof atom
            if h in stmt_proofs:
                # Add proofs list to statement record
                try:
                    rec = json.loads(e["record"])
                    rec["proofs"] = stmt_proofs[h]
                    result[h] = {"ref": e["ref"], "record": json.dumps(rec, ensure_ascii=False)}
                except:
                    result[h] = e
            else:
                result[h] = e

    # Copy edges, skip proof edges, redirect proof references
    for h, e in entries.items():
        if len(e["ref"]) != 2:
            continue
        if h in proof_edges:
            continue  # skip (statement, proof) edge

        ref0, ref1 = e["ref"]
        new_ref0 = proof_to_stmt.get(ref0, ref0)
        new_ref1 = proof_to_stmt.get(ref1, ref1)

        # Skip self-loops from redirection
        if new_ref0 == new_ref1:
            continue
        # Skip if redirected ref points to nonexistent node
        if new_ref0 not in result or new_ref1 not in result:
            continue

        result[h] = {"ref": [new_ref0, new_ref1], "record": e["record"]}

    return result
