"""
Project Init Router — project status, creation, and reset.

Extracted from server.py.
"""
from pathlib import Path
import json

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()



# ── Templates ──

_NETWORK_MDX_TEMPLATE = """\
# Astrolabe Category

Welcome to your Astrolabe category.

This file is rendered in the **READ** tab. You can use Markdown with $\\LaTeX$ support:

$$
\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}
$$

<theorem env="theorem" number="1" title="Example">
Every bounded sequence in $\\mathbb{R}^n$ has a convergent subsequence.
</theorem>

<proof>
This follows from the Bolzano\u2013Weierstrass theorem. $\\square$
</proof>

Edit this file at `.astrolabe/network.mdx` to document your astrolabe category.
"""

_DOCS_INDEX_TEMPLATE = """\
# Welcome to your astrolabe category

Start by creating objects in the **NETWORK** view, then write your mathematical narrative here.

Use `<ObjRef id="obj-hash" />` to reference objects from your network.

Math works: $E = mc^2$

$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$
"""

_README_TEMPLATE = """\
# {name}

A math astrolabe category built with [Astrolabe](https://github.com/MathNetwork/Astrolabe).

## Getting Started

1. Open this folder in Astrolabe
2. Switch to the **NETWORK** tab to visualize the signature
3. Double-click to create objects, click to inspect them
4. Edit `.astrolabe/network.mdx` to write documentation

## Structure

- `.astrolabe/signature.json` \u2014 objects and morphisms
- `.astrolabe/meta.json` \u2014 viewport state
- `.astrolabe/network.mdx` \u2014 documentation (READ tab)
"""


# ── Routes ──

@router.get("/api/project/status")
async def check_project_status(path: str = Query(..., description="Project path")):
    """
    Check project status.

    Returns whether the path exists and whether .astrolabe/ is set up.
    Auto-creates .astrolabe/ if the directory exists but .astrolabe/ does not.
    """
    project_path = Path(path)

    if not project_path.exists():
        return {
            "exists": False,
            "hasNetmath": False,
            "isSignatureProject": False,
            "message": "Directory does not exist",
        }

    astrolabe_dir = project_path / ".astrolabe"

    # Auto-create .astrolabe/ if it doesn't exist (requirement: open any folder -> auto-init)
    if not astrolabe_dir.exists():
        astrolabe_dir.mkdir(exist_ok=True)
        # Initialize empty signature.json
        signature_file = astrolabe_dir / "signature.json"
        signature_file.write_text(
            json.dumps({"obj": {}, "mor": {}}, indent=2),
            encoding="utf-8",
        )
        # Initialize meta.json
        meta_file = astrolabe_dir / "meta.json"
        meta_file.write_text(
            json.dumps({"viewport": {}}, indent=2),
            encoding="utf-8",
        )
        # Initialize network.mdx template
        mdx_file = astrolabe_dir / "network.mdx"
        mdx_file.write_text(_NETWORK_MDX_TEMPLATE, encoding="utf-8")
        # Initialize README.md in project root
        readme_file = project_path / "README.md"
        if not readme_file.exists():
            project_name = project_path.name
            readme_file.write_text(
                _README_TEMPLATE.format(name=project_name),
                encoding="utf-8",
            )

    # Auto-create docs/ directory with index.mdx if missing
    docs_dir = astrolabe_dir / "docs"
    if not docs_dir.exists():
        docs_dir.mkdir(exist_ok=True)
        index_file = docs_dir / "index.mdx"
        index_file.write_text(_DOCS_INDEX_TEMPLATE, encoding="utf-8")

    return {
        "exists": True,
        "isSignatureProject": True,
        "message": "Ready.",
    }


@router.post("/api/project/create")
async def create_project(data: dict):
    """
    Create a new empty signature project.
    Creates .astrolabe/ directory with signature.json.
    """
    path = data.get("path")
    if not path:
        raise HTTPException(status_code=400, detail="Missing 'path'")

    project_path = Path(path)
    if not project_path.exists():
        raise HTTPException(status_code=400, detail="Directory does not exist")

    astrolabe_dir = project_path / ".astrolabe"
    astrolabe_dir.mkdir(exist_ok=True)

    # Initialize empty signature.json
    signature_file = astrolabe_dir / "signature.json"
    if not signature_file.exists():
        signature_file.write_text(
            json.dumps({"obj": {}, "mor": {}}, indent=2),
            encoding="utf-8",
        )

    # Initialize meta.json
    meta_file = astrolabe_dir / "meta.json"
    if not meta_file.exists():
        meta_file.write_text(
            json.dumps({"viewport": {}}, indent=2),
            encoding="utf-8",
        )

    # Initialize network.mdx template
    mdx_file = astrolabe_dir / "network.mdx"
    if not mdx_file.exists():
        mdx_file.write_text(_NETWORK_MDX_TEMPLATE, encoding="utf-8")

    # Initialize README.md in project root
    readme_file = project_path / "README.md"
    if not readme_file.exists():
        project_name = project_path.name
        readme_file.write_text(
            _README_TEMPLATE.replace("{project_name}", project_name),
            encoding="utf-8",
        )

    # Initialize docs/ directory with index.mdx
    docs_dir = astrolabe_dir / "docs"
    if not docs_dir.exists():
        docs_dir.mkdir(exist_ok=True)
        index_file = docs_dir / "index.mdx"
        index_file.write_text(_DOCS_INDEX_TEMPLATE, encoding="utf-8")

    return {"status": "ok", "path": path, "type": "signature"}


@router.post("/api/reset")
async def reset_project(path: str = Query(..., description="Project path")):
    """
    Reset all project data.
    Deletes the entire .astrolabe directory.
    """
    import shutil

    project_path = Path(path)
    astrolabe_dir = project_path / ".astrolabe"

    if astrolabe_dir.exists():
        shutil.rmtree(astrolabe_dir)

    return {"status": "ok"}
