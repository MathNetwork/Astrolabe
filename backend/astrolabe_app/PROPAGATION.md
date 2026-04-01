# Hash Propagation Plan

## Problem

When an entry's record changes, its hash changes. Currently:

1. **ref propagation** (✅ done): `_propagate_hash_change` updates all degree-1+ entries whose `ref` contains the old hash → replaces with new hash, recomputes their hashes, recurses.

2. **record text propagation** (✅ implemented): `\entryref{old_hash}{text}` strings inside other entries' records are updated. See `storage.py` `_propagate_hash_change`, which scans `e["record"]` for the old hash and replaces it alongside ref updates.

## Solution

After a hash change, also scan all entries' `record` text for the old hash and replace it.

### Algorithm

```python
def _propagate_hash_change(self, old_hash, new_hash):
    # Phase 1: ref propagation (existing)
    for each entry where old_hash in entry.ref:
        replace old_hash in ref
        recompute hash
        recurse

    # Phase 2: record text propagation (new)
    for each entry where old_hash appears in entry.record string:
        replace old_hash in record text
        recompute hash
        if hash changed:
            recurse (this entry's hash changed too)
```

### Edge Cases

- **Circular**: A references B in record, B references A in record. Changing A triggers B update, which triggers A update again. Need a `visited` set to prevent infinite recursion.
- **Cascading**: A's record mentions B. B's record mentions C. Changing C → B's hash changes → A's record has old B hash → A needs update too. The recursion handles this.
- **MDX files**: `\entryref` in `.astrolabe/docs/*.mdx` files are NOT in astrolabe.json. These are external and won't be auto-updated. This is acceptable — MDX is a presentation layer.

### Implementation

1. Test: modify `_propagate_hash_change` to also scan records
2. Add `visited` set parameter to prevent cycles
3. Test with sample data

### Files to Change

- `backend/astrolabe_app/storage.py` — `_propagate_hash_change` method only
