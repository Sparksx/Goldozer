import * as THREE from 'three'
import { getTerrainHeight } from './world.js'
import { t } from './i18n.js'
import { getResourceTypes } from './resources.js'

// ─── Building Definitions ───────────────────────────

const BUILDING_DEFS = [
  {
    id: 'maison',
    name: 'maison',
    zone: 1,
    position: { x: 30, z: -20 },
    cost: { terre: 10 },
    effect: { type: 'sellBonus', resource: 'terre', bonus: 0.05 },
  },
  {
    id: 'entrepot',
    name: 'entrepot',
    zone: 1,
    position: { x: -35, z: 10 },
    cost: { terre: 15, pierre: 10 },
    effect: { type: 'capacityBonus', bonus: 10 },
  },
  {
    id: 'marche',
    name: 'marche',
    zone: 1,
    position: { x: 40, z: 30 },
    cost: { pierre: 20 },
    effect: { type: 'dynamicPrices' },
  },
  {
    id: 'scierie',
    name: 'scierie',
    zone: 1,
    position: { x: -25, z: -40 },
    cost: { bois: 10, pierre: 10 },
    effect: { type: 'transformBonus', resource: 'bois', multiplier: 1.5 },
  },
]

let buildingsState = null
let buildingMeshes = {}

export function createBuildingsState(saved = null) {
  buildingsState = BUILDING_DEFS.map(def => {
    const savedBuilding = saved?.buildings?.find(b => b.id === def.id)
    return {
      id: def.id,
      name: def.name,
      zone: def.zone,
      position: { ...def.position },
      cost: { ...def.cost },
      effect: { ...def.effect },
      delivered: savedBuilding?.delivered || {},
      built: savedBuilding?.built || false,
    }
  })
  return buildingsState
}

export function getBuildingsState() {
  return buildingsState
}

export function getBuildingById(id) {
  return buildingsState?.find(b => b.id === id) || null
}

export function deliverToBuilding(buildingId, resourceType, amount) {
  const building = getBuildingById(buildingId)
  if (!building || building.built) return 0

  const required = building.cost[resourceType]
  if (!required) return 0

  const current = building.delivered[resourceType] || 0
  const remaining = required - current
  const toDeliver = Math.min(amount, remaining)

  building.delivered[resourceType] = current + toDeliver

  // Check if fully built
  let allDone = true
  for (const [res, needed] of Object.entries(building.cost)) {
    if ((building.delivered[res] || 0) < needed) {
      allDone = false
      break
    }
  }
  if (allDone) {
    building.built = true
  }

  return toDeliver
}

export function getBuildingProgress(buildingId) {
  const building = getBuildingById(buildingId)
  if (!building) return null
  return {
    cost: building.cost,
    delivered: building.delivered,
    built: building.built,
  }
}

export function getBuildingSaveData() {
  if (!buildingsState) return []
  return buildingsState.map(b => ({
    id: b.id,
    delivered: { ...b.delivered },
    built: b.built,
  }))
}

// ─── Building Effects ───────────────────────────────

export function getSellPriceMultiplier(resourceType) {
  if (!buildingsState) return 1
  let mult = 1
  for (const b of buildingsState) {
    if (!b.built) continue
    if (b.effect.type === 'sellBonus' && b.effect.resource === resourceType) {
      mult += b.effect.bonus
    }
    if (b.effect.type === 'transformBonus' && b.effect.resource === resourceType) {
      mult *= b.effect.multiplier
    }
  }
  return mult
}

export function getCapacityBonus() {
  if (!buildingsState) return 0
  let bonus = 0
  for (const b of buildingsState) {
    if (!b.built) continue
    if (b.effect.type === 'capacityBonus') {
      bonus += b.effect.bonus
    }
  }
  return bonus
}

export function hasDynamicPrices() {
  if (!buildingsState) return false
  return buildingsState.some(b => b.built && b.effect.type === 'dynamicPrices')
}

// ─── Building 3D Models ─────────────────────────────

export function createBuildingPlots(scene) {
  buildingMeshes = {}

  for (const building of buildingsState) {
    if (building.built) {
      buildingMeshes[building.id] = createBuiltBuilding(scene, building)
    } else {
      buildingMeshes[building.id] = createEmptyPlot(scene, building)
    }
  }

  return buildingMeshes
}

export function upgradePlotToBuilding(scene, buildingId) {
  const building = getBuildingById(buildingId)
  if (!building) return

  // Remove old plot
  const oldMesh = buildingMeshes[buildingId]
  if (oldMesh) {
    scene.remove(oldMesh)
    oldMesh.traverse(child => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) child.material.dispose()
    })
  }

  // Create built building
  buildingMeshes[buildingId] = createBuiltBuilding(scene, building)
}

