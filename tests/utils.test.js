import { describe, it, expect } from 'vitest'
import { seededRandom } from '../src/utils.js'

describe('seededRandom', () => {
  it('returns a value between 0 and 1', () => {
    for (let seed = 0; seed < 100; seed++) {
      const val = seededRandom(seed)
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThan(1)
    }
  })

  it('is deterministic (same seed = same result)', () => {
    expect(seededRandom(42)).toBe(seededRandom(42))
    expect(seededRandom(123)).toBe(seededRandom(123))
  })

  it('produces different values for different seeds', () => {
    const values = new Set()
    for (let seed = 0; seed < 50; seed++) {
      values.add(seededRandom(seed))
    }
    expect(values.size).toBeGreaterThan(45)
  })
})
