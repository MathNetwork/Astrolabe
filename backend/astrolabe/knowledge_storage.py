"""
Knowledge Graph Storage

Independent storage for user-created knowledge nodes and edges.
Stored in .astrolabe/knowledge.json, separate from meta.json.

Node IDs: {hex12}  (e.g. 79c3794ef407)
Edge IDs: {hex12}  (e.g. a1b2c3d4e5f6)
"""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


VALID_STATUSES = {"stated", "proven", "wip", "review", "open"}
_VALID_MORPHISM_EDGE_FIELDS = {"id", "source", "target", "strict", "label", "notes", "sort"}


class KnowledgeStorage:
    """Knowledge graph storage manager"""

    def __init__(self, project_path: Path):
        self._project_path = project_path
        self._knowledge_path = project_path / ".astrolabe" / "knowledge.json"
        self._data = self._load()
        self._last_mtime = self._get_mtime()

    def _get_mtime(self) -> float:
        """Get file modification time."""
        try:
            return self._knowledge_path.stat().st_mtime
        except OSError:
            return 0.0

    def _check_reload(self):
        """Reload from disk if file was modified externally."""
        mtime = self._get_mtime()
        if mtime > self._last_mtime:
            self._data = self._load()
            self._last_mtime = mtime

    def _load(self) -> dict:
        """Load knowledge.json, migrating old schema if needed.

        Old schema: { "nodes": { id: { "kind": ..., ... } }, "edges": { id: { "relation": ..., ... } } }
        New schema: { "obj": { id: { "sort": ..., ... } }, "mor": { id: { ... } } }
        Morphisms have no sort field — meaning is expressed through notes.
        """
        if self._knowledge_path.exists():
            try:
                data = json.loads(self._knowledge_path.read_text(encoding="utf-8"))
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

        # Migrate node fields: kind → sort
        for node in obj.values():
            if "kind" in node and "sort" not in node:
                node["sort"] = node.pop("kind")
            # Strip frontend-only / deprecated fields
            for f in ("style", "confidence", "tags", "scope", "source"):
                node.pop(f, None)

        # Migrate old relation → sort (relation is the legacy name for sort)
        for edge in mor.values():
            old_rel = edge.pop("relation", None)
            if old_rel and "sort" not in edge:
                edge["sort"] = old_rel

        data["obj"] = obj
        data["mor"] = mor
        return data

    def _save(self):
        """Save knowledge.json"""
        self._knowledge_path.parent.mkdir(parents=True, exist_ok=True)
        self._knowledge_path.write_text(
            json.dumps(self._data, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        self._last_mtime = self._get_mtime()

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    # =========================================
    # Node CRUD
    # =========================================

    def create_node(
        self,
        name: str,
        sort: str = "theorem",
        status: str = "stated",
        statement: str = "",
        proof: str = "",
        intuition: str = "",
        notes: str = "",
        position: dict = None,
        node_id: str = None,
        # Legacy parameter name
        kind: str = None,
    ) -> dict:
        """Create a knowledge node (object in the category)."""
        # Accept legacy 'kind' parameter
        if kind is not None and sort == "theorem":
            sort = kind
        if not name:
            raise ValueError("name is required")
        if not sort or not sort.strip():
            raise ValueError("sort is required")
        if status not in VALID_STATUSES:
            raise ValueError(f"Invalid status: {status}. Must be one of: {', '.join(sorted(VALID_STATUSES))}")

        nid = node_id or uuid.uuid4().hex[:12]
        now = self._now()

        node = {
            "id": nid,
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

        self._data["obj"][nid] = node
        self._save()
        return node

    def get_node(self, node_id: str) -> Optional[dict]:
        """Get a knowledge node (object) by ID."""
        self._check_reload()
        return self._data["obj"].get(node_id)

    def get_all_nodes(self) -> list[dict]:
        """Get all knowledge nodes (objects)."""
        self._check_reload()
        return list(self._data["obj"].values())

    def update_node(self, node_id: str, **kwargs) -> Optional[dict]:
        """Update a knowledge node (object). Returns updated node or None if not found."""
        node = self._data["obj"].get(node_id)
        if not node:
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
        _forbidden = {"style", "confidence", "tags", "scope", "source"}
        for key, value in kwargs.items():
            if value is not None and key in node and key not in _forbidden:
                if key == "position":
                    node["position"].update(value)
                else:
                    node[key] = value

        node["updated_at"] = self._now()
        self._save()
        return node

    def delete_node(self, node_id: str) -> bool:
        """Delete a knowledge node (object). Also cascade-deletes connected morphisms."""
        if node_id not in self._data["obj"]:
            return False

        del self._data["obj"][node_id]

        # Cascade delete connected morphisms
        mors_to_delete = [
            eid for eid, e in self._data["mor"].items()
            if e.get("source") == node_id or e.get("target") == node_id
        ]
        for eid in mors_to_delete:
            del self._data["mor"][eid]

        self._save()
        return True

    # =========================================
    # Edge CRUD
    # =========================================

    def create_edge(
        self,
        source: str,
        target: str,
        strict: bool = True,
        label: str = "",
        notes: str = "",
        edge_id: str = None,
        sort: str = None,
        # Legacy parameter
        relation: str = None,
    ) -> dict:
        """Create a knowledge edge (morphism). Optional sort for classifying relationship type."""
        if source not in self._data["obj"]:
            raise ValueError(f"Source node not found: {source}")
        if target not in self._data["obj"]:
            raise ValueError(f"Target node not found: {target}")
        if source == target:
            raise ValueError("Cannot create self-loop")

        # Accept legacy 'relation' as 'sort'
        if relation and not sort:
            sort = relation

        eid = edge_id or uuid.uuid4().hex[:12]

        edge = {
            "id": eid,
            "source": source,
            "target": target,
            "strict": strict,
            "label": label,
            "notes": notes,
        }
        if sort:
            edge["sort"] = sort

        self._data["mor"][eid] = edge
        self._save()
        return edge

    def get_edge(self, edge_id: str) -> Optional[dict]:
        """Get a knowledge edge (morphism) by ID."""
        return self._data["mor"].get(edge_id)

    def get_all_edges(self) -> list[dict]:
        """Get all knowledge edges (morphisms)."""
        self._check_reload()
        return list(self._data["mor"].values())

    def update_edge(self, edge_id: str, **kwargs) -> Optional[dict]:
        """Update a knowledge edge (morphism). Returns updated edge or None if not found."""
        edge = self._data["mor"].get(edge_id)
        if not edge:
            return None

        # Accept legacy 'relation' as 'sort'
        if "relation" in kwargs:
            if "sort" not in kwargs:
                kwargs["sort"] = kwargs.pop("relation")
            else:
                kwargs.pop("relation")

        immutable = ("id", "source", "target")
        for key, value in kwargs.items():
            if key in immutable:
                continue
            if value is not None:
                edge[key] = value

        self._save()
        return edge

    def delete_edge(self, edge_id: str) -> bool:
        """Delete a knowledge edge (morphism)."""
        if edge_id not in self._data["mor"]:
            return False
        del self._data["mor"][edge_id]
        self._save()
        return True

    # =========================================
    # Bulk operations
    # =========================================

    def get_graph(self) -> dict:
        """Get the full knowledge graph (all objects and morphisms)."""
        return {
            "obj": self.get_all_nodes(),
            "mor": self.get_all_edges(),
        }
