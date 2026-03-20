"""
Lean ilean parser for Astrolabe plugin.

Parses .ilean files from Lean 4 compilation artifacts and produces
Astrolabe obj/mor proposals.

Adapted from LeanAstrolabe's ilean_parser.py.
"""
import hashlib
import json
import re
from pathlib import Path
from typing import Optional


# ── Regex patterns ──

SORRY_PATTERN = re.compile(r'\bsorry\b')
LINE_COMMENT = re.compile(r'--.*$', re.MULTILINE)
BLOCK_COMMENT = re.compile(r'/-.*?-/', re.DOTALL)

DECL_KEYWORDS = {
    "theorem", "lemma", "def", "definition", "structure", "class",
    "instance", "axiom", "abbrev", "example", "inductive", "opaque"
}

DECL_MODIFIERS = {
    "noncomputable", "protected", "private", "partial", "unsafe", "scoped"
}

# ── Sort mapping: Lean kind → Astrolabe sort ──

KIND_TO_SORT = {
    "theorem": "lean-theorem",
    "lemma": "lean-lemma",
    "definition": "lean-definition",
    "structure": "lean-structure",
    "class": "lean-class",
    "instance": "lean-instance",
    "axiom": "lean-axiom",
    "inductive": "lean-inductive",
    "example": "lean-example",
    "opaque": "lean-opaque",
    "unknown": "lean-definition",
}

MAIN_KINDS = {
    "theorem", "lemma", "axiom", "definition",
    "structure", "class", "instance", "inductive", "example"
}


def _make_id(lean_full_name: str) -> str:
    """Generate deterministic 12-char hex id from Lean full name."""
    return hashlib.sha256(lean_full_name.encode()).hexdigest()[:12]


def _make_edge_id(source_name: str, target_name: str) -> str:
    """Generate deterministic edge id from source+target."""
    return hashlib.sha256(f"{source_name}->{target_name}".encode()).hexdigest()[:12]


# ── Core parsing functions (adapted from LeanAstrolabe) ──

def detect_sorry(content: str) -> bool:
    """Detect sorry in content (excluding comments)."""
    if not content:
        return False
    content_clean = BLOCK_COMMENT.sub("", content)
    content_clean = LINE_COMMENT.sub("", content_clean)
    return bool(SORRY_PATTERN.search(content_clean))


def find_decl_keyword_in_line(line: str) -> Optional[str]:
    """Find a declaration keyword in a line, handling modifiers."""
    stripped = line.lstrip()
    if not stripped:
        return None
    words = stripped.split()
    for word in words:
        if word.startswith("@["):
            continue
        if word in DECL_MODIFIERS:
            continue
        if word in DECL_KEYWORDS:
            return word
        break
    return None


def infer_kind(content: str) -> str:
    """Infer declaration kind from content."""
    first_line = content.strip().split('\n')[0] if content else ""
    keyword = find_decl_keyword_in_line(first_line)
    if keyword is None:
        return "definition"
    if keyword in ("def", "definition", "abbrev"):
        return "definition"
    return keyword


def find_declaration_start(lines: list[str], line_hint: int) -> int:
    """Search upward to find the declaration keyword line."""
    if not lines:
        return line_hint
    start_line = min(line_hint, len(lines) - 1)
    for i in range(start_line, -1, -1):
        if find_decl_keyword_in_line(lines[i]) is not None:
            return i
    return start_line


def extract_full_declaration(lines: list[str], line_start: int) -> str:
    """Extract complete declaration from starting line until next declaration."""
    if not lines or line_start >= len(lines):
        return ""
    actual_start = find_declaration_start(lines, line_start)
    result = []
    for i in range(actual_start, len(lines)):
        line = lines[i]
        if i > actual_start and find_decl_keyword_in_line(line) is not None:
            break
        result.append(line)
    return "\n".join(result).strip()


def find_source_file(module_name: str, project_root: Path) -> Optional[Path]:
    """Find .lean source file from module name."""
    if not module_name:
        return None
    relative_path = module_name.replace(".", "/") + ".lean"
    for candidate in [project_root / relative_path, project_root / "src" / relative_path]:
        if candidate.exists():
            return candidate
    return None


def get_project_name(project_root: Path) -> str:
    """Get project name from lakefile."""
    lakefile = project_root / "lakefile.lean"
    if lakefile.exists():
        try:
            content = lakefile.read_text(encoding="utf-8")
            match = re.search(r'lean_lib\s+(\w+)', content)
            if match:
                return match.group(1)
            match = re.search(r'package\s+(\w+)', content)
            if match:
                return match.group(1)
        except Exception:
            pass
    return project_root.name


# ── Main entry point ──

