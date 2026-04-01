# Astrolabe — Knowledge Network Visualizer

## How AI Should Work With Astrolabe

**Edit files directly.** Modify `astrolabe.json` and `.mdx` files in `.astrolabe/docs/` the same way a human would in VSCode. The app watches for file changes and auto-reloads.

**Do not call REST API for writes.** The REST API is for the app's internal use. AI writes to files; the app reads from files.

**Validate after editing.** After modifying `astrolabe.json`, run `python3 -c "from astrolabe_app.storage import validate_store; import json; validate_store(json.load(open('.astrolabe/astrolabe.json')))"` to check well-formedness. Fix any errors before proceeding.

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
2. **Identity uniqueness**: distinct entries have distinct hashes (structural in JSON)
3. **Referential closure**: every hash in `ref` must exist in the store
4. **Non-empty ref**: `len(ref) >= 1`
5. **Distinct refs**: if `len(ref) > 1`, no duplicate hashes in `ref`

### Degree and Stage
- `degree = len(ref) - 1` — atom is degree 0, edge is degree 1
- Stage: atoms = stage 0; entry whose all refs have stage ≤ m gets stage m+1
- Cyclic entries (reference cycles) get stage -1

### Hash Propagation
Modify record → hash changes → all entries referencing old hash (in ref or record text) are recursively updated and re-hashed. A visited set prevents infinite loops.

---

## LeanNets Record Convention (Paper §4)

Record is a **JSON string**. The LeanNets plugin interprets it with these fields:

### Atoms (degree 0)

**tex source:**
```json
{"sort": "theorem", "source": "tex", "title": "Heine-Borel", "notes": "A subset of $\\mathbb{R}^n$ is compact iff closed and bounded."}
```

**lean source:**
```json
{"sort": "theorem", "source": "lean", "title": "IsCompact.isClosed", "state": "proven", "content": "theorem IsCompact.isClosed (h : IsCompact s) : IsClosed s := ..."}
```

**bib source:**
```json
{"sort": "citation", "source": "bib", "key": "Spivak2012", "notes": "Ologs: a categorical framework..."}
```

| Field | Required | Values |
|-------|----------|--------|
| `sort` | yes | `definition`, `theorem`, `lemma`, `proposition`, `corollary`, `proof`, `instance`, `citation` |
| `source` | yes | `tex`, `lean`, `bib` |
| `title` | no | Display name (no hardcoded numbers — numbering is automatic) |
| `notes` | no | Content text, LaTeX math, may contain `\entryref{hash}` |
| `content` | no | Lean source code (lean entries only) |
| `state` | no | `proven` or `sorry` (lean entries only) |
| `key` | no | Citation key (bib entries only) |

### Edges (degree 1)

An edge connects two atoms: `ref = [atomA_hash, atomB_hash]`.
- Sort is inherited as a pair: `(sort_of_A, sort_of_B)` e.g. `"(theorem, definition)"`
- `source` is inherited similarly
- `notes` describes the dependency nature: "unfolds definition", "rewrites by lemma", etc.

### Cross-Source Edges
An edge between a `tex` atom and a `lean` atom marks formalization correspondence.
Example: `(theorem, theorem)` edge with one `source: "tex"` and one `source: "lean"`.

### Statement–Proof Separation
A theorem's statement and proof are **separate atoms**, connected by an edge.
```
T (theorem atom) ←edge→ P (proof atom)
```
This way changing a proof doesn't re-hash the theorem statement.

---

## MDX Convention

Files in `.astrolabe/docs/`, named `00-index.mdx`, `01-introduction.mdx`, `02-topic.mdx`, etc.

### Macros

- `\entryblock{hash}` — block-level entry display with automatic numbering
- `\entryblock{hash}{collapsible}` — collapsible block
- `\entryblock{hash}{\entryblock{child}{collapsible}}` — nested blocks
- `\entryref{hash}{display text}` — inline link with manual text
- `\entryref{hash}` — inline link with automatic "Sort N.M" display

### Numbering
- Numbers are auto-generated from `\entryblock` position in the document
- Section number comes from filename prefix (`02-` → section 2)
- Counter increments per non-proof entryblock within the file
- Format: `<section>.<counter>` (e.g. "Definition 2.1", "Theorem 2.2")
- **Proof entries are excluded from numbering**
- **Never hardcode numbers in titles or text** — use `\entryref{hash}` for auto-numbering

---

## Architecture

- **Frontend**: Next.js + React + d3-force (2D Canvas), **Tauri desktop app**
- **Backend**: Python (FastAPI/uvicorn), port 8765, JSON persistence
- **Plugins**: `src/plugins/` — modular analysis plugins (e.g. LeanNets)
- **AI Chat**: Tauri IPC → Claude Code CLI → file operations → file watcher → auto-reload

## Rules

- Astrolabe is a **general-purpose** knowledge network tool, not math-specific
- Never describe it as "mathematical" — it works for any domain
- Use `python3` / `python3 -m pytest`, not `python` (macOS Homebrew)
- Communicate with user in Chinese
