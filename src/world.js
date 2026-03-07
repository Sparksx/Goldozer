import * as THREE from 'three'
import { getResourceMountains, getResourceVeins } from './resources.js'
import { createZoneObstacles } from './zones.js'
import { createBuildingPlots, getBuildingsState } from './buildings.js'

const MAP_SIZE = 400

const CITY_CENTER = { x: 0, z: 0 }
const CITY_RADIUS = 50

const SELL_POINTS = [
  { x: 0, z: -30, name: 'Depot Central' },
]

export function getMapSize() {
  return MAP_SIZE
}

export function getSellPoints() {
  return SELL_POINTS
}

export function getCityCenter() {
  return CITY_CENTER
}

export function getCityRadius() {
  return CITY_RADIUS
}

let groundMesh = null
let groundRaycaster = null
let worldObstacles = []

export function getObstacles() {
  return worldObstacles
}

export function getTerrainHeight(x, z) {
  if (!groundMesh || !groundRaycaster) return 0
  groundRaycaster.set(
    new THREE.Vector3(x, 100, z),
    new THREE.Vector3(0, -1, 0)
  )
  const hits = groundRaycaster.intersectObject(groundMesh)
  if (hits.length > 0) {
    return hits[0].point.y
  }
  return 0
}

export function createWorld(scene) {
  const groundGeo = new THREE.PlaneGeometry(MAP_SIZE * 2, MAP_SIZE * 2, 128, 128)

  const colors = new Float32Array(groundGeo.attributes.position.count * 3)
  const vertices = groundGeo.attributes.position

  const seed = 42
  const mountains = getResourceMountains()
  const veins = getResourceVeins()

  // River z-line (must match zones.js)
  const riverZ = 255

  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i)
    const y = vertices.getY(i)
    // CRITICAL: PlaneGeometry local Y maps to -worldZ after rotation.x = -PI/2
    // So worldZ = -y. We must use worldZ for all zone/position checks.
    const wz = -y

    // Smooth terrain noise (gentle rolling hills)
    let noise = fbmNoise(x * 0.008, wz * 0.008, seed, 4) * 3
    noise += smoothNoise(x * 0.025, wz * 0.025, seed + 50) * 1

    // Add gentle mounds at resource mountain locations (wide, smooth)
    for (const mt of mountains) {
      const dx = x - mt.x
      const dz = wz - mt.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < 70) {
        const t = 1 - dist / 70
        const falloff = t * t * (3 - 2 * t) // smoothstep
        noise += falloff * 5
      }
    }

    // Add subtle bumps at vein locations (smooth)
    for (const vein of veins) {
      const dx = x - vein.x
      const dz = wz - vein.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < 30) {
        const t = 1 - dist / 30
        const falloff = t * t * (3 - 2 * t) // smoothstep
        noise += falloff * 2
      }
    }

    // Zone 2 hills (90 < z < 250) — smooth rolling hills
    if (wz > 90 && wz < 250) {
      // Smooth entry/exit from zone 2
      let zoneBlend = 1
      if (wz < 120) zoneBlend = (wz - 90) / 30
      if (wz > 220) zoneBlend = (250 - wz) / 30
      zoneBlend = Math.max(0, Math.min(1, zoneBlend))
      zoneBlend = zoneBlend * zoneBlend * (3 - 2 * zoneBlend)

      const hillNoise = fbmNoise(x * 0.015, wz * 0.015, seed + 100, 3) * 6
        + smoothNoise(x * 0.04, wz * 0.04, seed + 150) * 2
      noise += hillNoise * zoneBlend
    }

    // Zone 3 forest floor (z > 260) — gentle undulations
    if (wz > 260) {
      let zoneBlend = 1
      if (wz < 280) zoneBlend = (wz - 260) / 20
      zoneBlend = Math.max(0, Math.min(1, zoneBlend))
      zoneBlend = zoneBlend * zoneBlend * (3 - 2 * zoneBlend)

      noise += fbmNoise(x * 0.012, wz * 0.012, seed + 200, 3) * 2.5 * zoneBlend
    }

    // Flatten city area (smooth falloff)
    const cityDist = Math.sqrt(
      (x - CITY_CENTER.x) ** 2 + (wz - CITY_CENTER.z) ** 2
    )
    if (cityDist < CITY_RADIUS * 1.5) {
      const t = Math.max(0, 1 - cityDist / (CITY_RADIUS * 1.5))
      const flattenFactor = t * t * (3 - 2 * t) // smoothstep
      noise *= (1 - flattenFactor)
    }

    // Flatten river area
    const riverDist = Math.abs(wz - riverZ)
    if (riverDist < 12) {
      const t = 1 - riverDist / 12
      const flattenFactor = t * t
      noise *= (1 - flattenFactor * 0.9)
    }

    vertices.setZ(i, noise)

    // Zone-based ground color
    let r, g, b

    // City area - sandy/dirt color
    if (cityDist < CITY_RADIUS) {
      r = 0.60; g = 0.56; b = 0.40
    } else if (wz > 260) {
      // Zone 3 - Forest: darker green
      r = 0.28; g = 0.48; b = 0.23
    } else if (wz > 85) {
      // Zone 2 - Hills: brownish-green
      r = 0.48; g = 0.56; b = 0.30
    } else {
      // Zone 1 - Plains: bright green
      r = 0.47; g = 0.75; b = 0.36
    }

    // City edge blending
    if (cityDist >= CITY_RADIUS && cityDist < CITY_RADIUS * 1.5) {
      const blend = (cityDist - CITY_RADIUS) / (CITY_RADIUS * 0.5)
      const cityR = 0.60, cityG = 0.56, cityB = 0.40
      r = cityR + (r - cityR) * blend
      g = cityG + (g - cityG) * blend
      b = cityB + (b - cityB) * blend
    }

    // Add slight variation
    const variation = seededRandom(seed + i * 7) * 0.06 - 0.03
    colors[i * 3] = r + variation
    colors[i * 3 + 1] = g + variation
    colors[i * 3 + 2] = b + variation
  }

  groundGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  groundGeo.computeVertexNormals()

  const groundMat = new THREE.MeshLambertMaterial({ vertexColors: true })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // CRITICAL: force world matrix update so raycaster accounts for rotation
  ground.updateMatrixWorld(true)

  groundMesh = ground
  groundRaycaster = new THREE.Raycaster()
  worldObstacles = []

  // City roads
  createCityRoads(scene)

  // Dirt paths in Zone 1 (avoid city)
  for (let i = 0; i < 15; i++) {
    const px = seededRandom(seed + i * 100) * 500 - 250
    const pz = seededRandom(seed + i * 100 + 50) * 300 - 350
    if (Math.sqrt(px * px + pz * pz) < CITY_RADIUS + 15) continue
    const size = 10 + seededRandom(seed + i * 100 + 25) * 15
    const patchGeo = new THREE.CircleGeometry(size, 6)
    const patchMat = new THREE.MeshLambertMaterial({ color: 0xc9a96e })
    const patch = new THREE.Mesh(patchGeo, patchMat)
    patch.rotation.x = -Math.PI / 2
    const patchY = getTerrainHeight(px, pz)
    patch.position.set(px, patchY + 0.02, pz)
    scene.add(patch)
  }

  // Trees - Zone 1 (sparse, avoid city and main road)
  for (let i = 0; i < 50; i++) {
    const tx = seededRandom(seed + i * 200) * 600 - 300
    const tz = seededRandom(seed + i * 200 + 100) * 400 - 380
    if (Math.sqrt(tx * tx + tz * tz) < CITY_RADIUS + 15) continue
    if (tz > 80) continue
    if (SELL_POINTS.some(sp => Math.hypot(sp.x - tx, sp.z - tz) < 12)) continue
    if (isOnMainRoad(tx, tz)) continue
    createTree(scene, tx, tz, seed + i)
  }

  // Trees - Zone 2
  for (let i = 0; i < 30; i++) {
    const tx = seededRandom(seed + 5000 + i * 200) * 600 - 300
    const tz = 95 + seededRandom(seed + 5000 + i * 200 + 100) * 150
    createTree(scene, tx, tz, seed + 5000 + i)
  }

  // Trees - Zone 3 (dense forest)
  for (let i = 0; i < 100; i++) {
    const tx = seededRandom(seed + 8000 + i * 200) * 700 - 350
    const tz = 265 + seededRandom(seed + 8000 + i * 200 + 100) * 130
    createTree(scene, tx, tz, seed + 8000 + i, true)
  }

  // Rocks - Zone 1
  for (let i = 0; i < 20; i++) {
    const rx = seededRandom(seed + i * 300) * 600 - 300
    const rz = seededRandom(seed + i * 300 + 150) * 400 - 380
    if (Math.sqrt(rx * rx + rz * rz) < CITY_RADIUS + 10) continue
    if (rz > 80) continue
    createRock(scene, rx, rz, seed + i)
  }

  // Rocks - Zone 2
  for (let i = 0; i < 25; i++) {
    const rx = seededRandom(seed + 6000 + i * 300) * 600 - 300
    const rz = 95 + seededRandom(seed + 6000 + i * 300 + 150) * 150
    createRock(scene, rx, rz, seed + 6000 + i)
  }

  // Rocks - Zone 3
  for (let i = 0; i < 15; i++) {
    const rx = seededRandom(seed + 9000 + i * 300) * 700 - 350
    const rz = 265 + seededRandom(seed + 9000 + i * 300 + 150) * 130
    createRock(scene, rx, rz, seed + 9000 + i)
  }

  // Sell points
  const sellPointMeshes = []
  SELL_POINTS.forEach((sp) => {
    const mesh = createSellPoint(scene, sp.x, sp.z)
    sellPointMeshes.push({ ...sp, mesh })
  })

  // Map border fences
  createBorders(scene)

  // Zone obstacles (rockslide, river)
  createZoneObstacles(scene)

  // Building plots
  createBuildingPlots(scene)

  // Register building obstacles (use building size for radius)
  const buildings = getBuildingsState()
  if (buildings) {
    for (const b of buildings) {
      const bSize = b.size || { w: 8, d: 8 }
      const radius = Math.max(bSize.w, bSize.d) / 2 + 1
      worldObstacles.push({ x: b.position.x, z: b.position.z, radius, type: 'building' })
    }
  }

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.65)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xfff0d0, 0.9)
  dirLight.position.set(80, 120, 50)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 2048
  dirLight.shadow.mapSize.height = 2048
  dirLight.shadow.camera.near = 0.5
  dirLight.shadow.camera.far = 500
  dirLight.shadow.camera.left = -250
  dirLight.shadow.camera.right = 250
  dirLight.shadow.camera.top = 250
  dirLight.shadow.camera.bottom = -250
  scene.add(dirLight)

  // Sky
  scene.background = new THREE.Color(0x8dd8f8)
  scene.fog = new THREE.Fog(0x8dd8f8, 200, 550)

  return { sellPointMeshes }
}

