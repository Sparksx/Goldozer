import * as THREE from 'three'

const BASE_COLLECT_RADIUS = 4

// ─── Resource Type Definitions ──────────────────────

const RESOURCE_TYPES = {
  terre: { color: 0xC4A265, value: 1, shape: 'sphere', emoji: '🟤' },
  pierre: { color: 0x8A8A8A, value: 3, shape: 'box', emoji: '🪨' },
  bois: { color: 0x7B4F2E, value: 2, shape: 'cylinder', emoji: '🪵' },
}

export function getResourceTypes() {
  return RESOURCE_TYPES
}

export function getResourceValue(type) {
  return RESOURCE_TYPES[type]?.value || 1
}

// ─── Zone-based resource placement ──────────────────
// Zone 1 (z < 55): terre
// Zone 2 (65 < z < 135): pierre
// Zone 3 (z > 145): bois

function getResourceTypeForPosition(z) {
  if (z > 145) return 'bois'
  if (z > 65) return 'pierre'
  return 'terre'
}

// Resource mountains per zone
const RESOURCE_MOUNTAINS = [
  // Zone 1 mountains (terre)
  { x: 0, z: -150, name: 'Montagne Sud', zone: 1 },
  { x: -130, z: -130, name: 'Montagne Sud-Ouest', zone: 1 },
  { x: 130, z: -50, name: 'Montagne Est', zone: 1 },
  { x: -150, z: 0, name: 'Montagne Ouest', zone: 1 },
  // Zone 2 mountains (pierre)
  { x: 100, z: 90, name: 'Carrière Est', zone: 2 },
  { x: -100, z: 100, name: 'Carrière Ouest', zone: 2 },
  // Zone 3 mountains (bois)
  { x: 0, z: 170, name: 'Forêt Nord', zone: 3 },
  { x: -80, z: 160, name: 'Forêt Ouest', zone: 3 },
]

const MOUNTAIN_RESOURCE_COUNT = 30
const MOUNTAIN_RADIUS = 18

export function getResourceMountains() {
  return RESOURCE_MOUNTAINS
}

// ─── Scattered resource counts per zone ─────────────
const ZONE1_COUNT = 300
const ZONE2_COUNT = 150
const ZONE3_COUNT = 100

export function spawnResources(scene, collectedIds = [], unlockedZones = [1]) {
  const resources = []
  const seed = 12345
  let id = 0

  // Zone 1 scattered resources (terre)
  for (let i = 0; i < ZONE1_COUNT; i++) {
    const rid = id++
    if (collectedIds.includes(rid)) continue

    const x = seededRandom(seed + i * 37) * 340 - 170
    const z = seededRandom(seed + i * 37 + 17) * 230 - 180 // z from -180 to 50

    // Don't spawn at center (spawn point)
    if (Math.abs(x) < 8 && Math.abs(z) < 8) continue

    const res = createResourceMesh(scene, x, z, 'terre', seed + i * 37)
    if (res) {
      resources.push({ id: rid, mesh: res, collected: false, type: 'terre' })
    }
  }

  // Zone 2 scattered resources (pierre)
  for (let i = 0; i < ZONE2_COUNT; i++) {
    const rid = id++
    if (collectedIds.includes(rid)) continue

    const x = seededRandom(seed + 10000 + i * 41) * 340 - 170
    const z = 68 + seededRandom(seed + 10000 + i * 41 + 17) * 62 // z from 68 to 130

    const res = createResourceMesh(scene, x, z, 'pierre', seed + 10000 + i * 41)
    if (res) {
      resources.push({ id: rid, mesh: res, collected: false, type: 'pierre' })
    }
  }

  // Zone 3 scattered resources (bois)
  for (let i = 0; i < ZONE3_COUNT; i++) {
    const rid = id++
    if (collectedIds.includes(rid)) continue

    const x = seededRandom(seed + 20000 + i * 43) * 340 - 170
    const z = 148 + seededRandom(seed + 20000 + i * 43 + 17) * 47 // z from 148 to 195

    const res = createResourceMesh(scene, x, z, 'bois', seed + 20000 + i * 43)
    if (res) {
      resources.push({ id: rid, mesh: res, collected: false, type: 'bois' })
    }
  }

  // Mountain clusters
  RESOURCE_MOUNTAINS.forEach((mt, mi) => {
    const resType = mt.zone === 1 ? 'terre' : mt.zone === 2 ? 'pierre' : 'bois'

    for (let j = 0; j < MOUNTAIN_RESOURCE_COUNT; j++) {
      const rid = id++
      if (collectedIds.includes(rid)) continue

      const angle = seededRandom(seed + 30000 + mi * 1000 + j * 53) * Math.PI * 2
      const dist = seededRandom(seed + 30000 + mi * 1000 + j * 53 + 7) * MOUNTAIN_RADIUS
      const x = mt.x + Math.cos(angle) * dist
      const z = mt.z + Math.sin(angle) * dist

      const res = createResourceMesh(scene, x, z, resType, seed + 30000 + mi * 1000 + j * 53, true)
      if (res) {
        resources.push({ id: rid, mesh: res, collected: false, type: resType })
      }
    }
  })

  return resources
}

function createResourceMesh(scene, x, z, type, seed, isMountain = false) {
  const def = RESOURCE_TYPES[type]
  if (!def) return null

  const baseSize = isMountain ? 0.5 : 0.4
  const size = baseSize + seededRandom(seed + 55) * (isMountain ? 0.5 : 0.4)

  let geo
  switch (def.shape) {
    case 'sphere':
      geo = new THREE.SphereGeometry(size, 5, 4)
      break
    case 'box':
      geo = new THREE.BoxGeometry(size * 1.5, size, size * 1.2)
      break
    case 'cylinder':
      geo = new THREE.CylinderGeometry(size * 0.3, size * 0.35, size * 2, 6)
      break
    default:
      geo = new THREE.SphereGeometry(size, 5, 4)
  }

  const mat = new THREE.MeshLambertMaterial({ color: def.color })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, size * 0.5, z)
  mesh.castShadow = true
  mesh.rotation.y = seededRandom(seed + 33) * Math.PI * 2

  if (type === 'bois') {
    // Logs lie on their side
    mesh.rotation.z = Math.PI / 2
    mesh.position.y = size * 0.35
  }

  scene.add(mesh)
  return mesh
}

export function checkCollection(resources, bulldozerPos, upgrades, scene, maxCollect = Infinity) {
  const collectRadius = BASE_COLLECT_RADIUS + upgrades.collectRadius * 1.5
  const collected = []

  for (let i = resources.length - 1; i >= 0; i--) {
    if (collected.length >= maxCollect) break

    const res = resources[i]
    if (res.collected) continue

    const dx = res.mesh.position.x - bulldozerPos.x
    const dz = res.mesh.position.z - bulldozerPos.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist < collectRadius) {
      res.collected = true
      scene.remove(res.mesh)
      if (res.mesh.geometry) res.mesh.geometry.dispose()
      if (res.mesh.material) res.mesh.material.dispose()
      collected.push({ id: res.id, type: res.type })
    }
  }

  return collected
}

export function getBaseCollectRadius() {
  return BASE_COLLECT_RADIUS
}

function seededRandom(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123
  return x - Math.floor(x)
}
