/**
 * 内置 Skills（slash commands）
 *
 * 每个 skill 是一个 prompt 模板，用户输入 /command 时注入到对话中。
 * 未来可从 ~/.claude/skills/ 目录加载自定义 skills（和 claude-prism 一样）。
 */

export interface Skill {
    id: string
    name: string
    command: string      // 用户输入的 /xxx
    description: string
    prompt: string       // 注入到 Claude 的 prompt
}

export const BUILT_IN_SKILLS: Skill[] = [
    {
        id: 'explain',
        name: 'Explain',
        command: '/explain',
        description: 'Explain the selected node in detail',
        prompt: `Please explain the currently selected mathematical concept in detail.
Include:
- What it means intuitively
- Why it's important in the broader context
- Key prerequisites needed to understand it
- How it relates to other concepts in the knowledge graph
Use LaTeX for mathematical notation.`,
    },
    {
        id: 'add-node',
        name: 'Add Node',
        command: '/add-node',
        description: 'Help create a new knowledge node from discussion',
        prompt: `Help me create a new knowledge node. Based on our discussion, suggest:
- name: A concise name for the concept
- sort: One of (definition, theorem, lemma, proposition, corollary, example, axiom, remark, conjecture)
- statement: The formal mathematical statement
- proof: The proof (if applicable)
- intuition: An intuitive explanation
- notes: Any additional notes

Format your response as a structured description I can use to add this node to the knowledge graph.`,
    },
    {
        id: 'find-connections',
        name: 'Find Connections',
        command: '/find-connections',
        description: 'Analyze relationships between concepts',
        prompt: `Analyze the relationships between the currently selected node and other concepts in the knowledge graph.
- What does this concept depend on?
- What concepts depend on it?
- Are there any missing connections that should exist?
- Suggest potential new morphisms (edges) with appropriate notes.`,
    },
    {
        id: 'summarize',
        name: 'Summarize',
        command: '/summarize',
        description: 'Summarize a group of related nodes',
        prompt: `Summarize the key ideas and relationships in the current context.
Provide a concise overview that captures:
- The main concepts involved
- How they relate to each other
- The overall narrative or logical flow`,
    },
    {
        id: 'suggest-sort',
        name: 'Suggest Sort',
        command: '/suggest-sort',
        description: 'Suggest the appropriate sort for a concept',
        prompt: `Based on the content of the selected node, suggest the most appropriate sort classification.
Choose from: definition, theorem, lemma, proposition, corollary, example, axiom, remark, conjecture.
Explain your reasoning.`,
    },
    {
        id: 'write-proof',
        name: 'Write Proof',
        command: '/write-proof',
        description: 'Help write or complete a proof',
        prompt: `Help me write or complete the proof for the selected theorem/proposition.
- Use rigorous mathematical reasoning
- Reference other nodes in the knowledge graph where applicable
- Use LaTeX notation for mathematical expressions`,
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
