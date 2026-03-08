import { describe, it, expect } from 'vitest'
import * as C from '../src/constants.js'

describe('constants', () => {
  it('MAP_SIZE is a positive number', () => {
    expect(C.MAP_SIZE).toBeGreaterThan(0)
  })

  it('all radii are positive', () => {
    expect(C.SELL_RADIUS).toBeGreaterThan(0)
    expect(C.DELIVERY_RADIUS).toBeGreaterThan(0)
    expect(C.PUSH_RADIUS).toBeGreaterThan(0)
    expect(C.BASE_COLLECT_RADIUS).toBeGreaterThan(0)
    expect(C.BULLDOZER_RADIUS).toBeGreaterThan(0)
  })

  it('HEIGHTMAP_RES matches PlaneGeometry segments + 1', () => {
    expect(C.HEIGHTMAP_RES).toBe(129)
  })

  it('camera values are sensible', () => {
    expect(C.CAMERA_HEIGHT).toBeGreaterThan(0)
    expect(C.CAMERA_DISTANCE).toBeGreaterThan(0)
    expect(C.CAMERA_LERP).toBeGreaterThan(0)
    expect(C.CAMERA_LERP).toBeLessThan(1)
  })

  it('BOUNCE_FACTOR is negative', () => {
    expect(C.BOUNCE_FACTOR).toBeLessThan(0)
  })
})
