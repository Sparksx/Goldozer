import * as THREE from 'three'
import { getTerrainHeight, getCityCenter, getCityRadius } from './world.js'

const BASE_COLLECT_RADIUS = 4

// ─── Resource Type Definitions (nugget style) ───────

const RESOURCE_TYPES = {
  terre: {
    colors: [0xD4A04A, 0xC99530, 0xE0B05E, 0xBF8720],
    emissive: 0x6B4A10,
    value: 1,
    emoji: '🟤',
  },
  pierre: {
    colors: [0x7090B0, 0x6080A0, 0x8098B8, 0x5878A0],
    emissive: 0x304060,
    value: 3,
    emoji: '🪨',
  },
  bois: {
    colors: [0x8BC34A, 0x7CB342, 0x9CCC65, 0x6FA038],
    emissive: 0x3D6B1E,
    value: 2,
    emoji: '🪵',
  },
}

export function getResourceTypes() {
  return RESOURCE_TYPES
}

export function getResourceValue(type) {
  return RESOURCE_TYPES[type]?.value || 1
}

// ─── Resource Mountains (large static clusters) ─────

const RESOURCE_MOUNTAINS = [
  // Zone 1 (terre)
  { x: 0, z: -300, name: 'Montagne Sud', zone: 1 },
  { x: -200, z: -200, name: 'Montagne Sud-Ouest', zone: 1 },
  { x: 200, z: -100, name: 'Montagne Est', zone: 1 },
  { x: -250, z: -50, name: 'Montagne Ouest', zone: 1 },
  // Zone 2 (pierre)
  { x: 150, z: 150, name: 'Carriere Est', zone: 2 },
  { x: -150, z: 180, name: 'Carriere Ouest', zone: 2 },
  { x: 0, z: 220, name: 'Carriere Centre', zone: 2 },
  // Zone 3 (bois)
  { x: 0, z: 330, name: 'Foret Nord', zone: 3 },
  { x: -120, z: 300, name: 'Foret Ouest', zone: 3 },
  { x: 120, z: 360, name: 'Foret Est', zone: 3 },
]

const MOUNTAIN_RESOURCE_COUNT = 40
const MOUNTAIN_RADIUS = 22

export function getResourceMountains() {
  return RESOURCE_MOUNTAINS
}

// ─── Resource Veins (respawning clusters) ───────────

const RESOURCE_VEINS = [
  // Zone 1 terre veins
  { x: -120, z: -150, type: 'terre', count: 15, radius: 14, respawnTime: 30 },
  { x: 100, z: -100, type: 'terre', count: 15, radius: 14, respawnTime: 30 },
  { x: -60, z: -280, type: 'terre', count: 15, radius: 14, respawnTime: 30 },
  { x: 180, z: -250, type: 'terre', count: 15, radius: 14, respawnTime: 30 },
  // Zone 2 pierre veins
  { x: -100, z: 140, type: 'pierre', count: 15, radius: 14, respawnTime: 45 },
  { x: 120, z: 170, type: 'pierre', count: 15, radius: 14, respawnTime: 45 },
  { x: 0, z: 210, type: 'pierre', count: 15, radius: 14, respawnTime: 45 },
  // Zone 3 bois veins
  { x: 60, z: 310, type: 'bois', count: 15, radius: 14, respawnTime: 45 },
  { x: -80, z: 340, type: 'bois', count: 15, radius: 14, respawnTime: 45 },
  { x: 0, z: 280, type: 'bois', count: 15, radius: 14, respawnTime: 45 },
]

export function getResourceVeins() {
  return RESOURCE_VEINS
}

// ─── Scattered resource counts per zone ─────────────
const ZONE1_COUNT = 400
const ZONE2_COUNT = 250
const ZONE3_COUNT = 200

// ─── City exclusion check ───────────────────────────
function isInCity(x, z) {
  const city = getCityCenter()
  const radius = getCityRadius()
  const dx = x - city.x
  const dz = z - city.z
  return Math.sqrt(dx * dx + dz * dz) < radius + 10
}

// ─── Spawn persistent resources ─────────────────────

export function spawnResources(scene, collectedIds = []) {
  const resources = []
  const seed = 12345
  let id = 0

  // Zone 1 scattered (terre) — z from -380 to 70
  for (let i = 0; i < ZONE1_COUNT; i++) {
    const rid = id++
    if (collectedIds.includes(rid)) continue

    const x = seededRandom(seed + i * 37) * 600 - 300
    const z = seededRandom(seed + i * 37 + 17) * 450 - 380

    if (Math.abs(x) < 8 && Math.abs(z) < 8) continue
    if (isInCity(x, z)) continue
    if (z > 75) continue

    const mesh = createNuggetMesh(scene, x, z, 'terre', seed + i * 37)
    if (mesh) {
      resources.push({ id: rid, mesh, collected: false, type: 'terre' })
    }
  }

  // Zone 2 scattered (pierre) — z from 95 to 245
  for (let i = 0; i < ZONE2_COUNT; i++) {
    const rid = id++
    if (collectedIds.includes(rid)) continue

    const x = seededRandom(seed + 10000 + i * 41) * 600 - 300
    const z = 95 + seededRandom(seed + 10000 + i * 41 + 17) * 150

    const mesh = createNuggetMesh(scene, x, z, 'pierre', seed + 10000 + i * 41)
    if (mesh) {
      resources.push({ id: rid, mesh, collected: false, type: 'pierre' })
    }
  }

  // Zone 3 scattered (bois) — z from 265 to 395
  for (let i = 0; i < ZONE3_COUNT; i++) {
    const rid = id++
    if (collectedIds.includes(rid)) continue

    const x = seededRandom(seed + 20000 + i * 43) * 700 - 350
    const z = 265 + seededRandom(seed + 20000 + i * 43 + 17) * 130

    const mesh = createNuggetMesh(scene, x, z, 'bois', seed + 20000 + i * 43)
    if (mesh) {
      resources.push({ id: rid, mesh, collected: false, type: 'bois' })
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

      const mesh = createNuggetMesh(scene, x, z, resType, seed + 30000 + mi * 1000 + j * 53, true)
      if (mesh) {
        resources.push({ id: rid, mesh, collected: false, type: resType })
      }
    }
  })

  return resources
}

