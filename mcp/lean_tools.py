"""Lean tools: project detection, sorry scanning, state synchronization."""
import json
import os
import re
from pathlib import Path


def find_lean_project(path: str) -> str | None:
    """Find the Lean project root (directory containing lakefile.lean or lakefile.toml).

    Searches the given path and up to 2 levels of subdirectories.
    Returns the directory path, or None if not found.
    """
    p = Path(path).resolve()
    for candidate in [p] + list(p.iterdir()) if p.is_dir() else [p]:
        if not candidate.is_dir():
            continue
        if (candidate / "lakefile.lean").exists() or (candidate / "lakefile.toml").exists():
            return str(candidate)
    # depth 2
    if p.is_dir():
        for child in p.iterdir():
            if not child.is_dir() or child.name.startswith("."):
                continue
            for grandchild in child.iterdir():
                if not grandchild.is_dir() or grandchild.name.startswith("."):
                    continue
                if (grandchild / "lakefile.lean").exists() or (grandchild / "lakefile.toml").exists():
                    return str(grandchild)
    return None


def lean_project_info(path: str) -> dict:
    """Detect Lean project information: lakefile path, toolchain version, .lean files.

    Args:
        path: Project root directory (will search for lakefile in subdirectories).
    """
    lean_root = find_lean_project(path)
    if lean_root is None:
        return {"error": "No Lean project found (no lakefile.lean or lakefile.toml)"}

    root = Path(lean_root)

    # Determine lakefile type
    if (root / "lakefile.toml").exists():
        lakefile = "lakefile.toml"
    else:
        lakefile = "lakefile.lean"

    # Read toolchain
    toolchain_file = root / "lean-toolchain"
    toolchain = toolchain_file.read_text().strip() if toolchain_file.exists() else None

    # Find .lean files
    lean_files = sorted(str(f.relative_to(root)) for f in root.rglob("*.lean")
                        if ".lake" not in f.parts)

    return {
        "lean_root": str(root),
        "lakefile": lakefile,
        "toolchain": toolchain,
        "lean_files": lean_files,
        "lean_file_count": len(lean_files),
    }


# Pattern to match `sorry` that is not inside a comment or string
_SORRY_RE = re.compile(r'\bsorry\b')
_LINE_COMMENT_RE = re.compile(r'--.*$')
_BLOCK_COMMENT_START = re.compile(r'/-')
_BLOCK_COMMENT_END = re.compile(r'-/')


def lean_sorry_scan(path: str) -> dict:
    """Scan .lean files for `sorry` occurrences, excluding comments.

    Args:
        path: Project root directory (will search for Lean project in subdirectories).
    """
    lean_root = find_lean_project(path)
    if lean_root is None:
        return {"error": "No Lean project found (no lakefile.lean or lakefile.toml)"}

    root = Path(lean_root)
    results = {}
    total = 0

    for lean_file in sorted(root.rglob("*.lean")):
        if ".lake" in lean_file.parts:
            continue
        try:
            text = lean_file.read_text()
        except OSError:
            continue

        lines = text.split("\n")
        sorry_lines = []
        in_block_comment = 0

        for i, line in enumerate(lines, 1):
            # Track block comment nesting
            j = 0
            clean_parts = []
            while j < len(line):
                if in_block_comment > 0:
                    if line[j:j+2] == "-/":
                        in_block_comment -= 1
                        j += 2
                    elif line[j:j+2] == "/-":
                        in_block_comment += 1
                        j += 2
                    else:
                        j += 1
                else:
                    if line[j:j+2] == "/-":
                        in_block_comment += 1
                        j += 2
                    elif line[j:j+2] == "--":
                        break  # rest of line is comment
                    else:
                        clean_parts.append(line[j])
                        j += 1

            clean_line = "".join(clean_parts)
            if _SORRY_RE.search(clean_line):
                sorry_lines.append(i)

        if sorry_lines:
            rel = str(lean_file.relative_to(root))
            results[rel] = sorry_lines
            total += len(sorry_lines)

    return {
        "lean_root": str(root),
        "files": results,
        "total_sorry": total,
    }


def _extract_declarations(text: str) -> dict[str, tuple[int, int]]:
    """Extract Lean 4 declarations with their line ranges.

    Returns {name: (start_line, end_line)} where end_line is exclusive.
    Handles: theorem, def, noncomputable def, lemma, instance, proposition, corollary.
    """
    decl_re = re.compile(
        r'^(?:noncomputable\s+)?(?:theorem|def|lemma|instance|proposition|corollary)\s+(\S+)',
        re.MULTILINE,
    )
    lines = text.split("\n")
    # Find all declaration start positions
    decl_starts: list[tuple[str, int]] = []
    for m in decl_re.finditer(text):
        line_num = text[:m.start()].count("\n") + 1
        decl_starts.append((m.group(1), line_num))

    # Compute line ranges
    decls = {}
    for i, (name, start) in enumerate(decl_starts):
        if i + 1 < len(decl_starts):
            end = decl_starts[i + 1][1]
        else:
            end = len(lines) + 1
        decls[name] = (start, end)
    return decls


