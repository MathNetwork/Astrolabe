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
