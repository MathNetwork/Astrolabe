/**
 * Integration test for graph filtering with realistic Lean 4 project patterns
 *
 * Uses synthetic data modeled after common Lean 4 patterns:
 * - Type class instances (Fintype, Group, MulAction)
 * - Decidable instances for propositions
 * - Theorems proving MulAction laws (apply_one, apply_mul)
 * - Definition hierarchies (Hexagram, complement, reverse)
 *
 * These patterns are representative of what the filter encounters in real
 * Lean 4 formalizations (e.g., mathlib, group theory projects).
 */

import { describe, it, expect } from 'vitest'
import {
  isTechnicalNode,
  processGraph,
  type GraphFilterOptions,
} from '../graphProcessing'
import type { AstroNode, AstroEdge } from '@/types/graph'

// ============================================
// Test Helpers
// ============================================

function createNode(overrides: Partial<AstroNode> & { id: string; name: string }): AstroNode {
  return {
    sort: 'theorem',
    status: 'proven',
    defaultColor: '#A855F7',
    defaultSize: 1.0,
    defaultShape: 'sphere',
    pinned: false,
    visible: true,
    ...overrides,
  }
}

function createEdge(source: string, target: string): AstroEdge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    fromLean: true,
    defaultColor: '#2ecc71',
    defaultWidth: 1.0,
    defaultStyle: 'solid',
    visible: true,
  }
}

// ============================================
// Realistic Lean 4 Node/Edge Data
// Models patterns from group theory formalizations
// ============================================

function createLean4Nodes(): AstroNode[] {
  return [
    // === Definitions (should NOT be filtered) ===
    createNode({ id: 'klein', name: 'IChing.KleinAction', sort: 'inductive' }),
    createNode({ id: 'hexagram', name: 'IChing.Hexagram', sort: 'definition' }),
    createNode({ id: 'apply', name: 'IChing.KleinAction.apply', sort: 'definition' }),
    createNode({ id: 'complement', name: 'IChing.Hexagram.complement', sort: 'definition' }),
    createNode({ id: 'reverse', name: 'IChing.Hexagram.reverse', sort: 'definition' }),
    createNode({ id: 'complementReverse', name: 'IChing.Hexagram.complementReverse', sort: 'definition' }),
    createNode({ id: 'isPalindrome', name: 'IChing.Hexagram.isPalindrome', sort: 'definition' }),
    createNode({ id: 'isOppositePair', name: 'IChing.isOppositePair', sort: 'definition' }),
    createNode({ id: 'isReversePair', name: 'IChing.isReversePair', sort: 'definition' }),
    createNode({ id: 'isEquivariantPair', name: 'IChing.isEquivariantPair', sort: 'definition' }),
    createNode({ id: 'priorityPartner', name: 'IChing.priorityPartner', sort: 'definition' }),

    // === Theorems (should NOT be filtered) ===
    createNode({ id: 'apply_one', name: 'IChing.KleinAction.apply_one', sort: 'theorem' }),
    createNode({ id: 'apply_mul', name: 'IChing.KleinAction.apply_mul', sort: 'theorem' }),
    createNode({ id: 'complement_involutive', name: 'IChing.Hexagram.complement_involutive', sort: 'theorem' }),
    createNode({ id: 'reverse_involutive', name: 'IChing.Hexagram.reverse_involutive', sort: 'theorem' }),
    createNode({ id: 'complement_reverse_comm', name: 'IChing.Hexagram.complement_reverse_comm', sort: 'theorem' }),
    createNode({ id: 'kingWen_equivariant', name: 'IChing.kingWen_all_equivariant', sort: 'theorem' }),
    createNode({ id: 'simple_reflection_opt', name: 'IChing.simple_reflection_optimality', sort: 'theorem' }),

    // === Instances (SHOULD be filtered as technical) ===
    createNode({ id: 'instFintype', name: 'IChing.instFintypeKleinAction', sort: 'instance' }),
    createNode({ id: 'instGroup', name: 'IChing.instGroupKleinAction', sort: 'instance' }),
    createNode({ id: 'instMulAction', name: 'IChing.instMulActionKleinActionHexagram', sort: 'instance' }),
    createNode({ id: 'instDecidablePalindrome', name: 'IChing.instDecidablePredIsPalindrome', sort: 'definition' }), // Detected by name pattern
    createNode({ id: 'instDecidableOpp', name: 'IChing.instDecidableIsOppositePair', sort: 'definition' }),
    createNode({ id: 'instDecidableRev', name: 'IChing.instDecidableIsReversePair', sort: 'definition' }),
    createNode({ id: 'instCoxeter', name: 'IChing.instCoxeterGeneratorKleinAction', sort: 'instance' }),
  ]
}

