"""
Knowledge Graph Storage

Independent storage for user-created knowledge nodes and edges.
Stored in .netmath/knowledge.json, separate from meta.json.

Node IDs: {hex12}  (e.g. 79c3794ef407)
Edge IDs: {hex12}  (e.g. a1b2c3d4e5f6)
"""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


VALID_STATUSES = {"stated", "proven", "wip", "review", "open"}
VALID_RELATIONS = {"proves", "uses", "generalizes", "specializes", "motivates", "contradicts", "related"}


class KnowledgeStorage:
    """Knowledge graph storage manager"""

    def __init__(self, project_path: Path):
        self._project_path = project_path
        self._knowledge_path = project_path / ".netmath" / "knowledge.json"
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
        """Load knowledge.json"""
        if self._knowledge_path.exists():
            try:
                data = json.loads(self._knowledge_path.read_text(encoding="utf-8"))
                # Ensure edges is a dict (may be [] from older formats)
                if isinstance(data.get("edges"), list):
                    data["edges"] = {}
                if isinstance(data.get("nodes"), list):
                    data["nodes"] = {}
                # Strip frontend-only / deprecated fields
                for node in data.get("nodes", {}).values():
                    for f in ("style", "confidence", "tags", "scope", "source"):
                        node.pop(f, None)
                return data
            except (json.JSONDecodeError, IOError):
                pass
        return {"nodes": {}, "edges": {}}

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
        kind: str = "theorem",
        status: str = "stated",
        statement: str = "",
        proof: str = "",
        intuition: str = "",
        notes: str = "",
        position: dict = None,
        node_id: str = None,
    ) -> dict:
        """Create a knowledge node."""
        if not name:
            raise ValueError("name is required")
        if not kind or not kind.strip():
            raise ValueError("kind is required")
        if status not in VALID_STATUSES:
            raise ValueError(f"Invalid status: {status}. Must be one of: {', '.join(sorted(VALID_STATUSES))}")

        nid = node_id or uuid.uuid4().hex[:12]
        now = self._now()

        node = {
            "id": nid,
            "name": name,
            "kind": kind,
            "status": status,
            "statement": statement,
            "proof": proof,
            "intuition": intuition,
            "notes": notes,
            "position": position or {"x": 0, "y": 0, "z": 0},
            "created_at": now,
            "updated_at": now,
        }

        self._data["nodes"][nid] = node
        self._save()
        return node

    def get_node(self, node_id: str) -> Optional[dict]:
        """Get a knowledge node by ID."""
        self._check_reload()
        return self._data["nodes"].get(node_id)

    def get_all_nodes(self) -> list[dict]:
        """Get all knowledge nodes."""
        self._check_reload()
        return list(self._data["nodes"].values())

    def update_node(self, node_id: str, **kwargs) -> Optional[dict]:
        """Update a knowledge node. Returns updated node or None if not found."""
        node = self._data["nodes"].get(node_id)
        if not node:
            return None

        # Validate kind/status if provided
        if "kind" in kwargs and kwargs["kind"] is not None:
            if not kwargs["kind"].strip():
                raise ValueError("kind cannot be empty")
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
        """Delete a knowledge node. Also cascade-deletes connected edges."""
        if node_id not in self._data["nodes"]:
            return False

        del self._data["nodes"][node_id]

        # Cascade delete connected edges
        edges_to_delete = [
            eid for eid, e in self._data["edges"].items()
            if e.get("source") == node_id or e.get("target") == node_id
        ]
        for eid in edges_to_delete:
            del self._data["edges"][eid]

        self._save()
        return True

    # =========================================
    # Edge CRUD
    # =========================================

    def create_edge(
        self,
        source: str,
        target: str,
        relation: str = "related",
        strict: bool = True,
        label: str = "",
        notes: str = "",
        edge_id: str = None,
    ) -> dict:
        """Create a knowledge edge."""
        if source not in self._data["nodes"]:
            raise ValueError(f"Source node not found: {source}")
        if target not in self._data["nodes"]:
            raise ValueError(f"Target node not found: {target}")
        if source == target:
            raise ValueError("Cannot create self-loop")
        if relation not in VALID_RELATIONS:
            raise ValueError(f"Invalid relation: {relation}. Must be one of: {', '.join(sorted(VALID_RELATIONS))}")

        eid = edge_id or uuid.uuid4().hex[:12]

        edge = {
            "id": eid,
            "source": source,
            "target": target,
            "relation": relation,
            "strict": strict,
            "label": label,
            "notes": notes,
        }

        self._data["edges"][eid] = edge
        self._save()
        return edge

    def get_edge(self, edge_id: str) -> Optional[dict]:
        """Get a knowledge edge by ID."""
        return self._data["edges"].get(edge_id)

    def get_all_edges(self) -> list[dict]:
        """Get all knowledge edges."""
        self._check_reload()
        return list(self._data["edges"].values())

    def update_edge(self, edge_id: str, **kwargs) -> Optional[dict]:
        """Update a knowledge edge. Returns updated edge or None if not found."""
        edge = self._data["edges"].get(edge_id)
        if not edge:
            return None

        if "relation" in kwargs and kwargs["relation"] is not None:
            if kwargs["relation"] not in VALID_RELATIONS:
                raise ValueError(f"Invalid relation: {kwargs['relation']}")

        for key, value in kwargs.items():
            if value is not None and key in edge and key not in ("id", "source", "target"):
                edge[key] = value

        self._save()
        return edge

    def delete_edge(self, edge_id: str) -> bool:
        """Delete a knowledge edge."""
        if edge_id not in self._data["edges"]:
            return False
        del self._data["edges"][edge_id]
        self._save()
        return True

    # =========================================
    # Bulk operations
    # =========================================

    def get_graph(self) -> dict:
        """Get the full knowledge graph (all nodes and edges)."""
        return {
            "nodes": self.get_all_nodes(),
            "edges": self.get_all_edges(),
        }
