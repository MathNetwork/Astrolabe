"""
Signature Storage — persistence for h : O + M → Hex₁₂

Stores the astrolabe signature (O, M, h) in .astrolabe/signature.json.
Field-agnostic: does not assume what keys exist inside obj/mor info records.
Field semantics are defined by functors (math_domain, timestamp, etc.).

Obj IDs: {hex12}  (e.g. 79c3794ef407)
Mor IDs: {hex12}  (e.g. a1b2c3d4e5f6)
"""

import json
import uuid
from pathlib import Path
from typing import Optional


class SignatureStorage:
    """Signature storage manager — reads and writes (O, M, h).

    Field-agnostic: obj and mor are open info records.
    Only structural invariants are enforced:
    - Every obj/mor has an "id"
    - Every mor has "source" and "target" referencing existing obj ids
    """

    def __init__(self, project_path: Path):
        self._project_path = project_path
        self._signature_path = project_path / ".astrolabe" / "signature.json"
        self._legacy_path = project_path / ".astrolabe" / "knowledge.json"
        self._data = self._load()
        self._last_mtime = self._get_mtime()

    def _get_mtime(self) -> float:
        """Get file modification time."""
        try:
            return self._signature_path.stat().st_mtime
        except OSError:
            return 0.0

    def _check_reload(self):
        """Reload from disk if file was modified externally."""
        mtime = self._get_mtime()
        if mtime > self._last_mtime:
            self._data = self._load()
            self._last_mtime = mtime

    def _load(self) -> dict:
        """Load signature.json, migrating old schema if needed.

        File migration: knowledge.json → signature.json (renamed)
        Old schema: { "nodes": { ... }, "edges": { ... } }
        New schema: { "obj": { ... }, "mor": { ... } }
        """
        # File-level migration: rename knowledge.json → signature.json
        if not self._signature_path.exists() and self._legacy_path.exists():
            self._legacy_path.rename(self._signature_path)
        if self._signature_path.exists():
            try:
                data = json.loads(self._signature_path.read_text(encoding="utf-8"))
                data = self._migrate_schema(data)
                return data
            except (json.JSONDecodeError, IOError):
                pass
        return {"obj": {}, "mor": {}}

    @staticmethod
    def _migrate_schema(data: dict) -> dict:
        """Migrate old schema keys for backward compatibility."""
        # Migrate top-level keys: nodes → obj, edges → mor
        if "nodes" in data and "obj" not in data:
            data["obj"] = data.pop("nodes")
        if "edges" in data and "mor" not in data:
            data["mor"] = data.pop("edges")

        # Ensure obj/mor are dicts (may be [] from older formats)
        if isinstance(data.get("obj"), list):
            data["obj"] = {}
        if isinstance(data.get("mor"), list):
            data["mor"] = {}

        obj = data.get("obj", {})
        mor = data.get("mor", {})

        # Migrate obj fields: kind → sort
        for o in obj.values():
            if "kind" in o and "sort" not in o:
                o["sort"] = o.pop("kind")

        # Migrate mor fields: relation → sort
        for m in mor.values():
            old_rel = m.pop("relation", None)
            if old_rel and "sort" not in m:
                m["sort"] = old_rel

        data["obj"] = obj
        data["mor"] = mor
        return data

    def _save(self):
        """Save signature.json"""
        self._signature_path.parent.mkdir(parents=True, exist_ok=True)
        self._signature_path.write_text(
            json.dumps(self._data, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        self._last_mtime = self._get_mtime()

    # =========================================
    # Obj CRUD — field-agnostic
    # =========================================

    def create_obj(self, obj_id: str = None, **info) -> dict:
        """Create an object. Generates h (hex₁₂ id), stores info record as-is.

        Returns the full obj dict with "id" set.
        """
        oid = obj_id or uuid.uuid4().hex[:12]
        obj = {"id": oid, **info}
        self._data["obj"][oid] = obj
        self._save()
        return obj

    def get_obj(self, obj_id: str) -> Optional[dict]:
        """Get an object by ID."""
        self._check_reload()
        return self._data["obj"].get(obj_id)

    def get_all_objs(self) -> list[dict]:
        """Get all objects."""
        self._check_reload()
        return list(self._data["obj"].values())

    def update_obj(self, obj_id: str, **kwargs) -> Optional[dict]:
        """Update an object. Merges kwargs into the info record.

        Cannot change "id". Returns updated obj or None if not found.
        """
        obj = self._data["obj"].get(obj_id)
        if not obj:
            return None

        for key, value in kwargs.items():
            if key == "id":
                continue  # id is immutable
            if value is not None:
                obj[key] = value

        self._save()
        return obj

    def delete_obj(self, obj_id: str) -> bool:
        """Delete an object. Cascade-deletes connected morphisms."""
        if obj_id not in self._data["obj"]:
            return False

        del self._data["obj"][obj_id]

        # Cascade delete connected morphisms
        mors_to_delete = [
            mid for mid, m in self._data["mor"].items()
            if m.get("source") == obj_id or m.get("target") == obj_id
        ]
        for mid in mors_to_delete:
            del self._data["mor"][mid]

        self._save()
        return True

    # =========================================
    # Mor CRUD — field-agnostic (except source/target)
    # =========================================

    def create_mor(self, source: str, target: str, mor_id: str = None, **info) -> dict:
        """Create a morphism. Requires source and target (structural invariant).

        Returns the full mor dict with "id", "source", "target" set.
        """
        if source not in self._data["obj"]:
            raise ValueError(f"Source obj not found: {source}")
        if target not in self._data["obj"]:
            raise ValueError(f"Target obj not found: {target}")

        mid = mor_id or uuid.uuid4().hex[:12]
        mor = {"id": mid, "source": source, "target": target, **info}
        self._data["mor"][mid] = mor
        self._save()
        return mor

    def get_mor(self, mor_id: str) -> Optional[dict]:
        """Get a morphism by ID."""
        return self._data["mor"].get(mor_id)

    def get_all_mors(self) -> list[dict]:
        """Get all morphisms."""
        self._check_reload()
        return list(self._data["mor"].values())

    def update_mor(self, mor_id: str, **kwargs) -> Optional[dict]:
        """Update a morphism. Merges kwargs into the info record.

        Cannot change "id", "source", or "target". Returns updated mor or None.
        """
        mor = self._data["mor"].get(mor_id)
        if not mor:
            return None

        immutable = ("id", "source", "target")
        for key, value in kwargs.items():
            if key in immutable:
                continue
            if value is not None:
                mor[key] = value

        self._save()
        return mor

    def delete_mor(self, mor_id: str) -> bool:
        """Delete a morphism."""
        if mor_id not in self._data["mor"]:
            return False
        del self._data["mor"][mor_id]
        self._save()
        return True

    # =========================================
    # Bulk operations
    # =========================================

    def get_graph(self) -> dict:
        """Get the full signature (all objects and morphisms)."""
        return {
            "obj": self.get_all_objs(),
            "mor": self.get_all_mors(),
        }

