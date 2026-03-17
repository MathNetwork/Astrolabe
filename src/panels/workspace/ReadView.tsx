'use client'

/**
 * ReadView — MDX 阅读器
 *
 * 职责：
 *   - 加载和渲染 MDX 文档（LaTeX + nodeblock + noderef）
 *   - 文档列表侧栏 + 页内 TOC
 *   - 点击 noderef/nodeblock → 写入 selectObjStore.select(hash)
 *   - nodeblock 内显示节点编号（从 dataStore.nodeNumbering 读取）
 *   - 已访问页面缓存渲染结果（display:none 切换，不重新渲染 KaTeX）
 *
 * 订阅：dataStore（obj 数据 + 编号）
 * 写入：selectObjStore（点击 noderef 时）
 * 不关心：selectMorStore, physicsStore, analysisStore
 *
 * 进度：空壳，待 Phase 3 填充（从旧 NetworkRead.tsx 迁移）
 */
import { memo } from 'react'

export const ReadView = memo(function ReadView() {
    return <div className="h-full" />
})
