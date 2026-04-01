# Astrolabe — Knowledge Network Visualizer

## How AI Should Work With Astrolabe

**Edit files directly.** Modify `astrolabe.json` and `.mdx` files in `.astrolabe/docs/` the same way a human would in VSCode. The app watches for file changes and auto-reloads.

**Do not call REST API for writes.** The REST API is for the app's internal use. AI writes to files; the app reads from files.

**Validate after editing.** After modifying `astrolabe.json`, run `python3 -c "from astrolabe_app.storage import validate_store; import json; validate_store(json.load(open('.astrolabe/astrolabe.json')))"` to check well-formedness.

---

## Core Data Model (Paper §2)

`astrolabe.json` is a content-addressable flat store:
```json
{
  "<12-char-hash>": { "ref": ["<hash>", ...], "record": "<JSON string>" }
}
```

### Hash Computation
`SHA256(ref₁ || 0x00 || ref₂ || 0x00 || ... || record)[:12 hex]`

### Well-Formedness (Definition 2.2) — ALL FIVE MUST HOLD
1. **Atom self-reference**: if `len(ref) == 1`, then `ref[0] == own hash`
2. **Identity uniqueness**: distinct entries have distinct hashes
3. **Referential closure**: every hash in `ref` must exist in the store
4. **Non-empty ref**: `len(ref) >= 1`
5. **Distinct refs**: if `len(ref) > 1`, no duplicate hashes in `ref`

### Degree and Stage
- `degree = len(ref) - 1` — atom is degree 0, edge is degree 1
- Stage: atoms = stage 0; entry whose all refs have stage ≤ m gets stage m+1
- Cyclic entries get stage -1

### Hash Propagation
Modify record → hash changes → all entries referencing old hash (in ref or record text) are recursively updated and re-hashed.

---

## LeanNets Record Convention (Paper §4)

Record is a **JSON string**. Fields:

| Field | Required | Values |
|-------|----------|--------|
| `sort` | yes | `definition`, `theorem`, `lemma`, `proposition`, `corollary`, `proof`, `instance`, `citation` |
| `source` | yes | `tex`, `lean`, `bib` |
| `title` | no | Display name (no hardcoded numbers) |
| `notes` | no | Content text with LaTeX + `\entryref{hash}` |
| `content` | no | Lean source code |
| `state` | no | `proven` or `sorry` (lean only) |
| `key` | no | Citation key (bib only) |

### Edge Convention
Edge (`ref = [A, B]`): sort inherited as pair `"(sort_A, sort_B)"`, notes describe dependency.
Cross-source edge: one tex + one lean atom = formalization correspondence.

---

## MDX Convention

Files: `.astrolabe/docs/00-index.mdx`, `01-intro.mdx`, `02-topic.mdx`, etc.

- `\entryblock{hash}` — block display with auto-numbering
- `\entryblock{hash}{collapsible}` — collapsible
- `\entryref{hash}{text}` — manual inline link
- `\entryref{hash}` — auto "Sort N.M" display

Numbering: section from filename prefix, proof excluded, never hardcode numbers.

---

## Architecture

- **Frontend**: Next.js + React + d3-force, **Tauri desktop app**
- **Backend**: Python FastAPI, port 8765
- **Terminal**: xterm.js panel → Tauri IPC → Claude Code CLI
- **File watcher**: polls mtime, auto-reloads on change

## Rules

- Use `python3` / `python3 -m pytest`, not `python` (macOS Homebrew)
- Communicate with user in Chinese
