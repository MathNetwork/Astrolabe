/**
 * Astrolabe Built-in Skills
 *
 * Each skill is a prompt template designed for Astrolabe's architecture:
 * - Data format: astrolabe.json (entries with ref/record)
 * - Document format: MDX + objblock/objref
 * - Categorical schema: entries have sorts, ref defines relationships
 */

export interface Skill {
    id: string
    name: string
    command: string
    description: string
    prompt: string
}

/** System context injected into all skill prompts */
const SYSTEM_CONTEXT = `You are working inside Astrolabe, a knowledge graph visualization tool.

Data format:
- Data stored in .astrolabe/astrolabe.json
- Each entry: { "ref": [...], "record": { ... } }
- Atom (node): ref = ["__self__"], record has name, sort, statement, proof, intuition, notes
- Edge (1-simplex): ref = [source_hash, target_hash], record has sort, notes
- Sort types: definition, theorem, lemma, proposition, corollary, example, axiom, remark, conjecture
- Math formulas use LaTeX. Display math uses multi-line $$ format ($$ on its own line)

Document format:
- MDX files in .astrolabe/docs/
- Block reference: <div class="objblock">node_hash</div>
- Block with fields: <div class="objblock" data-show="statement,proof">node_hash</div>
- Inline reference: <objref id="node_hash">optional text</objref>

CRUD operations — output JSON blocks in the following formats:

Create entry:
\`\`\`json
{ "ref": ["__self__"], "record": { "name": "...", "sort": "...", "statement": "..." } }
\`\`\`

Create edge:
\`\`\`json
{ "ref": ["source_hash", "target_hash"], "record": { "sort": "...", "notes": "..." } }
\`\`\`

Update entry:
\`\`\`json
{ "action": "update-entry", "id": "entry_hash", "updates": { "field": "new value" } }
\`\`\`

Delete entry:
\`\`\`json
{ "action": "delete-entry", "id": "entry_hash" }
\`\`\`

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
        id: 'add-obj',
        name: 'Add Obj',
        command: '/add-obj',
        description: 'Create a new object',
        prompt: SYSTEM_CONTEXT + `Help me create a new node. Output:

