import { describe, it, expect } from 'vitest'
import { normalizeToRange, valuesToGradient } from '../normalize'

describe('normalizeToRange', () => {
    it('maps values to min-max range', () => {
        const values = { a: 0, b: 5, c: 10 }
        const result = normalizeToRange(values, 4, 12)
        expect(result.a).toBe(4)
        expect(result.c).toBe(12)
        expect(result.b).toBeCloseTo(8)
    })

    it('handles all same values', () => {
        const values = { a: 5, b: 5, c: 5 }
        const result = normalizeToRange(values, 4, 12)
        // All same → all get midpoint
        expect(result.a).toBeCloseTo(8)
        expect(result.b).toBeCloseTo(8)
    })

    it('handles single node', () => {
        const result = normalizeToRange({ a: 42 }, 4, 12)
        expect(result.a).toBeCloseTo(8)
    })

    it('handles empty', () => {
        const result = normalizeToRange({}, 4, 12)
        expect(result).toEqual({})
    })
})

describe('valuesToGradient', () => {
    it('maps 0 to cool color, 1 to warm color', () => {
        const values = { a: 0, b: 10 }
        const result = valuesToGradient(values)
        // a is min → cool (blueish), b is max → warm (reddish)
        expect(result.a).toMatch(/^#/)
        expect(result.b).toMatch(/^#/)
        expect(result.a).not.toBe(result.b)
    })

    it('handles all same values', () => {
        const result = valuesToGradient({ a: 5, b: 5 })
        expect(result.a).toBe(result.b)
    })

    it('handles empty', () => {
        expect(valuesToGradient({})).toEqual({})
    })
})
