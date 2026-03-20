"""
Signature Storage — persistence for h : O + M → Hex₁₂

Stores the astrolabe signature (O, M, h) in .astrolabe/signature.json.

Obj IDs: {hex12}  (e.g. 79c3794ef407)
Mor IDs: {hex12}  (e.g. a1b2c3d4e5f6)
"""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


VALID_STATUSES = {"stated", "proven", "wip", "review", "open"}
_VALID_MOR_FIELDS = {"id", "source", "target", "strict", "label", "notes", "sort"}


class SignatureStorage:
    """Signature storage manager — reads and writes (O, M, h)."""

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
        Old schema: { "nodes": { id: { "kind": ..., ... } }, "edges": { id: { "relation": ..., ... } } }
        New schema: { "obj": { id: { "sort": ..., ... } }, "mor": { id: { ... } } }
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
        """Migrate old nodes/edges/kind/relation schema to obj/mor/sort."""
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
            # Strip frontend-only / deprecated fields
            for f in ("style", "confidence", "tags", "scope", "source"):
                o.pop(f, None)

        # Migrate old relation → sort (relation is the legacy name for sort)
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

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    # =========================================
    # Obj CRUD
    # =========================================

    def create_obj(
        self,
        name: str,
        sort: str = "theorem",
        status: str = "stated",
        statement: str = "",
        proof: str = "",
        intuition: str = "",
        notes: str = "",
        position: dict = None,
        obj_id: str = None,
        metadata: dict = None,
        # Legacy parameter names
        kind: str = None,
        node_id: str = None,
    ) -> dict:
        """Create an object in the signature."""
        # Accept legacy 'kind' parameter
        if kind is not None and sort == "theorem":
            sort = kind
        # Accept legacy 'node_id' parameter
        if node_id is not None and obj_id is None:
            obj_id = node_id
        if not name:
            raise ValueError("name is required")
        if not sort or not sort.strip():
            raise ValueError("sort is required")
        if status not in VALID_STATUSES:
            raise ValueError(f"Invalid status: {status}. Must be one of: {', '.join(sorted(VALID_STATUSES))}")

        oid = obj_id or uuid.uuid4().hex[:12]
        now = self._now()

        obj = {
            "id": oid,
            "name": name,
            "sort": sort,
            "status": status,
            "statement": statement,
            "proof": proof,
            "intuition": intuition,
            "notes": notes,
            "position": position or {"x": 0, "y": 0, "z": 0},
            "created_at": now,
            "updated_at": now,
        }
        if metadata:
            obj["metadata"] = metadata

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
        """Update an object. Returns updated obj or None if not found."""
        obj = self._data["obj"].get(obj_id)
        if not obj:
            return None

        # Accept legacy 'kind' as 'sort'
        if "kind" in kwargs:
            kwargs["sort"] = kwargs.pop("kind")

        # Validate sort/status if provided
        if "sort" in kwargs and kwargs["sort"] is not None:
            if not kwargs["sort"].strip():
                raise ValueError("sort cannot be empty")
        if "status" in kwargs and kwargs["status"] is not None:
            if kwargs["status"] not in VALID_STATUSES:
                raise ValueError(f"Invalid status: {kwargs['status']}")
        # Handle metadata merge separately
        if "metadata" in kwargs and kwargs["metadata"] is not None:
            existing = obj.get("metadata", {})
            existing.update(kwargs.pop("metadata"))
            obj["metadata"] = existing

        _forbidden = {"style", "confidence", "tags", "scope", "source"}
        for key, value in kwargs.items():
            if value is not None and key in obj and key not in _forbidden:
                if key == "position":
                    obj["position"].update(value)
                else:
                    obj[key] = value

        obj["updated_at"] = self._now()
        self._save()
        return obj

    def delete_obj(self, obj_id: str) -> bool:
        """Delete an object. Also cascade-deletes connected morphisms."""
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
    # Mor CRUD
    # =========================================

    def create_mor(
        self,
        source: str,
        target: str,
        strict: bool = True,
        label: str = "",
        notes: str = "",
        mor_id: str = None,
        sort: str = None,
        metadata: dict = None,
        # Legacy parameter names
        relation: str = None,
        edge_id: str = None,
    ) -> dict:
        """Create a morphism. Optional sort for classifying relationship type."""
        if source not in self._data["obj"]:
            raise ValueError(f"Source obj not found: {source}")
        if target not in self._data["obj"]:
            raise ValueError(f"Target obj not found: {target}")
        if source == target:
            raise ValueError("Cannot create self-loop")

        # Accept legacy parameters
        if relation and not sort:
            sort = relation
        if edge_id is not None and mor_id is None:
            mor_id = edge_id

        mid = mor_id or uuid.uuid4().hex[:12]

        mor = {
            "id": mid,
            "source": source,
            "target": target,
            "strict": strict,
            "label": label,
            "notes": notes,
        }
        if sort:
            mor["sort"] = sort
        if metadata:
            mor["metadata"] = metadata

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
        """Update a morphism. Returns updated mor or None if not found."""
        mor = self._data["mor"].get(mor_id)
        if not mor:
            return None

        # Accept legacy 'relation' as 'sort'
        if "relation" in kwargs:
            if "sort" not in kwargs:
                kwargs["sort"] = kwargs.pop("relation")
            else:
                kwargs.pop("relation")

        # Handle metadata merge separately
        if "metadata" in kwargs and kwargs["metadata"] is not None:
            existing = mor.get("metadata", {})
            existing.update(kwargs.pop("metadata"))
            mor["metadata"] = existing

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

    # =========================================
    # Backward compatibility aliases
    # =========================================

    def create_node(self, *args, **kwargs):
        return self.create_obj(*args, **kwargs)

    def get_node(self, node_id, *args, **kwargs):
        return self.get_obj(node_id, *args, **kwargs)

    def get_all_nodes(self):
        return self.get_all_objs()

    def update_node(self, node_id, **kwargs):
        return self.update_obj(node_id, **kwargs)

    def delete_node(self, node_id):
        return self.delete_obj(node_id)

    def create_edge(self, *args, **kwargs):
        return self.create_mor(*args, **kwargs)

    def get_edge(self, edge_id, *args, **kwargs):
        return self.get_mor(edge_id, *args, **kwargs)

    def get_all_edges(self):
        return self.get_all_mors()

    def update_edge(self, edge_id, **kwargs):
        return self.update_mor(edge_id, **kwargs)

    def delete_edge(self, edge_id):
        return self.delete_mor(edge_id)


# Backward compatibility alias
KnowledgeStorage = SignatureStorage