function createEmptyPlot(scene, building) {
  const group = new THREE.Group()

  // Ground outline (dashed square)
  const outlineGeo = new THREE.RingGeometry(4, 4.3, 4)
  const outlineMat = new THREE.MeshBasicMaterial({
    color: 0xFFD700,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.4,
  })
  const outline = new THREE.Mesh(outlineGeo, outlineMat)
  outline.rotation.x = -Math.PI / 2
  outline.rotation.z = Math.PI / 4
  outline.position.y = 0.04
  group.add(outline)

  // Corner posts
  const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 6)
  const postMat = new THREE.MeshLambertMaterial({ color: 0xDDA520 })
  const offsets = [[-3, -3], [3, -3], [3, 3], [-3, 3]]
  offsets.forEach(([ox, oz]) => {
    const post = new THREE.Mesh(postGeo, postMat)
    post.position.set(ox, 0.75, oz)
    post.castShadow = true
    group.add(post)
  })

  // Small info sign
  const signGeo = new THREE.BoxGeometry(2, 1, 0.15)
  const signMat = new THREE.MeshLambertMaterial({ color: 0xCC8800 })
  const sign = new THREE.Mesh(signGeo, signMat)
  sign.position.set(0, 2, -3)
  sign.castShadow = true
  group.add(sign)

  // Floating 3D marker with building name and required resources
  const marker = createBuildingMarker(building)
  marker.position.y = 8
  group.add(marker)

  const terrainY = getTerrainHeight(building.position.x, building.position.z)
  group.position.set(building.position.x, terrainY, building.position.z)
  group.userData = { type: 'buildingPlot', buildingId: building.id }
  scene.add(group)
  return group
}

function createBuildingMarker(building) {
  const group = new THREE.Group()
  const resTypes = getResourceTypes()

  // Build label text
  const name = t(building.name)
  const costLines = []
  for (const [res, amount] of Object.entries(building.cost)) {
    const delivered = building.delivered[res] || 0
    const emoji = resTypes[res]?.emoji || ''
    costLines.push(`${emoji} ${t(res)} ${delivered}/${amount}`)
  }

  // Create canvas texture for the label
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 512
  canvas.height = 256

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  roundRect(ctx, 10, 10, 492, 236, 20)
  ctx.fill()

  // Border
  ctx.strokeStyle = '#FFD700'
  ctx.lineWidth = 4
  roundRect(ctx, 10, 10, 492, 236, 20)
  ctx.stroke()

  // Title
  ctx.fillStyle = '#FFD700'
  ctx.font = 'bold 48px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(name, 256, 70)

  // Divider line
  ctx.strokeStyle = '#FFD70088'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(60, 90)
  ctx.lineTo(452, 90)
  ctx.stroke()

  // Resource costs
  ctx.font = '36px Arial'
  ctx.fillStyle = '#FFFFFF'
  costLines.forEach((line, i) => {
    ctx.fillText(line, 256, 135 + i * 45)
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true

  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  })
  const sprite = new THREE.Sprite(spriteMat)
  sprite.scale.set(8, 4, 1)
  group.add(sprite)

  // Arrow pointing down
  const arrowGeo = new THREE.ConeGeometry(0.4, 1.2, 4)
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 })
  const arrow = new THREE.Mesh(arrowGeo, arrowMat)
  arrow.rotation.x = Math.PI
  arrow.position.y = -2.5
  group.add(arrow)

  // Vertical pole from arrow to ground
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 4.5, 4)
  const poleMat = new THREE.MeshBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 0.5 })
  const pole = new THREE.Mesh(poleGeo, poleMat)
  pole.position.y = -5
  group.add(pole)

  return group
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function createBuiltBuilding(scene, building) {
  const group = new THREE.Group()

  switch (building.id) {
    case 'maison':
      createMaisonModel(group)
      break
    case 'entrepot':
      createEntrepotModel(group)
      break
    case 'marche':
      createMarcheModel(group)
      break
    case 'scierie':
      createScierieModel(group)
      break
  }

  const terrainY = getTerrainHeight(building.position.x, building.position.z)
  group.position.set(building.position.x, terrainY, building.position.z)
  group.userData = { type: 'building', buildingId: building.id }
  scene.add(group)
  return group
}

function createMaisonModel(group) {
  // Simple house
  const wallGeo = new THREE.BoxGeometry(5, 3, 5)
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xE8C89A })
  const walls = new THREE.Mesh(wallGeo, wallMat)
  walls.position.y = 1.5
  walls.castShadow = true
  group.add(walls)

  // Roof
  const roofGeo = new THREE.ConeGeometry(4.2, 2.5, 4)
  const roofMat = new THREE.MeshLambertMaterial({ color: 0xCC4444 })
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.y = 4.25
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true
  group.add(roof)

  // Door
  const doorGeo = new THREE.BoxGeometry(1, 2, 0.1)
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x6B3A1F })
  const door = new THREE.Mesh(doorGeo, doorMat)
  door.position.set(0, 1, 2.55)
  group.add(door)

  // Window
  const winGeo = new THREE.BoxGeometry(1, 0.8, 0.1)
  const winMat = new THREE.MeshLambertMaterial({ color: 0x88CCFF })
  const win = new THREE.Mesh(winGeo, winMat)
  win.position.set(1.8, 2, 2.55)
  group.add(win)
}