def lean_sync_state(path: str) -> dict:
    """Sync Lean compilation state to Astrolabe store.

    Scans .lean files for sorry occurrences, matches declarations to store atoms
    by title, and updates the state field (proven/sorry/checked).

    Args:
        path: Project root directory containing both .astrolabe/ and lean project.
    """
    from utils import get_store

    lean_root = find_lean_project(path)
    if lean_root is None:
        return {"error": "No Lean project found (no lakefile.lean or lakefile.toml)"}

    # Get sorry locations
    scan = lean_sorry_scan(path)
    if "error" in scan:
        return scan

    root = Path(lean_root)

    # Build map: declaration_name -> has_sorry
    # by parsing each .lean file for declarations and cross-referencing with sorry lines
    decl_sorry: dict[str, bool] = {}  # fully-qualified name -> has_sorry
    decl_sort: dict[str, str] = {}    # name -> sort (theorem/def/lemma/...)

    sort_re = re.compile(
        r'^(?:noncomputable\s+)?(theorem|def|lemma|instance|proposition|corollary)\s+(\S+)',
        re.MULTILINE,
    )

    for lean_file in sorted(root.rglob("*.lean")):
        if ".lake" in lean_file.parts:
            continue
        try:
            text = lean_file.read_text()
        except OSError:
            continue

        rel = str(lean_file.relative_to(root))
        sorry_lines = set(scan["files"].get(rel, []))
        decls = _extract_declarations(text)

        # Also extract sort (theorem/def/lemma) for each declaration
        for m in sort_re.finditer(text):
            sort_kw, name = m.group(1), m.group(2)
            decl_sort[name] = sort_kw

        for name, (start, end) in decls.items():
            has_sorry = bool(sorry_lines & set(range(start, end)))
            decl_sorry[name] = has_sorry

    # Load store and match atoms
    store = get_store(path)
    entries = store.all_entries()
    updates = []

    for h, e in list(entries.items()):
        try:
            rec = json.loads(e["record"])
        except (json.JSONDecodeError, TypeError):
            continue

        if rec.get("source") != "lean":
            continue
        # Skip proof objects (they don't get state)
        if rec.get("sort") == "proof":
            continue
        # Only process atoms (degree 0)
        if len(e["ref"]) != 1 or e["ref"][0] != h:
            continue

        title = rec.get("title", "")
        # Extract short name: "Module.name" -> "name"
        short_name = title.rsplit(".", 1)[-1] if "." in title else title

        if short_name not in decl_sorry:
            continue

        has_sorry = decl_sorry[short_name]
        sort_kw = decl_sort.get(short_name, "")

        if has_sorry:
            new_state = "sorry"
        elif sort_kw == "def" or rec.get("sort") == "definition":
            new_state = "checked"
        elif sort_kw == "instance" or rec.get("sort") == "instance":
            new_state = "checked"
        else:
            new_state = "proven"

        old_state = rec.get("state")
        if old_state == new_state:
            continue

        rec["state"] = new_state
        new_record = json.dumps(rec, ensure_ascii=False)
        store.update_record(h, new_record)
        updates.append({
            "hash": h,
            "title": title,
            "old_state": old_state,
            "new_state": new_state,
        })

    return {
        "updated": len(updates),
        "updates": updates,
        "declarations_found": len(decl_sorry),
    }


def register_lean_tools(mcp):
    """Register all Lean tools on the given FastMCP instance."""

    @mcp.tool(name="lean_project_info")
    def lean_project_info_tool(path: str) -> str:
        """Detect Lean project: lakefile type, toolchain version, .lean file list. Pass the project root directory."""
        return json.dumps(lean_project_info(path), ensure_ascii=False)

    @mcp.tool(name="lean_sorry_scan")
    def lean_sorry_scan_tool(path: str) -> str:
        """Scan .lean files for sorry occurrences (excluding comments). Pass the project root directory."""
        return json.dumps(lean_sorry_scan(path), ensure_ascii=False)

    @mcp.tool(name="lean_sync_state")
    def lean_sync_state_tool(path: str) -> str:
        """Sync Lean compilation state to Astrolabe store. Updates state field (proven/sorry/checked) for lean atoms by scanning .lean files. Pass the project root directory."""
        return json.dumps(lean_sync_state(path), ensure_ascii=False)