\`\`\`json
{
  "ref": ["__self__"],
  "record": {
    "name": "Concept name (ASCII only)",
    "sort": "definition|theorem|lemma|proposition|corollary|example|axiom|remark|conjecture",
    "statement": "Formal mathematical statement (LaTeX with multi-line $$ format)",
    "proof": "Proof if applicable",
    "intuition": "Intuitive explanation",
    "notes": "Additional notes"
  }
}
\`\`\`

Based on our discussion, suggest appropriate content. Name must be in English.`,
    },
    {
        id: 'add-mor',
        name: 'Add Mor',
        command: '/add-mor',
        description: 'Create an edge between nodes',
        prompt: SYSTEM_CONTEXT + `Help me create an edge between two knowledge nodes.

Output:
\`\`\`json
{
  "ref": ["source_hash", "target_hash"],
  "record": {
    "sort": "relationship type (e.g., implies, uses, generalizes, extends, depends_on)",
    "notes": "describe the relationship in detail"
  }
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
1. What concepts does it depend on? (incoming edges)
2. What concepts depend on it? (outgoing edges)
3. Are there missing relationships that should be added?
4. Suggest new edges with appropriate notes`,
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

    // ── Extract ──
    {
        id: 'extract-obj',
        name: 'Extract Obj',
        command: '/extract-obj',
        description: 'Extract MDX text into a node + objblock reference',
        prompt: SYSTEM_CONTEXT + `Extract a definition/theorem/proposition/lemma from MDX text into a node.

## Strict Rules

1. **ZERO information loss.** The node's statement/proof must be CHARACTER-FOR-CHARACTER identical to the original MDX text being replaced. Do not summarize, rephrase, or omit anything.

2. **Only replace the statement+proof.** Keep all surrounding prose, remarks, introductory text, and section headings exactly as they are.

3. **Verify before replacing.** After creating the node, confirm that the node content matches the original text exactly.

## Procedure

### Step 1: Identify
User provides or selects MDX text. Identify:
- The **name** (e.g., "Category", "Bolzano-Weierstrass Theorem")
- The **sort** (definition, theorem, lemma, proposition, corollary, example, axiom, remark)
- The **statement** text (everything from the definition/theorem header to the end of the statement)
- The **proof** text (if any, from "Proof." to "$\\square$")

### Step 2: Create node
Output a JSON block to create the node:
\`\`\`json
{
  "ref": ["__self__"],
  "record": {
    "name": "Exact name (ASCII)",
    "sort": "definition|theorem|lemma|proposition|corollary|example|axiom|remark",
    "statement": "EXACT original text, character-for-character, including all LaTeX",
    "proof": "EXACT original proof text if any, including $\\\\square$"
  }
}
\`\`\`

### Step 3: Replace in MDX
After the node is created with hash \`HASH\`, output the replacement MDX:
- If statement only: \`<div class="objblock" data-show="statement">HASH</div>\`
- If statement + proof: \`<div class="objblock" data-show="statement,proof">HASH</div>\`

The section heading (e.g., "**Definition 1.1 (Category).**") is REMOVED because the objblock renders the node's name and sort as its header.

### Step 4: Verify
Show the user:
- BEFORE: the original MDX text
- AFTER: the objblock reference
- Confirm nothing was lost

## Example

BEFORE:
\`\`\`mdx
**Definition 1.1 (Category).** A *category* $\\mathcal{C}$ consists of...

subject to:
- **Associativity.** $h \\circ (g \\circ f) = (h \\circ g) \\circ f$
- **Unit laws.** $f \\circ \\text{id}_A = f = \\text{id}_B \\circ f$
\`\`\`

AFTER (node created with hash abc123):
\`\`\`mdx
<div class="objblock" data-show="statement">abc123</div>
\`\`\`

The node's statement field contains the COMPLETE original text.`,
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
        id: 'review-category',
        name: 'Review Category',
        command: '/review-category',
        description: 'Review category completeness',
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
        id: 'edit-obj',
        name: 'Edit Obj',
        command: '/edit-obj',
        description: 'Modify fields of the selected object',
        prompt: SYSTEM_CONTEXT + `I want to modify the currently selected node. Generate the update JSON:

\`\`\`json
{
  "action": "update-entry",
  "id": "keep original id unchanged",
  "updates": {
    "name": "updated name",
    "sort": "updated sort",
    "statement": "updated statement",
    "proof": "updated proof",
    "intuition": "updated intuition",
    "notes": "updated notes"
  }
}
\`\`\`

Only include the fields I ask to change in updates. The id must remain unchanged.`,
    },
    {
        id: 'delete-obj',
        name: 'Delete Obj',
        command: '/delete-obj',
        description: 'Delete the selected object',
        prompt: SYSTEM_CONTEXT + `I want to delete the currently selected node.

Please confirm:
1. The node's name and content
2. How many edges connect to it (deleting cascades to related edges)
3. Whether you're sure

If confirmed, output:
\`\`\`json
{"action": "delete-entry", "id": "node hash id"}
\`\`\``,
    },
    {
        id: 'edit-mor',
        name: 'Edit Mor',
        command: '/edit-mor',
        description: 'Modify the selected edge',
        prompt: SYSTEM_CONTEXT + `I want to modify the selected edge.

Based on my description, output the update:
\`\`\`json
{
  "action": "update-entry",
  "id": "keep original id",
  "updates": {
    "sort": "updated sort (relationship type)",
    "notes": "updated notes"
  }
}
\`\`\`

Only include the fields I ask to change in updates.`,
    },
    {
        id: 'delete-mor',
        name: 'Delete Mor',
        command: '/delete-mor',
        description: 'Delete the selected edge',
        prompt: SYSTEM_CONTEXT + `I want to delete the currently selected edge.

Please confirm:
1. The two nodes this edge connects
2. The edge's notes content

If confirmed, output:
\`\`\`json
{"action": "delete-entry", "id": "edge hash id"}
\`\`\``,
    },

]

// ── Functor skills ──

let functorSkills: Skill[] = []

/** Register functor skills (deduplicates by id). */
export function registerFunctorSkills(skills: Skill[]) {
    for (const skill of skills) {
        if (!functorSkills.some(s => s.id === skill.id) && !BUILT_IN_SKILLS.some(s => s.id === skill.id)) {
            functorSkills.push(skill)
        }
    }
}

/** Clear all functor skills (for testing / project switch). */
export function clearFunctorSkills() {
    functorSkills = []
}

/** Get all skills: built-in + functor. */
export function getAllSkills(): Skill[] {
    return [...BUILT_IN_SKILLS, ...functorSkills]
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
