"""
MDX Docs Router — list and read MDX documentation files.

Extracted from server.py.
"""
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()


def _extract_mdx_title(file_path: Path) -> str:
    """Extract first H1 title from MDX file, or fallback to filename."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("# "):
                    return line[2:].strip()
                if line and not line.startswith("---"):
                    break
    except Exception:
        pass
    return file_path.stem


@router.get("/api/docs/list")
async def list_docs(path: str = Query(..., description="Project path")):
    """List MDX files in .astrolabe/docs/ directory."""
    docs_dir = Path(path) / ".astrolabe" / "docs"
    if not docs_dir.exists():
        return {"files": []}

    files = []
    for f in sorted(docs_dir.iterdir()):
        if f.suffix in (".mdx", ".md") and f.is_file():
            files.append({
                "name": f.name,
                "path": str(f),
                "title": _extract_mdx_title(f),
            })
    # Put index.mdx first in the list
    files.sort(key=lambda x: (0 if x["name"] in ("index.mdx", "_index.mdx") else 1, x["name"]))
    return {"files": files}


@router.get("/api/docs/read")
async def read_doc(path: str = Query(..., description="Absolute path to the MDX file")):
    """Read a single MDX file."""
    file_path = Path(path)
    if not file_path.exists():
        raise HTTPException(404, f"File not found: {path}")
    content = file_path.read_text(encoding="utf-8")
    return {"content": content, "name": file_path.name}