def parse_ilean_file(ilean_path: Path, project_root: Path) -> tuple[list[dict], dict]:
    """Parse a single .ilean file, return (declarations, usage_map)."""
    try:
        data = json.loads(ilean_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, FileNotFoundError):
        return [], {}

    module_name = data.get("module", "")
    references = data.get("references", {})
    source_file = find_source_file(module_name, project_root)

    local_defs = {}
    usage_map = {}

    for ref_key, ref_data in references.items():
        try:
            ref_info = json.loads(ref_key)
            if "c" not in ref_info:
                continue
            decl_module = ref_info["c"].get("m", "")
            decl_name = ref_info["c"].get("n", "")
            full_name = f"{decl_module}.{decl_name}"

            definition = ref_data.get("definition")
            usages = ref_data.get("usages", [])

            if definition is not None and decl_module == module_name:
                local_defs[decl_name] = {
                    "definition": definition,
                    "full_name": full_name,
                }

            if usages:
                if full_name not in usage_map:
                    usage_map[full_name] = []
                for usage in usages:
                    if len(usage) >= 5:
                        usage_map[full_name].append({
                            "line": usage[0],
                            "user": usage[4],
                            "user_module": module_name,
                        })
                    elif len(usage) >= 2:
                        usage_map[full_name].append({
                            "line": usage[0],
                            "user": None,
                            "user_module": module_name,
                        })
        except json.JSONDecodeError:
            continue

    # Read source
    source_lines = []
    if source_file and source_file.exists():
        try:
            source_lines = source_file.read_text(encoding="utf-8").split("\n")
        except Exception:
            pass

    # Build declarations
    declarations = []
    for name, info in local_defs.items():
        definition = info["definition"]
        if len(definition) < 4:
            continue
        line_start = definition[0]

        if source_lines:
            content = extract_full_declaration(source_lines, line_start)
            has_sorry = detect_sorry(content)
            kind = infer_kind(content)
        else:
            content = ""
            has_sorry = False
            kind = "unknown"

        declarations.append({
            "full_name": info["full_name"],
            "name": name,
            "kind": kind,
            "has_sorry": has_sorry,
            "line_start": line_start,
        })

    return declarations, usage_map


def parse_lean_project(project_root: Path) -> dict:
    """
    Parse entire Lean project from .lake/build cache.
    Returns Astrolabe-compatible obj/mor proposals.
    """
    lake_build = project_root / ".lake" / "build" / "lib" / "lean"
    if not lake_build.exists():
        return {"objects": [], "morphisms": []}

    project_name = get_project_name(project_root)
    project_dir = lake_build / project_name

    if project_dir.exists():
        ilean_files = list(project_dir.rglob("*.ilean"))
    else:
        # Search non-dependency directories
        excluded = {
            "Mathlib", "Batteries", "Aesop", "ProofWidgets", "Qq",
            "ImportGraph", "Lean", "Lake", "Init", "Std",
        }
        ilean_files = []
        if lake_build.exists():
            for subdir in lake_build.iterdir():
                if subdir.is_dir() and subdir.name not in excluded:
                    ilean_files.extend(subdir.rglob("*.ilean"))

    # Parse all ilean files
    all_decls = []
    all_usage_maps = {}
    node_by_name = {}

    for ilean_file in ilean_files:
        decls, usage_map = parse_ilean_file(ilean_file, project_root)
        filtered = [d for d in decls if d["kind"] in MAIN_KINDS]
        all_decls.extend(filtered)
        for d in filtered:
            node_by_name[d["full_name"]] = d
        for target, usages in usage_map.items():
            if target not in all_usage_maps:
                all_usage_maps[target] = []
            all_usage_maps[target].extend(usages)

    # Convert to Astrolabe objects
    objects = []
    for d in all_decls:
        sort = KIND_TO_SORT.get(d["kind"], "lean-definition")
        status = "sorry" if d["has_sorry"] else "proven"
        objects.append({
            "id": _make_id(d["full_name"]),
            "name": d["name"],
            "sort": sort,
            "status": status,
            "statement": "",
            "notes": f"Lean: {d['full_name']}",
        })

    # Build morphisms from usage_map
    morphisms = []
    seen_edges = set()

    for target_name, usages in all_usage_maps.items():
        if target_name not in node_by_name:
            continue
        for usage in usages:
            user = usage.get("user")
            user_module = usage.get("user_module", "")
            if user:
                source_name = f"{user_module}.{user}"
            else:
                continue  # Can't determine source without user name

            if source_name not in node_by_name:
                continue
            if source_name == target_name:
                continue

            edge_key = (source_name, target_name)
            if edge_key in seen_edges:
                continue
            seen_edges.add(edge_key)

            morphisms.append({
                "id": _make_edge_id(source_name, target_name),
                "source": _make_id(source_name),
                "target": _make_id(target_name),
                "sort": "uses",
                "notes": f"{source_name} uses {target_name}",
            })

    return {"objects": objects, "morphisms": morphisms}
