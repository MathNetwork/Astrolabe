"""
AstrolabeStorage — persistence for astrolabe.json.

Format: { "<hash>": { "ref": [str, ...], "record": "<string>" }, ... }
Record is an opaque string — the core layer does not interpret its content.
"""
import hashlib
import json
from pathlib import Path


class AstrolabeStorage:
    """Read/write astrolabe.json entries."""

    def __init__(self, project_dir: str):
        self.path = Path(project_dir) / ".astrolabe" / "astrolabe.json"
        self.data: dict = {}
        self._load()
        self._last_mtime = self._get_mtime()

    def _get_mtime(self) -> float:
        try:
            return self.path.stat().st_mtime
        except OSError:
            return 0.0

    def _check_reload(self):
        mtime = self._get_mtime()
        if mtime > self._last_mtime:
            self._load()
            self._last_mtime = mtime

    def _load(self):
        if self.path.exists():
            self.data = json.loads(self.path.read_text(encoding="utf-8"))

    def _save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            json.dumps(self.data, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        self._last_mtime = self._get_mtime()

    # ── CRUD ──

    def get(self, hash_id: str) -> dict | None:
        self._check_reload()
        return self.data.get(hash_id)

    def put(self, hash_id: str, ref: list[str], record: str):
        self.data[hash_id] = {"ref": ref, "record": record}
        self._save()

    def delete(self, hash_id: str):
        self.data.pop(hash_id, None)
        self._save()

    def all_entries(self) -> dict:
        self._check_reload()
        return self.data

    # ── Degree / filtering ──

    def degree(self, hash_id: str) -> int:
        return len(self.data[hash_id]["ref"]) - 1

    # ── Stage decomposition ──

    def stages(self) -> dict[str, int]:
        result: dict[str, int] = {}
        for h, e in self.data.items():
            if len(e["ref"]) == 1:
                result[h] = 0

        m = 0
        changed = True
        while changed:
            changed = False
            resolved = set(result.keys())
            for h, e in self.data.items():
                if h not in result and all(r in resolved for r in e["ref"]):
                    result[h] = m + 1
                    changed = True
            m += 1

        for h in self.data:
            if h not in result:
                result[h] = -1
        return result

    # ── Profile ──

    def profile(self, hash_id: str) -> dict[str, int]:
        ref = self.data[hash_id]["ref"]
        counts: dict[str, int] = {}
        for h in ref:
            counts[h] = counts.get(h, 0) + 1
        return counts

    # ── Content-addressable hash (compatible with LeanAstrolabe) ──

    def _compute_hash(self, ref: list[str], record: str) -> str:
        """SHA256(ref₁ || 0x00 || ref₂ || 0x00 || ... || record)[:12 hex]"""
        buf = bytearray()
        for h in ref:
            buf.extend(h.encode("utf-8"))
            buf.append(0x00)
        buf.extend(record.encode("utf-8"))
        return hashlib.sha256(bytes(buf)).hexdigest()[:12]

    # ── Convenience CRUD ──

    def create_entry(self, ref: list[str], record: str, hash_id: str = None) -> tuple[str, dict]:
        if not ref:
            raise ValueError("ref must not be empty")
        if "__self__" in ref:
            if ref != ["__self__"]:
                raise ValueError('__self__ is only valid as ref=["__self__"]')
            hid = hash_id or self._compute_hash(["__self__"], record)
            if hid in self.data:
                return hid, self.get(hid)
            self.put(hid, ref=[hid], record=record)
            return hid, self.get(hid)
        else:
            for r in ref:
                if r not in self.data:
                    raise ValueError(f"Referenced entry not found: {r}")
            hid = hash_id or self._compute_hash(ref, record)
            if hid in self.data:
                return hid, self.get(hid)
            self.put(hid, ref=ref, record=record)
            return hid, self.get(hid)

    def update_record(self, hash_id: str, new_record: str) -> tuple[str, dict] | None:
        entry = self.get(hash_id)
        if entry is None:
            return None

        ref = entry["ref"]
        is_atom = (len(ref) == 1 and ref[0] == hash_id)

        if is_atom:
            new_hash = self._compute_hash(["__self__"], new_record)
        else:
            new_hash = self._compute_hash(ref, new_record)

        if new_hash != hash_id:
            new_ref = [new_hash] if is_atom else ref
            self.put(new_hash, ref=new_ref, record=new_record)
            self.delete(hash_id)
            self._propagate_hash_change(hash_id, new_hash)
        else:
            self.put(hash_id, ref=ref, record=new_record)

        return new_hash, self.get(new_hash)

    def _propagate_hash_change(self, old_hash: str, new_hash: str, _visited: set | None = None, _depth: int = 0):
        if _depth > 50:
            return
        if _visited is None:
            _visited = set()
        if old_hash in _visited:
            return
        _visited.add(old_hash)
        if old_hash == new_hash:
            return

        # Phase 1: ref propagation
        affected = [(h, e) for h, e in list(self.data.items())
                    if old_hash in e["ref"]]
        for h, e in affected:
            new_ref = [new_hash if x == old_hash else x for x in e["ref"]]
            new_h = self._compute_hash(new_ref, e["record"])
            self.put(new_h, ref=new_ref, record=e["record"])
            self.delete(h)
            if new_h != h:
                self._propagate_hash_change(h, new_h, _visited, _depth + 1)

        # Phase 2: record text propagation (entryref and any raw hash mentions)
        text_affected = [(h, e) for h, e in list(self.data.items())
                         if old_hash in e["record"]]
        for h, e in text_affected:
            new_record = e["record"].replace(old_hash, new_hash)
            ref = e["ref"]
            is_atom = (len(ref) == 1 and ref[0] == h)
            if is_atom:
                new_h = self._compute_hash(["__self__"], new_record)
                new_ref = [new_h]
            else:
                new_h = self._compute_hash(ref, new_record)
                new_ref = ref
            self.put(new_h, ref=new_ref, record=new_record)
            self.delete(h)
            if new_h != h:
                self._propagate_hash_change(h, new_h, _visited, _depth + 1)

    def delete_cascade(self, hash_id: str):
        entry = self.get(hash_id)
        if entry is None:
            return
        if len(entry["ref"]) == 1:
            to_remove = [h for h, e in self.data.items()
                         if h != hash_id and hash_id in e["ref"]]
            for h in to_remove:
                self.delete(h)
        self.delete(hash_id)

    # ── Reference View (all entries as nodes, ref as links) ──

    def to_ref_graph(self) -> dict:
        self._check_reload()
        stages = self.stages()
        nodes = []
        links = []
        for h, e in self.data.items():
            nodes.append({
                "id": h,
                "degree": len(e["ref"]) - 1,
                "stage": stages.get(h, -1),
                "record": e["record"],
            })
            if len(e["ref"]) > 1:
                for i, target in enumerate(e["ref"]):
                    links.append({
                        "source": h,
                        "target": target,
                        "position": i,
                    })
        return {"nodes": nodes, "links": links}