// Check if position is on the main road artery
export function isOnMainRoad(x, z) {
  // Main NS artery: x in [-9, 9], z in [-85, 115]
  if (Math.abs(x) < 10 && z > -85 && z < 115) return true
  // EW cross road: z in [-5, 5], x in [-52, 52]
  if (Math.abs(z) < 5 && Math.abs(x) < 52) return true
  return false
}

// ─── City Roads ──────────────────────────────────

// Build a continuous road mesh (north-south) that drapes over terrain
function createTerrainRoadNS(scene, mat, centerX, zStart, zEnd, width, yOffset, step = 2) {
  const halfW = width / 2
  const steps = Math.ceil((zEnd - zStart) / step)
  const vCount = (steps + 1) * 2
  const positions = new Float32Array(vCount * 3)
  const indices = []

  for (let i = 0; i <= steps; i++) {
    const z = zStart + Math.min(i * step, zEnd - zStart)
    const xL = centerX - halfW
    const xR = centerX + halfW
    const yL = getTerrainHeight(xL, z) + yOffset
    const yR = getTerrainHeight(xR, z) + yOffset
    const base = i * 2
    positions[base * 3] = xL
    positions[base * 3 + 1] = yL
    positions[base * 3 + 2] = z
    positions[(base + 1) * 3] = xR
    positions[(base + 1) * 3 + 1] = yR
    positions[(base + 1) * 3 + 2] = z
    if (i < steps) {
      const a = base, b = base + 1, c = base + 2, d = base + 3
      indices.push(a, c, b, b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, mat)
  scene.add(mesh)
  return mesh
}

// Build a continuous road mesh (east-west) that drapes over terrain
function createTerrainRoadEW(scene, mat, centerZ, xStart, xEnd, height, yOffset, step = 2) {
  const halfH = height / 2
  const steps = Math.ceil((xEnd - xStart) / step)
  const vCount = (steps + 1) * 2
  const positions = new Float32Array(vCount * 3)
  const indices = []

  for (let i = 0; i <= steps; i++) {
    const x = xStart + Math.min(i * step, xEnd - xStart)
    const zT = centerZ - halfH
    const zB = centerZ + halfH
    const yT = getTerrainHeight(x, zT) + yOffset
    const yB = getTerrainHeight(x, zB) + yOffset
    const base = i * 2
    positions[base * 3] = x
    positions[base * 3 + 1] = yT
    positions[base * 3 + 2] = zT
    positions[(base + 1) * 3] = x
    positions[(base + 1) * 3 + 1] = yB
    positions[(base + 1) * 3 + 2] = zB
    if (i < steps) {
      const a = base, b = base + 1, c = base + 2, d = base + 3
      indices.push(a, c, b, b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, mat)
  scene.add(mesh)
  return mesh
}

function createCityRoads(scene) {
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x555555 })
  const markMat = new THREE.MeshBasicMaterial({ color: 0xFFDD44 })
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
  const sideWalkMat = new THREE.MeshLambertMaterial({ color: 0x999999 })

  // ── Main artery (north-south, 14 units wide, z from -85 to 115) ──
  createTerrainRoadNS(scene, roadMat, 0, -85, 115, 14, 0.04)

  // Center dashed line on main artery
  for (let z = -55; z <= 85; z += 6) {
    const markGeo = new THREE.PlaneGeometry(0.25, 3)
    const mark = new THREE.Mesh(markGeo, markMat)
    mark.rotation.x = -Math.PI / 2
    mark.position.set(0, getTerrainHeight(0, z) + 0.06, z)
    scene.add(mark)
  }

  // Side lines (lane edges)
  for (let z = -55; z <= 85; z += 4) {
    const lineGeo = new THREE.PlaneGeometry(0.15, 2.5)
    const lineL = new THREE.Mesh(lineGeo, whiteMat)
    lineL.rotation.x = -Math.PI / 2
    lineL.position.set(-6, getTerrainHeight(-6, z) + 0.06, z)
    scene.add(lineL)
    const lineR = new THREE.Mesh(lineGeo, whiteMat)
    lineR.rotation.x = -Math.PI / 2
    lineR.position.set(6, getTerrainHeight(6, z) + 0.06, z)
    scene.add(lineR)
  }

  // Sidewalks along main artery
  createTerrainRoadNS(scene, sideWalkMat, -8, -85, 115, 2, 0.05)
  createTerrainRoadNS(scene, sideWalkMat, 8, -85, 115, 2, 0.05)

  // ── Cross road (east-west, 8 units tall) ──
  createTerrainRoadEW(scene, roadMat, 0, -50, 50, 8, 0.04)

  // EW center line markings (skip intersection)
  for (let x = -48; x <= 48; x += 6) {
    if (Math.abs(x) < 8) continue
    const markGeo = new THREE.PlaneGeometry(3, 0.25)
    const mark = new THREE.Mesh(markGeo, markMat)
    mark.rotation.x = -Math.PI / 2
    mark.position.set(x, getTerrainHeight(x, 0) + 0.06, 0)
    scene.add(mark)
  }

}

function createTree(scene, x, z, seed, isDense = false) {
  const group = new THREE.Group()

  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 3, 5)
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 })
  const trunk = new THREE.Mesh(trunkGeo, trunkMat)
  trunk.position.y = 1.5
  trunk.castShadow = true
  group.add(trunk)

  const scale = 0.8 + seededRandom(seed + 999) * 0.6
  const treeColors = isDense
    ? [0x2d7a3e, 0x1f6830, 0x256b38, 0x347d45]
    : [0x3dba6e, 0x5cc87a, 0x2ea854, 0x45d68a]
  const color = treeColors[Math.floor(seededRandom(seed + 888) * treeColors.length)]

  const foliageGeo1 = new THREE.ConeGeometry(2.5 * scale, 3, 6)
  const foliageMat = new THREE.MeshLambertMaterial({ color })
  const foliage1 = new THREE.Mesh(foliageGeo1, foliageMat)
  foliage1.position.y = 4
  foliage1.castShadow = true
  group.add(foliage1)

  const foliageGeo2 = new THREE.ConeGeometry(2 * scale, 2.5, 6)
  const foliage2 = new THREE.Mesh(foliageGeo2, foliageMat)
  foliage2.position.y = 5.5
  foliage2.castShadow = true
  group.add(foliage2)

  const terrainY = getTerrainHeight(x, z)
  group.position.set(x, terrainY, z)
  scene.add(group)

  worldObstacles.push({ x, z, radius: 1.2, type: 'tree' })
}