// ─── Vein System (respawning resources) ─────────────

let veinStates = []

export function spawnVeinResources(scene) {
  veinStates = RESOURCE_VEINS.map((vein, vi) => {
    const resources = []
    const veinSeed = 50000 + vi * 1000

    for (let j = 0; j < vein.count; j++) {
      const angle = seededRandom(veinSeed + j * 53) * Math.PI * 2
      const dist = seededRandom(veinSeed + j * 53 + 7) * vein.radius
      const x = vein.x + Math.cos(angle) * dist
      const z = vein.z + Math.sin(angle) * dist

      const mesh = createNuggetMesh(scene, x, z, vein.type, veinSeed + j, true)
      if (mesh) {
        resources.push({ mesh, collected: false, type: vein.type, isVein: true })
      }
    }

    // Create vein ground marker
    createVeinMarker(scene, vein)

    return { vein, resources, respawnTimer: 0, depleted: false }
  })

  return veinStates.flatMap(vs => vs.resources)
}

export function updateVeinRespawn(delta, scene) {
  const newResources = []

  for (const vs of veinStates) {
    if (!vs.depleted) {
      // Check if all resources collected
      const allCollected = vs.resources.every(r => r.collected)
      if (allCollected && vs.resources.length > 0) {
        vs.depleted = true
        vs.respawnTimer = vs.vein.respawnTime
      }
    } else {
      vs.respawnTimer -= delta
      if (vs.respawnTimer <= 0) {
        // Respawn with new random positions
        vs.depleted = false
        vs.resources = []
        const respawnSeed = Date.now()

        for (let j = 0; j < vs.vein.count; j++) {
          const angle = Math.random() * Math.PI * 2
          const dist = Math.random() * vs.vein.radius
          const x = vs.vein.x + Math.cos(angle) * dist
          const z = vs.vein.z + Math.sin(angle) * dist

          const mesh = createNuggetMesh(scene, x, z, vs.vein.type, respawnSeed + j, true)
          if (mesh) {
            const res = { mesh, collected: false, type: vs.vein.type, isVein: true }
            vs.resources.push(res)
            newResources.push(res)
          }
        }
      }
    }
  }

  return newResources
}

// ─── Nugget Mesh Creation ───────────────────────────

function createNuggetMesh(scene, x, z, type, seed, isMountainOrVein = false) {
  const def = RESOURCE_TYPES[type]
  if (!def) return null

  // Size: larger for mountain/vein resources, bigger overall for visibility
  const baseSize = isMountainOrVein ? 0.9 : 0.7
  const size = baseSize + seededRandom(seed + 55) * (isMountainOrVein ? 0.5 : 0.4)

  // Nugget shape — icosahedron
  const geo = new THREE.IcosahedronGeometry(size, 0)

  // Random color from palette
  const colorIdx = Math.floor(seededRandom(seed + 77) * def.colors.length)
  const color = def.colors[colorIdx]

  const mat = new THREE.MeshLambertMaterial({
    color,
    emissive: def.emissive,
    emissiveIntensity: 0.4,
  })

  const mesh = new THREE.Mesh(geo, mat)
  const terrainY = getTerrainHeight(x, z)
  // Place well above terrain to ensure visibility
  mesh.position.set(x, terrainY + size * 0.9, z)
  mesh.castShadow = true

  // Random rotation for variety
  mesh.rotation.set(
    seededRandom(seed + 33) * Math.PI,
    seededRandom(seed + 44) * Math.PI,
    seededRandom(seed + 55) * Math.PI * 0.5,
  )

  scene.add(mesh)
  return mesh
}

// ─── Vein Ground Marker ─────────────────────────────

function createVeinMarker(scene, vein) {
  const def = RESOURCE_TYPES[vein.type]

  // Outer ring
  const ringGeo = new THREE.RingGeometry(vein.radius - 0.5, vein.radius + 0.5, 32)
  const ringMat = new THREE.MeshBasicMaterial({
    color: def.colors[0],
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.2,
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = -Math.PI / 2
  const terrainY = getTerrainHeight(vein.x, vein.z)
  ring.position.set(vein.x, terrainY + 0.05, vein.z)
  scene.add(ring)

  // Inner glow disc
  const discGeo = new THREE.CircleGeometry(vein.radius * 0.8, 24)
  const discMat = new THREE.MeshBasicMaterial({
    color: def.colors[0],
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.08,
  })
  const disc = new THREE.Mesh(discGeo, discMat)
  disc.rotation.x = -Math.PI / 2
  disc.position.set(vein.x, terrainY + 0.04, vein.z)
  scene.add(disc)
}

// ─── Collection ─────────────────────────────────────

export function checkCollection(resources, bulldozerPos, collectRadiusBonus, scene, maxCollect = Infinity) {
  const collectRadius = BASE_COLLECT_RADIUS + collectRadiusBonus
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
      collected.push({ id: res.id, type: res.type, isVein: res.isVein || false })
    }
  }

  return collected
}

export function getBaseCollectRadius() {
  return BASE_COLLECT_RADIUS
}

// ─── Seeded Random ──────────────────────────────────

function seededRandom(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123
  return x - Math.floor(x)
}
