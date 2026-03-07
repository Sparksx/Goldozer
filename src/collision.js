// ─── Collision System ────────────────────────────
// Handles bulldozer vs obstacles (trees, rocks, buildings)
// and bulldozer vs resources (push when bucket full)

import { getTerrainHeight } from './world.js'

const BULLDOZER_RADIUS = 2.5

// ─── Obstacle Collision ─────────────────────────

export function checkObstacleCollisions(bulldozerPos, obstacles) {
  const results = []

  for (const obs of obstacles) {
    const dx = bulldozerPos.x - obs.x
    const dz = bulldozerPos.z - obs.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    const minDist = BULLDOZER_RADIUS + obs.radius

    if (dist < minDist && dist > 0.001) {
      // Collision normal (from obstacle to bulldozer)
      const nx = dx / dist
      const nz = dz / dist
      const penetration = minDist - dist

      results.push({ nx, nz, penetration, obstacle: obs })
    }
  }

  return results
}

export function resolveObstacleCollisions(bulldozer, obstacles) {
  const pos = bulldozer.mesh.position
  const collisions = checkObstacleCollisions(pos, obstacles)

  if (collisions.length === 0) return false

  for (const col of collisions) {
    // Push bulldozer out of obstacle
    pos.x += col.nx * (col.penetration + 0.1)
    pos.z += col.nz * (col.penetration + 0.1)

    // Apply bounce: reduce velocity and add slight pushback
    const dotProduct = Math.sin(bulldozer.rotation) * col.nx + Math.cos(bulldozer.rotation) * col.nz
    if (dotProduct > 0) {
      // Moving toward obstacle, bounce back
      bulldozer.velocity *= -0.3
    }
  }

  return true
}

// ─── Resource Pushing ───────────────────────────

const PUSH_RADIUS = 3.5
const PUSH_STRENGTH = 12

export function pushResources(resources, bulldozerPos, bulldozerRotation, bulldozerVelocity, delta) {
  if (Math.abs(bulldozerVelocity) < 0.5) return

  const pushDirX = Math.sin(bulldozerRotation) * Math.sign(bulldozerVelocity)
  const pushDirZ = Math.cos(bulldozerRotation) * Math.sign(bulldozerVelocity)

  for (const res of resources) {
    if (res.collected) continue

    const dx = res.mesh.position.x - bulldozerPos.x
    const dz = res.mesh.position.z - bulldozerPos.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist < PUSH_RADIUS && dist > 0.001) {
      // Push in bulldozer's forward direction + slight spread from center
      const spreadX = dx / dist * 0.3
      const spreadZ = dz / dist * 0.3
      const speed = Math.min(Math.abs(bulldozerVelocity), PUSH_STRENGTH)

      res.mesh.position.x += (pushDirX + spreadX) * speed * delta
      res.mesh.position.z += (pushDirZ + spreadZ) * speed * delta

      // Recalculate elevation for new position
      const terrainY = getTerrainHeight(res.mesh.position.x, res.mesh.position.z)
      const nuggetSize = res.mesh.geometry?.parameters?.radius || 0.8
      res.mesh.position.y = terrainY + nuggetSize * 0.9

      // Roll effect: rotate the nugget
      res.mesh.rotation.x += delta * speed * 2
      res.mesh.rotation.z += delta * speed * 1.5
    }
  }
}

export function getBulldozerRadius() {
  return BULLDOZER_RADIUS
}
