import { degree, isAtom, profile, type AstrolabeEntry } from '../types/entry'

describe('AstrolabeEntry', () => {
  test('atom has degree 0', () => {
    expect(degree({ ref: ['abc'], record: {} })).toBe(0)
  })

  test('edge has degree 1', () => {
    expect(degree({ ref: ['a', 'b'], record: {} })).toBe(1)
  })

  test('face has degree 2', () => {
    expect(degree({ ref: ['a', 'b', 'c'], record: {} })).toBe(2)
  })

  test('atom detected', () => {
    expect(isAtom({ ref: ['abc'], record: {} })).toBe(true)
  })

  test('non-atom detected', () => {
    expect(isAtom({ ref: ['a', 'b'], record: {} })).toBe(false)
  })

  test('profile with repetition', () => {
    expect(profile({ ref: ['a', 'a', 'b'], record: {} })).toEqual({ a: 2, b: 1 })
  })

  test('profile sum equals ref length', () => {
    const entry: AstrolabeEntry = { ref: ['x', 'y', 'x', 'z'], record: {} }
    const p = profile(entry)
    const sum = Object.values(p).reduce((a, b) => a + b, 0)
    expect(sum).toBe(4)
  })
})
