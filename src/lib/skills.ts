/**
 * NetMath 内置 Skills
 *
 * 每个 skill 就是一段 prompt，针对 NetMath 的架构设计：
 * - 数据格式：knowledge.json（obj/mor）
 * - 文档格式：MDX + objblock/objref
 * - 范畴论 schema：对象（节点）有 sort，态射（边）有 notes
 */

export interface Skill {
    id: string
    name: string
    command: string
    description: string
    prompt: string
}

/** NetMath 项目上下文，注入到所有 skill prompt 前面 */
const SYSTEM_CONTEXT = `你在一个叫 NetMath 的知识图谱工具中工作。

数据格式：
- 知识图谱存在 .netmath/knowledge.json 中
- 对象（obj）字段：id, name, sort, statement, proof, intuition, notes
- 态射（mor）字段：id, source, target, notes
- sort 类型：definition, theorem, lemma, proposition, corollary, example, axiom, remark, conjecture
- 数学公式用 LaTeX，display math 用多行 $$ 格式（$$ 独占一行）

文档格式：
- MDX 文件在 .netmath/docs/ 目录
- 块级引用：<div class="objblock">node_hash</div>
- 块级指定字段：<div class="objblock" data-show="statement,proof">node_hash</div>
- 内联引用：<objref id="node_hash">可选文本</objref>

修改数据必须通过后端 API（端口 8765），不要直接写 JSON。
`

export const BUILT_IN_SKILLS: Skill[] = [
    // ── 知识理解 ──
    {
        id: 'explain',
        name: 'Explain',
        command: '/explain',
        description: '解释选中节点的数学内容',
        prompt: SYSTEM_CONTEXT + `请详细解释当前选中的数学概念：
1. 直觉理解：这个概念在说什么？
2. 数学含义：严格定义或定理陈述
3. 重要性：为什么这个概念重要？它在整体理论中的位置
4. 前置知识：理解它需要什么基础
5. 和图谱中其他节点的关系

用中文回答，数学公式用 LaTeX。`,
    },
    {
        id: 'summarize',
        name: 'Summarize',
        command: '/summarize',
        description: '总结当前上下文中的概念关系',
        prompt: SYSTEM_CONTEXT + `总结当前选中的概念及其相关联系：
- 核心思想是什么
- 依赖了哪些前置概念
- 被哪些后续概念使用
- 整体的逻辑脉络

简洁清晰，用中文。`,
    },

    // ── 节点操作 ──
    {
        id: 'add-node',
        name: 'Add Node',
        command: '/add-node',
        description: '帮助创建新的知识节点',
        prompt: SYSTEM_CONTEXT + `帮我创建一个新的知识节点。请提供：

\`\`\`json
{
  "name": "概念名称（纯 ASCII）",
  "sort": "definition|theorem|lemma|proposition|corollary|example|axiom|remark|conjecture",
  "statement": "严格的数学陈述（LaTeX 公式用 $$ 多行格式）",
  "proof": "证明（如果适用）",
  "intuition": "直觉理解",
  "notes": "备注"
}
\`\`\`

根据我们的讨论，建议合适的内容。name 只用英文。`,
    },
    {
        id: 'add-edge',
        name: 'Add Edge',
        command: '/add-edge',
        description: '帮助创建节点之间的关系',
        prompt: SYSTEM_CONTEXT + `帮我在两个知识节点之间创建态射（边）。

请建议：
- source：起点节点
- target：终点节点
- notes：描述这个关系的含义（例如："uses compactness argument", "generalizes to higher dimensions"）

态射没有 sort 分类，含义完全通过 notes 表达。`,
    },

    // ── 分析与发现 ──
    {
        id: 'find-connections',
        name: 'Find Connections',
        command: '/find-connections',
        description: '分析概念之间的关系路径',
        prompt: SYSTEM_CONTEXT + `分析当前选中节点的关系网络：
1. 它依赖了哪些概念？（incoming morphisms）
2. 哪些概念依赖它？（outgoing morphisms）
3. 是否有缺失的关系应该补充？
4. 建议新的态射（notes 描述关系含义）`,
    },
    {
        id: 'suggest-sort',
        name: 'Suggest Sort',
        command: '/suggest-sort',
        description: '建议节点的 sort 分类',
        prompt: SYSTEM_CONTEXT + `根据选中节点的内容，判断最合适的 sort 分类。

可选：definition, theorem, lemma, proposition, corollary, example, axiom, remark, conjecture

解释为什么选这个分类。`,
    },

    // ── 写作辅助 ──
    {
        id: 'write-proof',
        name: 'Write Proof',
        command: '/write-proof',
        description: '帮助写证明',
        prompt: SYSTEM_CONTEXT + `帮我写选中定理/命题的证明。

要求：
- 严格的数学推理
- LaTeX 公式用 $$ 多行格式
- 引用图谱中其他节点时指出依赖关系
- 如果需要引用其他节点，使用 <objref id="hash">名称</objref> 格式`,
    },
    {
        id: 'write-mdx',
        name: 'Write MDX',
        command: '/write-mdx',
        description: '帮助写 MDX 文档段落',
        prompt: SYSTEM_CONTEXT + `帮我写一段 MDX 文档内容。

格式要求：
- 用 Markdown 语法
- 数学公式用 KaTeX（行内 $...$，display $$...$$）
- 引用知识节点用 <div class="objblock">hash</div> 或 <objref id="hash">名称</objref>
- data-show 可指定显示字段：statement, proof, intuition, notes

根据上下文生成合适的内容。`,
    },

    // ── 图谱维护 ──
    {
        id: 'review-graph',
        name: 'Review Graph',
        command: '/review-graph',
        description: '审查知识图谱的完整性',
        prompt: SYSTEM_CONTEXT + `审查当前知识图谱的质量：
1. 有没有孤立节点（没有任何连接）？
2. 有没有 statement 为空的定理/命题？
3. 有没有缺失的明显关系？
4. sort 分类是否准确？
5. 建议改进方案`,
    },
    {
        id: 'translate',
        name: 'Translate',
        command: '/translate',
        description: '翻译选中节点的内容',
        prompt: SYSTEM_CONTEXT + `将选中节点的内容翻译。

如果原文是英文，翻译成中文并保留 LaTeX 公式。
如果原文是中文，翻译成英文并保留 LaTeX 公式。

保持数学术语的准确性。`,
    },
]

/**
 * 根据输入前缀查找匹配的 skills
 */
export function matchSkills(input: string): Skill[] {
    if (!input.startsWith('/')) return []
    const query = input.slice(1).toLowerCase()
    if (!query) return BUILT_IN_SKILLS
    return BUILT_IN_SKILLS.filter(s =>
        s.command.slice(1).startsWith(query) || s.name.toLowerCase().startsWith(query)
    )
}