function createLean4Edges(): AstroEdge[] {
  return [
    // === Direct definition dependencies ===
    createEdge('complement', 'hexagram'),
    createEdge('reverse', 'hexagram'),
    createEdge('complementReverse', 'complement'),
    createEdge('complementReverse', 'reverse'),
    createEdge('apply', 'klein'),
    createEdge('apply', 'hexagram'),
    createEdge('isPalindrome', 'hexagram'),
    createEdge('isPalindrome', 'reverse'),
    createEdge('isOppositePair', 'complement'),
    createEdge('isReversePair', 'reverse'),
    createEdge('isEquivariantPair', 'isOppositePair'),
    createEdge('isEquivariantPair', 'isReversePair'),
    createEdge('priorityPartner', 'isPalindrome'),
    createEdge('priorityPartner', 'complement'),
    createEdge('priorityPartner', 'reverse'),

    // === Theorem dependencies on definitions ===
    createEdge('complement_involutive', 'complement'),
    createEdge('reverse_involutive', 'reverse'),
    createEdge('complement_reverse_comm', 'complement'),
    createEdge('complement_reverse_comm', 'reverse'),
    createEdge('kingWen_equivariant', 'isEquivariantPair'),
    createEdge('simple_reflection_opt', 'priorityPartner'),

    // === Instance dependencies ===
    createEdge('instFintype', 'klein'),
    createEdge('instGroup', 'klein'),
    createEdge('instGroup', 'instFintype'),  // Group depends on Fintype
    createEdge('instMulAction', 'klein'),
    createEdge('instMulAction', 'hexagram'),
    createEdge('instMulAction', 'apply'),
    createEdge('instMulAction', 'instGroup'),
    createEdge('instDecidablePalindrome', 'isPalindrome'),
    createEdge('instDecidableOpp', 'isOppositePair'),
    createEdge('instDecidableRev', 'isReversePair'),
    createEdge('instCoxeter', 'klein'),
    createEdge('instCoxeter', 'instGroup'),

    // === MulAction theorem dependencies (the key case!) ===
    // apply_one and apply_mul ONLY depend on the MulAction instance
    createEdge('apply_one', 'instMulAction'),
    createEdge('apply_mul', 'instMulAction'),
  ]
}

// ============================================
// Integration Tests
// ============================================