function createRock(scene, x, z, seed) {
  const size = 0.5 + seededRandom(seed + 777) * 1.5
  const geo = new THREE.DodecahedronGeometry(size, 0)
  const rockColors = [0x888888, 0x999999, 0x777777, 0xaaaaaa]
  const color = rockColors[Math.floor(seededRandom(seed + 666) * rockColors.length)]
  const mat = new THREE.MeshLambertMaterial({ color })
  const rock = new THREE.Mesh(geo, mat)
  const terrainY = getTerrainHeight(x, z)
  rock.position.set(x, terrainY + size * 0.4, z)
  rock.rotation.set(
    seededRandom(seed + 555) * Math.PI,
    seededRandom(seed + 444) * Math.PI,
    0
  )
  rock.castShadow = true
  scene.add(rock)

  worldObstacles.push({ x, z, radius: size * 0.8, type: 'rock' })
}

function createSellPoint(scene, x, z) {
  const group = new THREE.Group()

  // Building base
  const baseGeo = new THREE.BoxGeometry(5, 3.5, 5)
  const baseMat = new THREE.MeshLambertMaterial({ color: 0xe8b87a })
  const base = new THREE.Mesh(baseGeo, baseMat)
  base.position.y = 1.75
  base.castShadow = true
  group.add(base)

  // Roof
  const roofGeo = new THREE.ConeGeometry(4.5, 2, 4)
  const roofMat = new THREE.MeshLambertMaterial({ color: 0xe07050 })
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.y = 4.5
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true
  group.add(roof)

  // Sign pole
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.5, 6)
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x666666 })
  const pole = new THREE.Mesh(poleGeo, poleMat)
  pole.position.set(3.5, 1.25, 0)
  group.add(pole)

  // Dollar sign
  const signGeo = new THREE.SphereGeometry(0.5, 6, 4)
  const signMat = new THREE.MeshLambertMaterial({ color: 0xffd55a })
  const sign = new THREE.Mesh(signGeo, signMat)
  sign.position.set(3.5, 3, 0)
  group.add(sign)

  // Glow ring
  const ringGeo = new THREE.RingGeometry(6.5, 7, 20)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xfde68a,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.35,
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.05
  group.add(ring)

  const terrainY = getTerrainHeight(x, z)
  group.position.set(x, terrainY, z)
  scene.add(group)

  worldObstacles.push({ x, z, radius: 4, type: 'building' })

  return group
}

