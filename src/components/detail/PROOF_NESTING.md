# Proof Nesting — Development Plan

## Goal

When a statement (theorem/lemma/proposition/corollary) is selected, automatically find and display its proof(s) in a collapsible section. Works for both `source: "tex"` and `source: "lean"` uniformly.

## Current State

- Statement and proof are independent atoms with the same `sort` convention
- Connected by degree-1 edge: `ref = [statement_hash, proof_hash]`
- Edge sort auto-derived: `(theorem, proof)`, `(lemma, proof)`, etc.
- ReadView: manual nesting via `\entryblock{stmt}{\entryblock{proof}{collapsible}}`
- DetailView: no automatic proof display

## Lookup Logic

```
findProofs(statement_hash, all_entries):
  for each entry where ref.length == 2:
    if ref[0] == statement_hash:
      target = entries[ref[1]]
      if target.sort == "proof":
        yield target
```

Same path for tex and lean — `sort: "proof"` is universal.

---

## Stage 1: Lookup Function + Tests

**TDD**: write tests first.

- [ ] `findProofsForStatement(statementId, entries)` → `ProofInfo[]`
- [ ] Returns `{ hash, source, notes?, content? }` for each proof
- [ ] Test: statement with one proof (tex)
- [ ] Test: statement with one proof (lean)
- [ ] Test: statement with no proof
- [ ] Test: statement with multiple proofs (tex + lean)
- [ ] Test: proof atom not confused with other edges

## Stage 2: ProofSection Component

- [ ] `ProofSection({ statementId })` — React component
- [ ] Fetches all entries, calls `findProofsForStatement`
- [ ] For each proof:
  - Collapsible header: "Proof" + source badge (tex/lean)
  - tex: render `notes` via InlineMath (LaTeX + entryref)
  - lean: render `content` as code block
- [ ] Click proof header → select proof atom in NetworkView

## Stage 3: Wire into DetailView

- [ ] Render `<ProofSection>` below record, above plugin sections
- [ ] Only show for statement sorts: theorem, lemma, proposition, corollary
- [ ] Subscribe to `entry-colors-updated` for consistent coloring

## Stage 4: EntryBlock Auto-Nesting (Optional)

- [ ] If an `\entryblock{stmt}` has no nested proof child, auto-append one
- [ ] Or: keep ReadView manual — author controls what appears in docs
- [ ] Decision: manual is cleaner, skip this stage for now

---

## Display Rules

| Source | Field | Rendering |
|--------|-------|-----------|
| `tex` | `notes` | InlineMath (LaTeX + entryref) |
| `lean` | `content` | `<pre>` code block |
| `lean` | `notes` | InlineMath (if present, show as description above code) |

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/detail/proofLookup.ts` | New: `findProofsForStatement()` |
| `src/components/detail/__tests__/proofLookup.test.ts` | New: TDD tests |
| `src/components/detail/ProofSection.tsx` | New: React component |
| `src/components/detail/EntryDetail.tsx` | Modify: add `<ProofSection>` |