function createEntrepotModel(group) {
  // Warehouse/storage building
  const wallGeo = new THREE.BoxGeometry(7, 4, 6)
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x8B8B8B })
  const walls = new THREE.Mesh(wallGeo, wallMat)
  walls.position.y = 2
  walls.castShadow = true
  group.add(walls)

  // Roof (flat with slight angle)
  const roofGeo = new THREE.BoxGeometry(7.5, 0.4, 6.5)
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x555555 })
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.y = 4.2
  roof.castShadow = true
  group.add(roof)

  // Large door
  const doorGeo = new THREE.BoxGeometry(3, 3.5, 0.1)
  const doorMat = new THREE.MeshLambertMaterial({ color: 0xDDA520 })
  const door = new THREE.Mesh(doorGeo, doorMat)
  door.position.set(0, 1.75, 3.05)
  group.add(door)
}

function createMarcheModel(group) {
  // Market stall with canopy
  const platformGeo = new THREE.BoxGeometry(6, 0.3, 5)
  const platformMat = new THREE.MeshLambertMaterial({ color: 0xC4A265 })
  const platform = new THREE.Mesh(platformGeo, platformMat)
  platform.position.y = 0.15
  platform.castShadow = true
  group.add(platform)

  // Counter
  const counterGeo = new THREE.BoxGeometry(5, 1.2, 1)
  const counterMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 })
  const counter = new THREE.Mesh(counterGeo, counterMat)
  counter.position.set(0, 0.9, 0)
  counter.castShadow = true
  group.add(counter)

  // Canopy poles
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x6B4914 })
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.5, 6)
  const positions = [[-2.5, -2], [2.5, -2], [-2.5, 2], [2.5, 2]]
  positions.forEach(([px, pz]) => {
    const pole = new THREE.Mesh(poleGeo, poleMat)
    pole.position.set(px, 1.75, pz)
    pole.castShadow = true
    group.add(pole)
  })

  // Canopy roof (colorful)
  const canopyGeo = new THREE.BoxGeometry(6, 0.2, 5)
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0xE07050 })
  const canopy = new THREE.Mesh(canopyGeo, canopyMat)
  canopy.position.y = 3.5
  canopy.castShadow = true
  group.add(canopy)
}

function createScierieModel(group) {
  // Sawmill building
  const wallGeo = new THREE.BoxGeometry(6, 3.5, 5)
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x7B4F2E })
  const walls = new THREE.Mesh(wallGeo, wallMat)
  walls.position.y = 1.75
  walls.castShadow = true
  group.add(walls)

  // Angled roof
  const roofGeo = new THREE.BoxGeometry(6.5, 0.3, 5.5)
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x4A3520 })
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.y = 3.65
  roof.rotation.z = 0.1
  roof.castShadow = true
  group.add(roof)

  // Smoke stack
  const stackGeo = new THREE.CylinderGeometry(0.3, 0.4, 2, 6)
  const stackMat = new THREE.MeshLambertMaterial({ color: 0x555555 })
  const stack = new THREE.Mesh(stackGeo, stackMat)
  stack.position.set(2, 4.5, 0)
  stack.castShadow = true
  group.add(stack)

  // Log pile
  const logMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 })
  for (let i = 0; i < 4; i++) {
    const logGeo = new THREE.CylinderGeometry(0.25, 0.25, 2.5, 6)
    const log = new THREE.Mesh(logGeo, logMat)
    log.rotation.z = Math.PI / 2
    log.position.set(-4, 0.3 + i * 0.5, -1 + i * 0.3)
    group.add(log)
  }
}

// ─── Nearby Building Detection ──────────────────────

export function getNearbyBuildingPlot(bx, bz, radius) {
  if (!buildingsState) return null

  for (const building of buildingsState) {
    if (building.built) continue

    const dx = building.position.x - bx
    const dz = building.position.z - bz
    if (Math.sqrt(dx * dx + dz * dz) < radius) {
      // Find the next needed resource
      let neededResource = null
      for (const [res, needed] of Object.entries(building.cost)) {
        const current = building.delivered[res] || 0
        if (current < needed) {
          neededResource = res
          break
        }
      }
      return {
        buildingId: building.id,
        name: building.name,
        cost: building.cost,
        delivered: building.delivered,
        neededResource,
        type: 'building',
      }
    }
  }

  return null
}
