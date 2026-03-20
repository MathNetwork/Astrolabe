/**
 * Astrolabe Built-in Skills
 *
 * Each skill is a prompt template designed for Astrolabe's architecture:
 * - Data format: knowledge.json (obj/mor)
 * - Document format: MDX + objblock/objref
 * - Categorical schema: objects have sorts, morphisms have notes
 */

export interface Skill {
    id: string
    name: string
    command: string
    description: string
    prompt: string
}

/** System context injected into all skill prompts */
const SYSTEM_CONTEXT = `You are working inside Astrolabe, a knowledge graph tool.

Data format:
- Knowledge graph stored in .astrolabe/knowledge.json
- Objects (obj): id, name, sort, statement, proof, intuition, notes
- Morphisms (mor): id, source, target, sort (optional), notes
- Sort types: definition, theorem, lemma, proposition, corollary, example, axiom, remark, conjecture
- Math formulas use LaTeX. Display math uses multi-line $$ format ($$ on its own line)

Document format:
- MDX files in .astrolabe/docs/
- Block reference: <div class="objblock">node_hash</div>
- Block with fields: <div class="objblock" data-show="statement,proof">node_hash</div>
- Inline reference: <objref id="node_hash">optional text</objref>

All data modifications must go through the backend API (port 8765), never write JSON directly.
Respond in the same language as the user's input.
`