describe('Lean 4 Pattern Integration Tests', () => {
  const nodes = createLean4Nodes()
  const edges = createLean4Edges()

  describe('isTechnicalNode detection', () => {
    it('should identify all instance nodes as technical', () => {
      const instanceNodes = nodes.filter(n => n.sort === 'instance')
      for (const node of instanceNodes) {
        expect(isTechnicalNode(node), `${node.name} should be technical`).toBe(true)
      }
    })

    it('should identify instDecidable* nodes as technical (by name pattern)', () => {
      const decidableNodes = nodes.filter(n => n.name.includes('instDecidable'))
      expect(decidableNodes.length).toBeGreaterThan(0)
      for (const node of decidableNodes) {
        expect(isTechnicalNode(node), `${node.name} should be technical`).toBe(true)
      }
    })

    it('should NOT identify regular definitions as technical', () => {
      const regularDefs = ['complement', 'reverse', 'apply', 'isPalindrome', 'priorityPartner']
      for (const id of regularDefs) {
        const node = nodes.find(n => n.id === id)!
        expect(isTechnicalNode(node), `${node.name} should NOT be technical`).toBe(false)
      }
    })

    it('should NOT identify regular theorems as technical', () => {
      const theorems = nodes.filter(n => n.sort === 'theorem')
      for (const node of theorems) {
        expect(isTechnicalNode(node), `${node.name} should NOT be technical`).toBe(false)
      }
    })
  })

  describe('processGraph with leanichi data', () => {
    it('should filter correct number of technical nodes', () => {
      const result = processGraph(nodes, edges, { hideTechnical: true, hideOrphaned: true })

      // Count expected technical nodes:
      // 4 instance kind + 3 instDecidable* by name = 7 technical
      expect(result.stats.removedNodes).toBe(7)
    })

    it('should keep apply_one and apply_mul via through-links (instance has outgoing deps)', () => {
      const result = processGraph(nodes, edges, { hideTechnical: true, hideOrphaned: true })

      // apply_one -> instMulAction -> apply, klein, hexagram
      // So through-links are created: apply_one -> apply, apply_one -> klein, etc.
      // This means apply_one is NOT orphaned!
      const remainingIds = result.nodes.map(n => n.id)
      expect(remainingIds).toContain('apply_one')
      expect(remainingIds).toContain('apply_mul')

      // Verify they have through-link edges
      const virtualEdges = result.edges.filter(e => e.id.startsWith('virtual'))
      const applyOneEdges = virtualEdges.filter(e => e.source === 'apply_one')
      const applyMulEdges = virtualEdges.filter(e => e.source === 'apply_mul')

      // Each should have edges to: apply, klein, hexagram (3 edges each)
      expect(applyOneEdges.length).toBeGreaterThan(0)
      expect(applyMulEdges.length).toBeGreaterThan(0)
    })

    it('should keep apply_one and apply_mul with hideOrphaned: false', () => {
      const result = processGraph(nodes, edges, { hideTechnical: true, hideOrphaned: false })

      const remainingIds = result.nodes.map(n => n.id)
      expect(remainingIds).toContain('apply_one')
      expect(remainingIds).toContain('apply_mul')
      expect(result.stats.orphanedNodes).toBe(0)
    })

    it('should keep core definitions after filtering', () => {
      const result = processGraph(nodes, edges, { hideTechnical: true, hideOrphaned: true })

      const remainingIds = result.nodes.map(n => n.id)
      const expectedKept = [
        'hexagram', 'klein', 'complement', 'reverse', 'complementReverse',
        'isPalindrome', 'isOppositePair', 'isReversePair', 'isEquivariantPair',
        'priorityPartner', 'apply',
        'complement_involutive', 'reverse_involutive', 'complement_reverse_comm',
        'kingWen_equivariant', 'simple_reflection_opt'
      ]

      for (const id of expectedKept) {
        expect(remainingIds, `${id} should be kept`).toContain(id)
      }
    })

    it('should create through-links for apply_one/apply_mul to instance dependencies', () => {
      // Disable transitive reduction to verify through-links are created
      const result = processGraph(nodes, edges, { hideTechnical: true, hideOrphaned: false, transitiveReduction: false })

      // instMulAction depends ON: apply, klein, hexagram
      // apply_one -> instMulAction, so through-links: apply_one -> apply, klein, hexagram
      const virtualEdges = result.edges.filter(e => e.id.startsWith('virtual'))
      const applyOneOutgoing = virtualEdges.filter(e => e.source === 'apply_one')
      const applyMulOutgoing = virtualEdges.filter(e => e.source === 'apply_mul')

      // Each gets through-links to the 3 non-technical deps of instMulAction
      expect(applyOneOutgoing.length).toBe(3)
      expect(applyMulOutgoing.length).toBe(3)

      // Verify targets are the right nodes
      const applyOneTargets = applyOneOutgoing.map(e => e.target).sort()
      expect(applyOneTargets).toEqual(['apply', 'hexagram', 'klein'])
    })

    it('should remove edges to technical nodes', () => {
      const result = processGraph(nodes, edges, { hideTechnical: true, hideOrphaned: true })

      // No edge should reference a technical node
      const technicalIds = ['instFintype', 'instGroup', 'instMulAction',
                           'instDecidablePalindrome', 'instDecidableOpp',
                           'instDecidableRev', 'instCoxeter']

      for (const edge of result.edges) {
        expect(technicalIds).not.toContain(edge.source)
        expect(technicalIds).not.toContain(edge.target)
      }
    })

    it('should preserve direct definition-to-definition edges', () => {
      const result = processGraph(nodes, edges, { hideTechnical: true, hideOrphaned: true })

      // These edges don't go through any instance
      const expectedEdges = [
        ['complement', 'hexagram'],
        ['reverse', 'hexagram'],
        ['complement_involutive', 'complement'],
        ['reverse_involutive', 'reverse'],
      ]

      for (const [source, target] of expectedEdges) {
        const found = result.edges.find(e => e.source === source && e.target === target)
        expect(found, `Edge ${source} -> ${target} should exist`).toBeDefined()
      }
    })
  })

  describe('orphaning scenario (instance with no non-technical outgoing)', () => {
    it('should orphan nodes when instance has only technical dependencies', () => {
      // Simulate: theorem -> instance -> anotherInstance (chain of technical)
      const isolatedNodes: AstroNode[] = [
        createNode({ id: 'theorem1', name: 'Some.theorem', sort: 'theorem' }),
        createNode({ id: 'inst1', name: 'instA', sort: 'instance' }),
        createNode({ id: 'inst2', name: 'instB', sort: 'instance' }),
      ]
      const isolatedEdges: AstroEdge[] = [
        createEdge('theorem1', 'inst1'),
        createEdge('inst1', 'inst2'),  // instance depends on another instance only
      ]

      const result = processGraph(isolatedNodes, isolatedEdges, { hideTechnical: true, hideOrphaned: true })

      // Both instances filtered, theorem1 becomes orphaned
      expect(result.stats.removedNodes).toBe(2)
      expect(result.stats.orphanedNodes).toBe(1)
      expect(result.nodes).toHaveLength(0)
    })

    it('should orphan nodes when instance has no outgoing edges at all', () => {
      // The classic "dead-end instance" pattern
      const deadEndNodes: AstroNode[] = [
        createNode({ id: 'thm', name: 'MyTheorem', sort: 'theorem' }),
        createNode({ id: 'inst', name: 'instDeadEnd', sort: 'instance' }),
      ]
      const deadEndEdges: AstroEdge[] = [
        createEdge('thm', 'inst'),  // theorem uses instance, but instance uses nothing
      ]

      const result = processGraph(deadEndNodes, deadEndEdges, { hideTechnical: true, hideOrphaned: true })

      expect(result.stats.removedNodes).toBe(1)  // instance
      expect(result.stats.orphanedNodes).toBe(1)  // theorem
      expect(result.nodes).toHaveLength(0)
    })
  })

  describe('stats accuracy', () => {
    it('should report accurate counts', () => {
      const result = processGraph(nodes, edges, { hideTechnical: true, hideOrphaned: true })

      console.log('=== Lean 4 Filter Stats ===')
      console.log(`Original: ${nodes.length} nodes, ${edges.length} edges`)
      console.log(`Technical removed: ${result.stats.removedNodes}`)
      console.log(`Orphaned removed: ${result.stats.orphanedNodes}`)
      console.log(`Virtual edges created: ${result.stats.virtualEdgesCreated}`)
      console.log(`Final: ${result.nodes.length} nodes, ${result.edges.length} edges`)
      console.log(`Hidden total: ${result.stats.removedNodes + result.stats.orphanedNodes}`)

      // Verify math adds up
      const totalRemoved = result.stats.removedNodes + result.stats.orphanedNodes
      expect(nodes.length - totalRemoved).toBe(result.nodes.length)
    })
  })
})
