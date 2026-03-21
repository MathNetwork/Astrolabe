"""
File Browser Router — project file tree and file content reading.

Extracted from server.py.
"""
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

_EXCLUDED_DIRS = {
    ".lake", ".git", "node_modules", "__pycache__", ".venv",
    "target", ".next", "out", "build", "dist", ".reference",
}


def _scan_directory(dir_path: Path, exclude: set[str] = None) -> list[dict]:
    """Recursively scan a directory and return tree structure."""
    exclude = exclude or set()
    entries = []
    try:
        for item in sorted(dir_path.iterdir(), key=lambda p: (p.is_file(), p.name)):
            if item.name.startswith('.') and item.name != '.astrolabe':
                continue
            if item.name in exclude:
                continue
            if item.is_dir():
                entries.append({
                    "name": item.name,
                    "type": "directory",
                    "path": str(item),
                    "children": _scan_directory(item, exclude),
                })
            else:
                entries.append({
                    "name": item.name,
                    "type": "file",
                    "path": str(item),
                    "size": item.stat().st_size,
                })
    except PermissionError:
        pass
    return entries


@router.get("/api/project/files")
async def get_project_files(path: str = Query(..., description="Project path")):
    """Get project directory tree, excluding build artifacts."""
    project_dir = Path(path)
    if not project_dir.exists():
        return []
    return _scan_directory(project_dir, exclude=_EXCLUDED_DIRS)


@router.get("/api/project/file-content")
async def get_file_content(
    path: str = Query(..., description="Project path"),
    file: str = Query(..., description="Relative file path within project"),
):
    """Read a file's text content from anywhere in the project directory."""
    project_dir = Path(path)
    file_path = (project_dir / file).resolve()
    # Prevent path traversal outside project
    if not str(file_path).startswith(str(project_dir.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to read file")
    return {"content": content, "name": file_path.name, "path": str(file_path)}


@router.get("/api/file")
async def read_file(
    path: str = Query(..., description="File absolute path"),
    line: int = Query(1, description="Target line number (1-indexed)"),
    context: int = Query(20, description="Context line count"),
):
    """Read file content (with context around a target line)."""
    file_path = Path(path)

    if not file_path.exists():
        raise HTTPException(404, f"File not found: {path}")

    try:
        content = file_path.read_text(encoding="utf-8")
        lines = content.split("\n")
        total_lines = len(lines)

        start_line = max(1, line - context)
        end_line = min(total_lines, line + context)

        selected_lines = lines[start_line - 1 : end_line]
        selected_content = "\n".join(selected_lines)

        return {
            "content": selected_content,
            "startLine": start_line,
            "endLine": end_line,
            "totalLines": total_lines,
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to read file: {e}")