export const BUILT_IN_SKILLS: Skill[] = [
    // ── Understanding ──
    {
        id: 'explain',
        name: 'Explain',
        command: '/explain',
        description: 'Explain the selected concept in detail',
        prompt: SYSTEM_CONTEXT + `Explain the currently selected concept in detail:
1. Intuitive understanding
2. Mathematical meaning (formal definition or theorem statement)
3. Importance in the broader theory
4. Prerequisites needed
5. Connections to other nodes in the graph

Use LaTeX for mathematical notation.`,
    },
    {
        id: 'summarize',
        name: 'Summarize',
        command: '/summarize',
        description: 'Summarize concepts and relationships in context',
        prompt: SYSTEM_CONTEXT + `Summarize the selected concept and its relationships:
- Core idea
- What it depends on
- What depends on it
- Overall logical flow`,
    },

    // ── Create ──
    {
        id: 'add-node',
        name: 'Add Node',
        command: '/add-node',
        description: 'Create a new knowledge node',
        prompt: SYSTEM_CONTEXT + `Help me create a new knowledge node. Provide:

\`\`\`json
{
  "name": "Concept name (ASCII only)",
  "sort": "definition|theorem|lemma|proposition|corollary|example|axiom|remark|conjecture",
  "statement": "Formal mathematical statement (LaTeX with multi-line $$ format)",
  "proof": "Proof if applicable",
  "intuition": "Intuitive explanation",
  "notes": "Additional notes"
}
\`\`\`

Based on our discussion, suggest appropriate content. Name must be in English.`,
    },
    {
        id: 'add-edge',
        name: 'Add Edge',
        command: '/add-edge',
        description: 'Create a relationship between nodes',
        prompt: SYSTEM_CONTEXT + `Help me create a morphism (edge) between two knowledge nodes.

Provide:
\`\`\`json
{
  "source": "source node hash",
  "target": "target node hash",
  "sort": "relationship type (e.g., implies, uses, generalizes, extends, depends_on)",
  "notes": "describe the relationship in detail"
}
\`\`\`

The sort field classifies the relationship type. Choose a sort that best describes the nature of the connection.`,
    },

    // ── Analysis ──
    {
        id: 'find-connections',
        name: 'Find Connections',
        command: '/find-connections',
        description: 'Analyze relationship paths between concepts',
        prompt: SYSTEM_CONTEXT + `Analyze the relationship network of the selected node:
1. What concepts does it depend on? (incoming morphisms)
2. What concepts depend on it? (outgoing morphisms)
3. Are there missing relationships that should be added?
4. Suggest new morphisms with appropriate notes`,
    },
    {
        id: 'suggest-sort',
        name: 'Suggest Sort',
        command: '/suggest-sort',
        description: 'Suggest the appropriate sort classification',
        prompt: SYSTEM_CONTEXT + `Based on the selected node's content, determine the most appropriate sort.

Options: definition, theorem, lemma, proposition, corollary, example, axiom, remark, conjecture

Explain your reasoning.`,
    },

    // ── Writing ──
    {
        id: 'write-proof',
        name: 'Write Proof',
        command: '/write-proof',
        description: 'Help write or complete a proof',
        prompt: SYSTEM_CONTEXT + `Help me write the proof for the selected theorem/proposition.

Requirements:
- Rigorous mathematical reasoning
- LaTeX formulas with multi-line $$ format
- Reference other nodes where applicable
- Use <objref id="hash">name</objref> for cross-references`,
    },
    {
        id: 'write-mdx',
        name: 'Write MDX',
        command: '/write-mdx',
        description: 'Help write an MDX document section',
        prompt: SYSTEM_CONTEXT + `Help me write an MDX document section.

Format requirements:
- Markdown syntax
- Math with KaTeX (inline $...$, display $$...$$)
- Reference nodes with <div class="objblock">hash</div> or <objref id="hash">name</objref>
- data-show can specify fields: statement, proof, intuition, notes

Generate appropriate content based on context.`,
    },

    // ── Maintenance ──
    {
        id: 'review-graph',
        name: 'Review Graph',
        command: '/review-graph',
        description: 'Review knowledge graph completeness',
        prompt: SYSTEM_CONTEXT + `Review the quality of the current knowledge graph:
1. Any orphan nodes (no connections)?
2. Any theorems/propositions with empty statements?
3. Any obvious missing relationships?
4. Are sort classifications accurate?
5. Suggest improvements`,
    },
    {
        id: 'translate',
        name: 'Translate',
        command: '/translate',
        description: 'Translate selected node content',
        prompt: SYSTEM_CONTEXT + `Translate the selected node's content.

If the original is in English, translate to Chinese preserving LaTeX formulas.
If the original is in Chinese, translate to English preserving LaTeX formulas.

Maintain accuracy of mathematical terminology.`,
    },

    // ── Edit ──
    {
        id: 'edit-node',
        name: 'Edit Node',
        command: '/edit-node',
        description: 'Modify fields of the selected node',
        prompt: SYSTEM_CONTEXT + `I want to modify the currently selected node. Generate the updated JSON:

\`\`\`json
{
  "id": "keep original id unchanged",
  "name": "updated name",
  "sort": "updated sort",
  "statement": "updated statement",
  "proof": "updated proof",
  "intuition": "updated intuition",
  "notes": "updated notes"
}
\`\`\`

Only modify the fields I ask to change. Keep everything else as-is. The id must remain unchanged.`,
    },
    {
        id: 'delete-node',
        name: 'Delete Node',
        command: '/delete-node',
        description: 'Delete the selected node',
        prompt: SYSTEM_CONTEXT + `I want to delete the currently selected node.

Please confirm:
1. The node's name and content
2. How many edges connect to it (deleting removes related edges)
3. Whether you're sure

If confirmed, output:
\`\`\`json
{"action": "delete-node", "id": "node hash id"}
\`\`\``,
    },
    {
        id: 'edit-edge',
        name: 'Edit Edge',
        command: '/edit-edge',
        description: 'Modify the notes of the selected edge',
        prompt: SYSTEM_CONTEXT + `I want to modify the selected morphism.

Based on my description, output the updated edge:
\`\`\`json
{
  "id": "keep original id",
  "source": "keep original source",
  "target": "keep original target",
  "sort": "updated sort (relationship type)",
  "notes": "updated notes"
}
\`\`\`

Only modify the fields I ask to change. Keep everything else as-is.`,
    },
    {
        id: 'delete-edge',
        name: 'Delete Edge',
        command: '/delete-edge',
        description: 'Delete the selected edge',
        prompt: SYSTEM_CONTEXT + `I want to delete the currently selected morphism.

Please confirm:
1. The two nodes this edge connects
2. The edge's notes content

If confirmed, output:
\`\`\`json
{"action": "delete-edge", "id": "edge hash id"}
\`\`\``,
    },

]

// ── Plugin skills ──

let pluginSkills: Skill[] = []

/** Register plugin skills (deduplicates by id). */
export function registerPluginSkills(skills: Skill[]) {
    for (const skill of skills) {
        if (!pluginSkills.some(s => s.id === skill.id) && !BUILT_IN_SKILLS.some(s => s.id === skill.id)) {
            pluginSkills.push(skill)
        }
    }
}

/** Clear all plugin skills (for testing / project switch). */
export function clearPluginSkills() {
    pluginSkills = []
}

/** Get all skills: built-in + plugin. */
export function getAllSkills(): Skill[] {
    return [...BUILT_IN_SKILLS, ...pluginSkills]
}

/**
 * Match skills by input prefix
 */
export function matchSkills(input: string): Skill[] {
    const all = getAllSkills()
    if (!input.startsWith('/')) return []
    const query = input.slice(1).toLowerCase()
    if (!query) return all
    return all.filter(s =>
        s.command.slice(1).startsWith(query) || s.name.toLowerCase().startsWith(query)
    )
}
