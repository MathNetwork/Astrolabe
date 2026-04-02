"""Core tools (Paper section 2): CRUD, validation, store structure."""
import json

from astrolabe_app.storage import validate_store
from utils import get_store


def store_summary(path: str) -> dict:
    """One-shot summary: total, atoms, edges, source distribution, lean states."""
    entries = get_store(path).all_entries()
    total = len(entries)
    atoms = edges = tex = lean = bib = proven = sorry = no_state = 0

    for e in entries.values():
        deg = len(e["ref"]) - 1
        if deg == 0:
            atoms += 1
        else:
            edges += 1
        try:
            rec = json.loads(e["record"])
            src = rec.get("source", "")
            if src == "tex":
                tex += 1
            elif src == "lean":
                lean += 1
                state = rec.get("state", "")
                if state == "proven":
                    proven += 1
                elif state == "sorry":
                    sorry += 1
                else:
                    no_state += 1
            elif src == "bib":
                bib += 1
        except (json.JSONDecodeError, TypeError):
            pass

    return {
        "total": total, "atoms": atoms, "edges": edges,
        "tex": tex, "lean": lean, "bib": bib,
        "proven": proven, "sorry": sorry, "no_state": no_state,
    }


def query_entries(path: str, sort: str = "", source: str = "",
                  degree: int | None = None, include_records: bool = False) -> dict:
    """Query entries with optional filters. Returns count + hashes by default."""
    entries = get_store(path).all_entries()
    matched = {}
    for h, e in entries.items():
        if degree is not None and len(e["ref"]) - 1 != degree:
            continue
        if sort or source:
            try:
                parsed = json.loads(e["record"])
                if sort and parsed.get("sort") != sort:
                    continue
                if source and parsed.get("source") != source:
                    continue
            except (json.JSONDecodeError, TypeError):
                continue
        matched[h] = e
    if include_records:
        return {"count": len(matched), "entries": matched}
    return {"count": len(matched), "hashes": list(matched.keys())}


def get_entry(path: str, hash: str) -> dict:
    """Get a single entry by its 12-char hex hash."""
    entry = get_store(path).get(hash)
    if entry is None:
        return {"error": f"Entry {hash!r} not found"}
    return {"hash": hash, **entry}


def create_entry(path: str, ref: list[str], record: str) -> dict:
    """Create an entry. ref=["__self__"] for atoms. Validates well-formedness after creation."""
    store = get_store(path)
    try:
        hash_id, entry = store.create_entry(ref=ref, record=record)
    except ValueError as e:
        return {"error": str(e)}
    try:
        validate_store(store.data)
    except ValueError as e:
        store.delete(hash_id)
        return {"error": f"Well-formedness violation: {e}"}
    return {"hash": hash_id, "entry": entry}


def update_entry(path: str, hash: str, new_record: str) -> dict:
    """Update an entry's record. Triggers hash propagation to all referencing entries."""
    store = get_store(path)
    result = store.update_record(hash, new_record)
    if result is None:
        return {"error": f"Entry {hash!r} not found"}
    new_hash, entry = result
    return {"old_hash": hash, "new_hash": new_hash, "entry": entry}


def delete_entry(path: str, hash: str) -> dict:
    """Delete an entry. Cascades to all degree-1+ entries that reference it."""
    store = get_store(path)
    if store.get(hash) is None:
        return {"error": f"Entry {hash!r} not found"}
    store.delete_cascade(hash)
    return {"deleted": hash}


def do_validate_store(path: str) -> dict:
    """Check all 5 well-formedness conditions. Returns valid + entry_count, or error."""
    store = get_store(path)
    try:
        validate_store(store.data)
        return {"valid": True, "entry_count": len(store.data)}
    except ValueError as e:
        return {"valid": False, "error": str(e)}


def get_stages(path: str) -> dict:
    """Stage decomposition: atoms=0, edges=1+, cyclic=-1."""
    return get_store(path).stages()


def get_ref_graph(path: str) -> dict:
    """Full reference graph as {nodes: [...], links: [...]}."""
    return get_store(path).to_ref_graph()


def search_entries(path: str, keyword: str) -> dict:
    """Search entries by keyword in title/notes/content fields (case-insensitive)."""
    entries = get_store(path).all_entries()
    kw = keyword.lower()
    results = []
    for h, e in entries.items():
        try:
            rec = json.loads(e["record"])
        except (json.JSONDecodeError, TypeError):
            continue
        searchable = " ".join(
            str(rec.get(f, "")) for f in ("title", "notes", "content")
        ).lower()
        if kw in searchable:
            results.append({
                "hash": h,
                "title": rec.get("title", ""),
                "sort": rec.get("sort", ""),
                "source": rec.get("source", ""),
            })
    return {"results": results, "count": len(results), "keyword": keyword}


def register_core_tools(mcp):
    """Register all Core tools on the given FastMCP instance."""

    # Use a wrapper name that won't shadow the module-level store_summary function
    _ss = store_summary  # capture reference before local scope
    @mcp.tool(name="store_summary")
    def _store_summary_tool(path: str) -> str:
        """One-shot store summary: total, atoms, edges, tex/lean/bib, proven/sorry/no_state."""
        return json.dumps(_ss(path), ensure_ascii=False)

    @mcp.tool()
    def query(path: str, sort: str = "", source: str = "",
              degree: int | None = None, include_records: bool = False) -> str:
        """Query entries with optional filters. Returns count + hashes by default, full records if include_records=True."""
        return json.dumps(query_entries(path, sort, source, degree, include_records), ensure_ascii=False)

    @mcp.tool()
    def get(path: str, hash: str) -> str:
        """Get a single entry by its 12-char hex hash."""
        return json.dumps(get_entry(path, hash), ensure_ascii=False)

    @mcp.tool()
    def create(path: str, ref: list[str], record: str) -> str:
        """Create a new entry. Use ref=["__self__"] for atoms. Record is a JSON string."""
        return json.dumps(create_entry(path, ref, record), ensure_ascii=False)

    @mcp.tool()
    def update(path: str, hash: str, new_record: str) -> str:
        """Update an entry's record. Triggers hash propagation to referencing entries."""
        return json.dumps(update_entry(path, hash, new_record), ensure_ascii=False)

    @mcp.tool()
    def delete(path: str, hash: str) -> str:
        """Delete an entry. Cascades to all entries that reference it."""
        return json.dumps(delete_entry(path, hash), ensure_ascii=False)

    @mcp.tool()
    def validate(path: str) -> str:
        """Check store well-formedness (5 conditions). Returns valid status or error details."""
        return json.dumps(do_validate_store(path), ensure_ascii=False)

    @mcp.tool()
    def stages(path: str) -> str:
        """Stage decomposition: {hash: stage_number}. Atoms=0, cyclic=-1."""
        return json.dumps(get_stages(path), ensure_ascii=False)

    @mcp.tool()
    def ref_graph(path: str) -> str:
        """Full reference graph as nodes and links."""
        return json.dumps(get_ref_graph(path), ensure_ascii=False)

    @mcp.tool()
    def search(path: str, keyword: str) -> str:
        """Search entries by keyword in title/notes/content fields (case-insensitive). Pass the project root directory."""
        return json.dumps(search_entries(path, keyword), ensure_ascii=False)