function createBorders(scene) {
  const borderMat = new THREE.MeshLambertMaterial({ color: 0xa07850 })
  const half = MAP_SIZE
  const height = 3
  const thickness = 1

  const sides = [
    { x: 0, z: -half, sx: half * 2 + thickness, sz: thickness },
    { x: 0, z: half, sx: half * 2 + thickness, sz: thickness },
    { x: -half, z: 0, sx: thickness, sz: half * 2 + thickness },
    { x: half, z: 0, sx: thickness, sz: half * 2 + thickness },
  ]

  sides.forEach(({ x, z, sx, sz }) => {
    const geo = new THREE.BoxGeometry(sx, height, sz)
    const mesh = new THREE.Mesh(geo, borderMat)
    mesh.position.set(x, height / 2, z)
    mesh.castShadow = true
    scene.add(mesh)
  })
}

// ─── Seeded Random & Smooth Noise ───────────────

function seededRandom(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123
  return x - Math.floor(x)
}

// Hash for 2D grid points — returns [0, 1]
function hash2D(ix, iy, seed) {
  return seededRandom(ix * 127.1 + iy * 311.7 + seed * 13.37)
}

// Smooth value noise with bilinear interpolation + smoothstep
function smoothNoise(x, y, seed) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy

  // Smoothstep interpolation for C1 continuity
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)

  const v00 = hash2D(ix, iy, seed)
  const v10 = hash2D(ix + 1, iy, seed)
  const v01 = hash2D(ix, iy + 1, seed)
  const v11 = hash2D(ix + 1, iy + 1, seed)

  const a = v00 + (v10 - v00) * sx
  const b = v01 + (v11 - v01) * sx
  return a + (b - a) * sy
}

// Multi-octave smooth noise (fBm)
function fbmNoise(x, y, seed, octaves = 3) {
  let value = 0
  let amplitude = 1
  let frequency = 1
  let maxValue = 0

  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * frequency, y * frequency, seed + i * 100) * amplitude
    maxValue += amplitude
    amplitude *= 0.5
    frequency *= 2
  }

  return value / maxValue
}
