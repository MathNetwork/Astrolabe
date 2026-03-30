'use client'

/**
 * Lean 4 syntax highlighting — lightweight, no external deps.
 */

const KEYWORDS = new Set([
    'def', 'theorem', 'lemma', 'instance', 'class', 'structure', 'inductive',
    'where', 'let', 'have', 'show', 'by', 'do', 'return', 'match', 'with',
    'if', 'then', 'else', 'for', 'in', 'open', 'import', 'namespace', 'end',
    'section', 'variable', 'noncomputable', 'private', 'protected', 'partial',
    'unsafe', 'axiom', 'abbrev', 'example', 'deriving',
])

const TACTICS = new Set([
    'simp', 'rw', 'rewrite', 'exact', 'apply', 'intro', 'intros', 'constructor',
    'cases', 'rcases', 'induction', 'unfold', 'norm_num', 'omega', 'linarith',
    'aesop', 'grind', 'decide', 'trivial', 'rfl', 'ring', 'field_simp',
    'ext', 'funext', 'congr', 'conv', 'calc', 'sorry',
])

const TYPES = new Set([
    'Prop', 'Type', 'Sort', 'Nat', 'Int', 'Bool', 'String', 'List', 'Array',
    'Option', 'Fin', 'Finset', 'Set', 'True', 'False',
])

function tokenize(code: string): { text: string; kind: string }[] {
    const tokens: { text: string; kind: string }[] = []
    let i = 0

    while (i < code.length) {
        // Line comment --
        if (code[i] === '-' && code[i + 1] === '-') {
            const end = code.indexOf('\n', i)
            const e = end === -1 ? code.length : end
            tokens.push({ text: code.slice(i, e), kind: 'comment' })
            i = e
            continue
        }

        // Block comment /- ... -/
        if (code[i] === '/' && code[i + 1] === '-') {
            let depth = 1, j = i + 2
            while (j < code.length && depth > 0) {
                if (code[j] === '/' && code[j + 1] === '-') { depth++; j++ }
                else if (code[j] === '-' && code[j + 1] === '/') { depth--; j++ }
                j++
            }
            tokens.push({ text: code.slice(i, j), kind: 'comment' })
            i = j
            continue
        }

        // String
        if (code[i] === '"') {
            let j = i + 1
            while (j < code.length && code[j] !== '"') { if (code[j] === '\\') j++; j++ }
            tokens.push({ text: code.slice(i, j + 1), kind: 'string' })
            i = j + 1
            continue
        }

        // Number
        if (/[0-9]/.test(code[i]) && (i === 0 || /[\s(,[\]{}:+\-*/=<>]/.test(code[i - 1]))) {
            let j = i
            while (j < code.length && /[0-9._]/.test(code[j])) j++
            tokens.push({ text: code.slice(i, j), kind: 'number' })
            i = j
            continue
        }

        // Word
        if (/[a-zA-Z_α-ωΑ-Ω]/.test(code[i])) {
            let j = i
            while (j < code.length && /[a-zA-Z0-9_'α-ωΑ-Ω.!?]/.test(code[j])) j++
            const word = code.slice(i, j)
            const base = word.split('.').pop() || word
            if (KEYWORDS.has(base)) tokens.push({ text: word, kind: 'keyword' })
            else if (TACTICS.has(base)) tokens.push({ text: word, kind: 'tactic' })
            else if (TYPES.has(base)) tokens.push({ text: word, kind: 'type' })
            else tokens.push({ text: word, kind: 'ident' })
            i = j
            continue
        }

        // Operators / symbols
        if (/[←→↔∀∃∧∨¬≤≥≠∈∉⊆⊇∪∩∅λ⟨⟩▸·∘⁻¹²³⁴⁺⁻]/.test(code[i])) {
            tokens.push({ text: code[i], kind: 'symbol' })
            i++
            continue
        }

        // Other single char
        tokens.push({ text: code[i], kind: 'plain' })
        i++
    }

    return tokens
}

const COLORS: Record<string, string> = {
    keyword: '#c586c0',   // purple
    tactic: '#dcdcaa',    // yellow
    type: '#4ec9b0',      // teal
    comment: '#6a9955',   // green
    string: '#ce9178',    // orange
    number: '#b5cea8',    // light green
    symbol: '#569cd6',    // blue
    ident: '#9cdcfe',     // light blue
    plain: '#d4d4d4',     // gray
}

export function LeanCode({ children }: { children: string }) {
    const tokens = tokenize(children || '')
    return (
        <pre className="text-[11px] font-mono bg-black/30 rounded p-2 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {tokens.map((t, i) => (
                <span key={i} style={{ color: COLORS[t.kind] || COLORS.plain }}>{t.text}</span>
            ))}
        </pre>
    )
}
