"""Tests for ref_index reverse lookup.

TDD: these tests are written BEFORE the implementation.
All should FAIL until referencing() and _ref_index are implemented.
"""
import json
import time
import pytest

from astrolabe.storage import AstrolabeStorage


@pytest.fixture
def store(tmp_path):
    p = tmp_path / ".astrolabe"
    p.mkdir()
    (p / "astrolabe.json").write_text("{}", encoding="utf-8")
    return AstrolabeStorage(str(tmp_path))


class TestRefIndex:
    """反向索引基本功能"""

    def test_referencing_returns_list(self, store):
        """referencing() 方法存在且返回 list"""
        hid, _ = store.create_entry(ref=["__self__"], record="a")
        result = store.referencing(hid)
        assert isinstance(result, list)

    def test_scalar_self_ref_excluded(self, store):
        """scalar 的自引用不应出现在 referencing 结果中"""
        hid, _ = store.create_entry(ref=["__self__"], record="a")
        assert hid not in store.referencing(hid)

    def test_basic_lookup(self, store):
        """创建 edge(a,b)，a 和 b 的 referencing 都应包含 edge"""
        a, _ = store.create_entry(ref=["__self__"], record="a")
        b, _ = store.create_entry(ref=["__self__"], record="b")
        e, _ = store.create_entry(ref=[a, b], record="uses")
        assert e in store.referencing(a)
        assert e in store.referencing(b)

    def test_multiple_references(self, store):
        """一个 vertex 被多个 entry 引用"""
        a, _ = store.create_entry(ref=["__self__"], record="a")
        b, _ = store.create_entry(ref=["__self__"], record="b")
        c, _ = store.create_entry(ref=["__self__"], record="c")
        e1, _ = store.create_entry(ref=[a, b], record="e1")
        e2, _ = store.create_entry(ref=[a, c], record="e2")
        refs_a = store.referencing(a)
        assert e1 in refs_a
        assert e2 in refs_a
        assert len(refs_a) == 2

    def test_unreferenced_returns_empty(self, store):
        """没有被引用的 hash 返回空列表"""
        a, _ = store.create_entry(ref=["__self__"], record="a")
        b, _ = store.create_entry(ref=["__self__"], record="b")
        assert store.referencing(a) == []
        assert store.referencing(b) == []

    def test_nonexistent_hash(self, store):
        """查询不存在的 hash 返回空列表，不报错"""
        assert store.referencing("nonexistent123") == []


class TestRefIndexAfterDelete:
    """删除操作后索引一致性"""

    def test_delete_cleans_index(self, store):
        """删除 edge 后，vertex 的 referencing 应该清空"""
        a, _ = store.create_entry(ref=["__self__"], record="a")
        b, _ = store.create_entry(ref=["__self__"], record="b")
        e, _ = store.create_entry(ref=[a, b], record="uses")
        store.delete(e)
        assert store.referencing(a) == []
        assert store.referencing(b) == []

    def test_delete_partial(self, store):
        """删除一个 edge 不影响同一 vertex 的其他引用"""
        a, _ = store.create_entry(ref=["__self__"], record="a")
        b, _ = store.create_entry(ref=["__self__"], record="b")
        c, _ = store.create_entry(ref=["__self__"], record="c")
        e1, _ = store.create_entry(ref=[a, b], record="e1")
        e2, _ = store.create_entry(ref=[a, c], record="e2")
        store.delete(e1)
        refs_a = store.referencing(a)
        assert e1 not in refs_a
        assert e2 in refs_a


class TestRefIndexAfterUpdate:
    """更新操作后索引一致性"""

    def test_update_propagation_updates_index(self, store):
        """修改 scalar 的 record → hash 变 → edge ref 更新 → 索引跟着更新"""
        a, _ = store.create_entry(ref=["__self__"], record="a")
        b, _ = store.create_entry(ref=["__self__"], record="b")
        e, _ = store.create_entry(ref=[a, b], record="uses")
        old_a_id = a
        old_e_id = e
        # 修改 a → a 的 hash 变 → e 的 ref 也变 → e 的 hash 也变
        new_a_id, _ = store.update_record(old_a_id, "a_updated")
        # 旧 hash 不应有任何引用
        assert store.referencing(old_a_id) == []
        # 新 a 应被新 edge 引用
        new_refs = store.referencing(new_a_id)
        assert len(new_refs) == 1
        # 旧 edge 不应存在了
        assert old_e_id not in store.data


class TestRefIndexMultiLevel:
    """多层级联的索引一致性"""

    def test_three_level_cascade(self, store):
        """a → edge(a,b) → tri(edge, a, c) 三层结构"""
        a, _ = store.create_entry(ref=["__self__"], record="a")
        b, _ = store.create_entry(ref=["__self__"], record="b")
        c, _ = store.create_entry(ref=["__self__"], record="c")
        e, _ = store.create_entry(ref=[a, b], record="edge")
        t, _ = store.create_entry(ref=[e, a, c], record="tri")
        # e 应被 t 引用
        assert t in store.referencing(e)
        # a 应被 e 和 t 引用
        refs_a = store.referencing(a)
        assert e in refs_a
        assert t in refs_a


class TestRefIndexReload:
    """文件重载后索引一致性"""

    def test_reload_rebuilds_index(self, store):
        """新 storage 实例读取同一文件，索引应完整"""
        a, _ = store.create_entry(ref=["__self__"], record="a")
        b, _ = store.create_entry(ref=["__self__"], record="b")
        e, _ = store.create_entry(ref=[a, b], record="uses")
        # 新实例
        store2 = AstrolabeStorage(str(store.path.parent.parent))
        assert e in store2.referencing(a)
        assert e in store2.referencing(b)

    def test_external_modify_rebuilds_index(self, store):
        """外部修改文件后，索引应在下次访问时重建"""
        a, _ = store.create_entry(ref=["__self__"], record="a")
        b, _ = store.create_entry(ref=["__self__"], record="b")
        e, _ = store.create_entry(ref=[a, b], record="uses")
        # 外部清空文件
        time.sleep(0.05)
        store.path.write_text('{"x1": {"ref": ["x1"], "record": "x"}}',
                              encoding="utf-8")
        # 索引应在下次访问时重建
        assert store.referencing(a) == []
        assert store.referencing("x1") == []


class TestRefIndexConsistency:
    """索引与 data 的一致性断言"""

    def test_index_matches_data(self, store):
        """索引内容必须和 data 完全一致"""
        a, _ = store.create_entry(ref=["__self__"], record="a")
        b, _ = store.create_entry(ref=["__self__"], record="b")
        c, _ = store.create_entry(ref=["__self__"], record="c")
        store.create_entry(ref=[a, b], record="e1")
        store.create_entry(ref=[a, c], record="e2")
        store.create_entry(ref=[b, c], record="e3")
        # 手动重建并比较
        rebuilt: dict[str, set[str]] = {}
        for h, entry in store.data.items():
            for v in entry["ref"]:
                if v != h:
                    rebuilt.setdefault(v, set()).add(h)
        for v, expected_set in rebuilt.items():
            actual = set(store.referencing(v))
            assert actual == expected_set, f"Mismatch for {v}: {actual} != {expected_set}"
