"""
AstrolabeStorage — persistence for astrolabe.json.

Format: { "<hash>": { "ref": [str, ...], "record": { ... } }, ... }
"""
import json
import uuid
from pathlib import Path
from typing import Optional


class AstrolabeStorage:
    """Read/write astrolabe.json entries."""

    def __init__(self, project_dir: str):
        self.path = Path(project_dir) / ".astrolabe" / "astrolabe.json"
        self.data: dict = {}
        self._load()

    def _load(self):
        if self.path.exists():
            self.data = json.loads(self.path.read_text(encoding="utf-8"))

    def _save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            json.dumps(self.data, indent=2, ensure_ascii=False), encoding="utf-8"
        )

    # ── CRUD ──

    def get(self, hash_id: str) -> Optional[dict]:
        return self.data.get(hash_id)

    def put(self, hash_id: str, ref: list[str], record: dict):
        self.data[hash_id] = {"ref": ref, "record": record}
        self._save()

    def delete(self, hash_id: str):
        self.data.pop(hash_id, None)
        self._save()

    def all_entries(self) -> dict:
        return self.data

    # ── Degree / filtering ──

    def degree(self, hash_id: str) -> int:
        """k = |ref| - 1"""
        return len(self.data[hash_id]["ref"]) - 1

    def atoms(self) -> dict:
        """|ref| = 1"""
        return {h: e for h, e in self.data.items() if len(e["ref"]) == 1}

    def k_forms(self, k: int) -> dict:
        """A_k: entries with |ref| = k + 1"""
        return {h: e for h, e in self.data.items() if len(e["ref"]) == k + 1}

    # ── Stage decomposition (Definition 2.15) ──

    def stages(self) -> dict[str, int]:
        """Compute stage for every entry. Cyclic entries get stage -1."""
        result: dict[str, int] = {}

        # S_0 = atoms
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

        # Unreached entries are cyclic
        for h in self.data:
            if h not in result:
                result[h] = -1

        return result

    def vertex_pool(self, m: int) -> set[str]:
        """H_m = hashes of entries with stage <= m."""
        st = self.stages()
        return {h for h, s in st.items() if 0 <= s <= m}

    def stage_layer(self, m: int) -> dict:
        """Entries with stage == m."""
        st = self.stages()
        return {h: self.data[h] for h, s in st.items() if s == m}

    # ── Profile (Definition 2.16) ──

    def profile(self, hash_id: str) -> dict[str, int]:
        """Multiplicity profile: μ(σ)(h) = count of h in ref(σ)."""
        ref = self.data[hash_id]["ref"]
        counts: dict[str, int] = {}
        for h in ref:
            counts[h] = counts.get(h, 0) + 1
        return counts

    # ── Convenience CRUD ──

    def create_entry(self, ref: list[str], record: dict, hash_id: str = None) -> tuple[str, dict]:
        """创建 entry。验证规则：
        1. ref 不能为空
        2. atom：调用方传 ref=["__self__"] 或 ref=[hash_id]，实际存为 ref=[hid]
        3. 非 atom：ref 中每个 hash 必须已存在于 self.data
        """
        if not ref:
            raise ValueError("ref must not be empty")
        hid = hash_id or uuid.uuid4().hex[:12]
        # __self__ 只允许 ref == ["__self__"]，其他位置出现一律拒绝
        if "__self__" in ref:
            if ref != ["__self__"]:
                raise ValueError("__self__ is only valid as ref=[\"__self__\"]")
            ref = [hid]
        elif len(ref) == 1 and ref[0] == hid:
            pass  # 调用方显式传了 ref=[hash_id]，也是 atom
        else:
            for r in ref:
                if r not in self.data:
                    raise ValueError(f"Referenced entry not found: {r}")
        self.put(hid, ref=ref, record=record)
        return hid, self.get(hid)

    def update_record(self, hash_id: str, updates: dict) -> dict | None:
        """合并更新 entry 的 record 字段。不存在返回 None。"""
        entry = self.get(hash_id)
        if entry is None:
            return None
        merged = {**entry["record"], **updates}
        self.put(hash_id, ref=entry["ref"], record=merged)
        return self.get(hash_id)

    def delete_cascade(self, hash_id: str):
        """删除 entry。如果是 atom（ref 长度为 1），级联删除所有引用它的 edge。"""
        entry = self.get(hash_id)
        if entry is None:
            return
        if len(entry["ref"]) == 1:
            # 收集引用该 atom 的 entry
            to_remove = [h for h, e in self.data.items()
                         if h != hash_id and hash_id in e["ref"]]
            for h in to_remove:
                self.delete(h)
        self.delete(hash_id)

    # ── 1-skeleton (graph compatibility) ──

    def to_graph(self) -> tuple[list[dict], list[dict]]:
        """Extract 1-skeleton: atoms as nodes, 1-simplices as edges."""
        nodes = []
        edges = []
        for h, e in self.data.items():
            if len(e["ref"]) == 1:
                nodes.append({"id": h, **e["record"]})
            elif len(e["ref"]) == 2:
                edges.append({
                    "id": h,
                    "source": e["ref"][0],
                    "target": e["ref"][1],
                    **e["record"],
                })
        return nodes, edges

    # ── Reference View (all entries as nodes, ref as links) ──

    def to_ref_graph(self) -> dict:
        """Reference View: every entry is a node, every ref is a directed link."""
        stages = self.stages()
        nodes = []
        links = []
        for h, e in self.data.items():
            nodes.append({
                "id": h,
                "degree": len(e["ref"]) - 1,
                "stage": stages.get(h, -1),
                **e["record"],
            })
            # Non-atom refs become links (atoms have ref=[self], skip self-loop)
            if len(e["ref"]) > 1:
                for i, target in enumerate(e["ref"]):
                    links.append({
                        "source": h,
                        "target": target,
                        "position": i,
                    })
        return {"nodes": nodes, "links": links}
