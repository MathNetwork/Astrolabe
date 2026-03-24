"""
AstrolabeStorage — persistence for astrolabe.json.

Format: { "<hash>": { "ref": [str, ...], "record": { ... } }, ... }
"""
import hashlib
import json
from pathlib import Path
from typing import Optional


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
        """Reload from disk if file was modified externally."""
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

    def get(self, hash_id: str) -> Optional[dict]:
        self._check_reload()
        return self.data.get(hash_id)

    def put(self, hash_id: str, ref: list[str], record: dict):
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

    # ── Content-addressable hash ──

    def _compute_hash(self, ref: list[str], record: dict) -> str:
        """Deterministic hash from ref + record content."""
        raw = json.dumps({"ref": ref, "record": record}, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(raw.encode()).hexdigest()[:12]

    # ── Convenience CRUD ──

    def create_entry(self, ref: list[str], record: dict, hash_id: str = None) -> tuple[str, dict]:
        """创建 entry（content-addressable）。验证规则：
        1. ref 不能为空
        2. atom：ref=["__self__"]，hash 由 (["__self__"], record) 计算
        3. 非 atom：ref 中每个 hash 必须已存在于 self.data
        4. 幂等：相同内容返回相同 hash
        """
        if not ref:
            raise ValueError("ref must not be empty")
        # __self__ 只允许 ref == ["__self__"]，其他位置出现一律拒绝
        if "__self__" in ref:
            if ref != ["__self__"]:
                raise ValueError("__self__ is only valid as ref=[\"__self__\"]")
            hid = hash_id or self._compute_hash(["__self__"], record)
            # 幂等
            if hid in self.data:
                return hid, self.get(hid)
            self.put(hid, ref=[hid], record=record)
            return hid, self.get(hid)
        else:
            for r in ref:
                if r not in self.data:
                    raise ValueError(f"Referenced entry not found: {r}")
            hid = hash_id or self._compute_hash(ref, record)
            # 幂等
            if hid in self.data:
                return hid, self.get(hid)
            self.put(hid, ref=ref, record=record)
            return hid, self.get(hid)

    def update_record(self, hash_id: str, updates: dict) -> tuple[str, dict] | None:
        """合并更新 entry 的 record 字段。hash 随内容变化，传播到引用方。"""
        entry = self.get(hash_id)
        if entry is None:
            return None

        new_record = {**entry["record"], **updates}
        ref = entry["ref"]
        is_atom = (len(ref) == 1 and ref[0] == hash_id)

        # 重算 hash（atom 用 __self__ 算，避免循环依赖）
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

    def _propagate_hash_change(self, old_hash: str, new_hash: str):
        """BFS: 找所有 ref 中包含 old_hash 的 entry，替换并重算 hash，递归。"""
        affected = [(h, e) for h, e in list(self.data.items())
                    if old_hash in e["ref"]]
        for h, e in affected:
            new_ref = [new_hash if x == old_hash else x for x in e["ref"]]
            new_h = self._compute_hash(new_ref, e["record"])
            self.put(new_h, ref=new_ref, record=e["record"])
            self.delete(h)
            if new_h != h:
                self._propagate_hash_change(h, new_h)

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
        self._check_reload()
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
        self._check_reload()
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
