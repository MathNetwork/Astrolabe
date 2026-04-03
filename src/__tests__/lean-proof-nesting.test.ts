/**
 * Lean proof nesting in EntryBlockRenderer.
 *
 * When a tex entryblock has a lean counterpart (cross-source), clicking the
 * ∀ badge expands a lean panel. That panel currently shows the lean theorem's
 * content, but NOT its proof. Since the store has (theorem, proof) edges
 * connecting lean theorems to lean proofs, the panel should also display the
 * nested lean proof (like RecordRenderer's NestedProofs does in DetailView).
 *
 * Contract:
 * 1. EntryBlockRenderer must have logic to find proofs for a lean counterpart
 * 2. The proof lookup pattern must match RecordRenderer (edge sort ends with ", proof)")
 * 3. Lean proof content must be renderable (LeanCode) in the expanded panel
 * 4. The proof section must be collapsible (not always visible)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

const entryBlockRenderer = fs.readFileSync('src/plugins/leannets/EntryBlockRenderer.tsx', 'utf-8')
const recordRenderer = fs.readFileSync('src/plugins/leannets/RecordRenderer.tsx', 'utf-8')

describe('Lean proof nesting in EntryBlockRenderer', () => {
    it('has a hook or effect to find proofs for the lean counterpart', () => {
        // Must look up proofs via edges, like RecordRenderer does
        expect(entryBlockRenderer).toMatch(/proof/i)
        // Must search degree-1 edges for proof relationships
        expect(entryBlockRenderer).toMatch(/degree=1|degree%3D1/)
    })

    it('matches proof edges by sort ending with ", proof)"', () => {
        // Same pattern as RecordRenderer line 32: s.endsWith(', proof)')
        expect(entryBlockRenderer).toContain(", proof)")
    })

    it('renders lean proof content with LeanCode component', () => {
        // LeanCode must be used for proof display (already imported)
        expect(entryBlockRenderer).toContain('LeanCode')
        // Must render proof content in the lean expanded panel area
        // Look for proof rendering near the leanExpanded section
        expect(entryBlockRenderer).toMatch(/proof.*content|proofContent|leanProof/)
    })

    it('proof section is collapsible (not always expanded)', () => {
        // Must have a toggle for showing/hiding proof
        expect(entryBlockRenderer).toMatch(/proof.*open|proof.*expand|showProof|proofOpen/i)
    })
})

describe('Consistency between RecordRenderer and EntryBlockRenderer proof lookup', () => {
    it('both use the same edge sort pattern for proof detection', () => {
        // RecordRenderer: s.endsWith(', proof)')
        const rrPattern = recordRenderer.includes(", proof)")
        const ebrPattern = entryBlockRenderer.includes(", proof)")
        expect(rrPattern).toBe(true)
        expect(ebrPattern).toBe(true)
    })

    it('both fetch degree-1 entries to find proof edges', () => {
        expect(recordRenderer).toMatch(/degree=1|degree%3D1/)
        expect(entryBlockRenderer).toMatch(/degree=1|degree%3D1/)
    })
})
