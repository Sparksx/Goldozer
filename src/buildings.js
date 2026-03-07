import * as THREE from 'three'
import { getTerrainHeight } from './world.js'
import { t } from './i18n.js'
import { getResourceTypes } from './resources.js'

// ─── Building Definitions ───────────────────────────
// Buildings along the main road (x=0 axis), placed on left/right sides
// Main road goes north (positive z) toward zones 2/3

const BUILDING_DEFS = [
  // === Functional buildings (upgrade via construction) ===
  // fullCost defines all resource amounts; resources unlock progressively:
  //   level 0→1: terre only
  //   level 1→2: terre + pierre
  //   level 2+:  terre + pierre + bois
  {
    id: 'entrepot',
    name: 'entrepot',
    zone: 1,
    position: { x: -22, z: -15 },
    fullCost: { terre: 15, pierre: 10, bois: 8 },
    effect: { type: 'capacityBonus', bonus: 10 },
    maxLevel: 5,
    costScale: 1.6,
    size: { w: 10, d: 8 },
  },
  {
    id: 'stationService',
    name: 'stationService',
    zone: 1,
    position: { x: 22, z: -15 },
    fullCost: { terre: 15, pierre: 10, bois: 8 },
    effect: { type: 'speedBonus', bonus: 1 },
    maxLevel: 5,
    costScale: 1.7,
    size: { w: 14, d: 10 },
  },
  {
    id: 'marche',
    name: 'marche',
    zone: 1,
    position: { x: -22, z: 15 },
    fullCost: { terre: 15, pierre: 12, bois: 10 },
    effect: { type: 'sellBonus', bonus: 0.1 },
    maxLevel: 5,
    costScale: 1.8,
    size: { w: 8, d: 8 },
  },
  {
    id: 'magasinEquipement',
    name: 'magasinEquipement',
    zone: 1,
    position: { x: 22, z: 15 },
    fullCost: { terre: 15, pierre: 10, bois: 8 },
    effect: { type: 'collectRadiusBonus', bonus: 1.5 },
    maxLevel: 5,
    costScale: 1.6,
    size: { w: 8, d: 7 },
  },
  // === Concession (large, WIP for future vehicles) ===
  {
    id: 'concession',
    name: 'concession',
    zone: 1,
    position: { x: -30, z: 40 },
    fullCost: { terre: 30, pierre: 20, bois: 15 },
    effect: { type: 'wip' },
    wip: true,
    size: { w: 18, d: 14 },
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
      baseCost: { ...def.fullCost },
      cost: scaleCost(def.fullCost, savedBuilding?.level || 0, def.costScale || 1.6),
      effect: { ...def.effect },
      wip: def.wip || false,
      maxLevel: def.maxLevel || 1,
      costScale: def.costScale || 1.6,
      delivered: savedBuilding?.delivered || {},
      built: savedBuilding?.built || false,
      level: savedBuilding?.level || 0,
      size: def.size || { w: 8, d: 8 },
    }
  })
  return buildingsState
}

// Progressive cost: level 0→1 terre only, 1→2 terre+pierre, 2+ all three
function scaleCost(fullCost, level, scale) {
  const result = {}
  const resourceOrder = ['terre', 'pierre', 'bois']
  // Determine which resources are unlocked at this level
  // level 0 (building to level 1): terre only
  // level 1 (building to level 2): terre + pierre
  // level 2+ (building to level 3+): terre + pierre + bois
  const unlockedCount = Math.min(level + 1, 3)

  for (let i = 0; i < unlockedCount; i++) {
    const res = resourceOrder[i]
    if (fullCost[res]) {
      result[res] = Math.floor(fullCost[res] * Math.pow(scale, level))
    }
  }
  return result
}

export function getBuildingsState() {
  return buildingsState
}

export function getBuildingById(id) {
  return buildingsState?.find(b => b.id === id) || null
}

export function deliverToBuilding(buildingId, resourceType, amount) {
  const building = getBuildingById(buildingId)
  if (!building) return 0
  if (building.wip) return 0
  // For multi-level buildings, check if at max level
  if (building.level >= building.maxLevel && building.built) return 0

  const required = building.cost[resourceType]
  if (!required) return 0

  const current = building.delivered[resourceType] || 0
  const remaining = required - current
  const toDeliver = Math.min(amount, remaining)

  building.delivered[resourceType] = current + toDeliver

  let allDone = true
  for (const [res, needed] of Object.entries(building.cost)) {
    if ((building.delivered[res] || 0) < needed) {
      allDone = false
      break
    }
  }
  if (allDone) {
    building.level++
    building.built = true
    // Reset delivered for next level and recalculate cost
    building.delivered = {}
    building.cost = scaleCost(building.baseCost, building.level, building.costScale)
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
    level: building.level,
    maxLevel: building.maxLevel,
  }
}

export function getBuildingSaveData() {
  if (!buildingsState) return []
  return buildingsState.map(b => ({
    id: b.id,
    delivered: { ...b.delivered },
    built: b.built,
    level: b.level,
  }))
}

// ─── Building Effects (used by economy.js) ──────────

export function getSellPriceMultiplier(resourceType) {
  if (!buildingsState) return 1
  let mult = 1
  for (const b of buildingsState) {
    if (b.level <= 0) continue
    if (b.effect.type === 'sellBonus') {
      mult += b.effect.bonus * b.level
    }
  }
  return mult
}

export function getCapacityBonus() {
  if (!buildingsState) return 0
  let bonus = 0
  for (const b of buildingsState) {
    if (b.level <= 0) continue
    if (b.effect.type === 'capacityBonus') {
      bonus += b.effect.bonus * b.level
    }
  }
  return bonus
}

export function getSpeedBonus() {
  if (!buildingsState) return 0
  let bonus = 0
  for (const b of buildingsState) {
    if (b.level <= 0) continue
    if (b.effect.type === 'speedBonus') {
      bonus += b.effect.bonus * b.level
    }
  }
  return bonus
}

export function getCollectRadiusBonus() {
  if (!buildingsState) return 0
  let bonus = 0
  for (const b of buildingsState) {
    if (b.level <= 0) continue
    if (b.effect.type === 'collectRadiusBonus') {
      bonus += b.effect.bonus * b.level
    }
  }
  return bonus
}

// ─── Building 3D Models ─────────────────────────────

export function createBuildingPlots(scene) {
  buildingMeshes = {}

  for (const building of buildingsState) {
    if (building.level > 0) {
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

  const oldMesh = buildingMeshes[buildingId]
  if (oldMesh) {
    scene.remove(oldMesh)
    oldMesh.traverse(child => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (child.material.map) child.material.map.dispose()
        child.material.dispose()
      }
    })
  }

  buildingMeshes[buildingId] = createBuiltBuilding(scene, building)
}

// Update the marker/pin after a delivery (fix: pins not updating)
export function refreshBuildingMarker(scene, buildingId) {
  const building = getBuildingById(buildingId)
  if (!building) return
  // Only refresh if not fully built (or upgradeable)
  if (building.level >= building.maxLevel && building.built) return

  const oldMesh = buildingMeshes[buildingId]
  if (oldMesh) {
    scene.remove(oldMesh)
    oldMesh.traverse(child => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (child.material.map) child.material.map.dispose()
        child.material.dispose()
      }
    })
  }

  if (building.level > 0) {
    buildingMeshes[buildingId] = createBuiltBuilding(scene, building)
  } else {
    buildingMeshes[buildingId] = createEmptyPlot(scene, building)
  }
}

function createEmptyPlot(scene, building) {
  const group = new THREE.Group()
  const isWip = building.wip
  const hw = building.size.w / 2
  const hd = building.size.d / 2

  const outlineColor = isWip ? 0x888888 : 0xFFD700
  const outlineGeo = new THREE.RingGeometry(Math.max(hw, hd), Math.max(hw, hd) + 0.3, 4)
  const outlineMat = new THREE.MeshBasicMaterial({
    color: outlineColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: isWip ? 0.25 : 0.4,
  })
  const outline = new THREE.Mesh(outlineGeo, outlineMat)
  outline.rotation.x = -Math.PI / 2
  outline.rotation.z = Math.PI / 4
  outline.position.y = 0.04
  group.add(outline)

  const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 6)
  const postMat = new THREE.MeshLambertMaterial({ color: isWip ? 0x666666 : 0xDDA520 })
  const offsets = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]
  offsets.forEach(([ox, oz]) => {
    const post = new THREE.Mesh(postGeo, postMat)
    post.position.set(ox, 0.75, oz)
    post.castShadow = true
    group.add(post)
  })

  const signGeo = new THREE.BoxGeometry(2, 1, 0.15)
  const signMat = new THREE.MeshLambertMaterial({ color: isWip ? 0x666666 : 0xCC8800 })
  const sign = new THREE.Mesh(signGeo, signMat)
  sign.position.set(0, 2, -hd)
  sign.castShadow = true
  group.add(sign)

  const marker = isWip ? createWipMarker(building) : createBuildingMarker(building)
  marker.position.y = 8
  group.add(marker)

  const terrainY = getTerrainHeight(building.position.x, building.position.z)
  group.position.set(building.position.x, terrainY, building.position.z)
  group.userData = { type: 'buildingPlot', buildingId: building.id }
  scene.add(group)
  return group
}

function createWipMarker(building) {
  const group = new THREE.Group()
  const name = t(building.name)

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 512
  canvas.height = 200

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  roundRect(ctx, 10, 10, 492, 180, 20)
  ctx.fill()

  ctx.strokeStyle = '#888888'
  ctx.lineWidth = 4
  roundRect(ctx, 10, 10, 492, 180, 20)
  ctx.stroke()

  ctx.fillStyle = '#AAAAAA'
  ctx.font = 'bold 42px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(name, 256, 70)

  ctx.strokeStyle = '#88888888'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(60, 85)
  ctx.lineTo(452, 85)
  ctx.stroke()

  ctx.font = 'bold 36px Arial'
  ctx.fillStyle = '#FF8C00'
  ctx.fillText(t('wipLabel'), 256, 135)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true

  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  })
  const sprite = new THREE.Sprite(spriteMat)
  sprite.scale.set(8, 3.2, 1)
  group.add(sprite)

  const arrowGeo = new THREE.ConeGeometry(0.4, 1.2, 4)
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0x888888 })
  const arrow = new THREE.Mesh(arrowGeo, arrowMat)
  arrow.rotation.x = Math.PI
  arrow.position.y = -2.5
  group.add(arrow)

  const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 4.5, 4)
  const poleMat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.5 })
  const pole = new THREE.Mesh(poleGeo, poleMat)
  pole.position.y = -5
  group.add(pole)

  return group
}

function createBuildingMarker(building) {
  const group = new THREE.Group()
  const resTypes = getResourceTypes()

  const name = t(building.name)
  const levelText = building.level > 0 ? ` (Niv.${building.level}/${building.maxLevel})` : ''
  const costLines = []
  for (const [res, amount] of Object.entries(building.cost)) {
    const delivered = building.delivered[res] || 0
    const emoji = resTypes[res]?.emoji || ''
    costLines.push(`${emoji} ${t(res)} ${delivered}/${amount}`)
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 512
  canvas.height = 280

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  roundRect(ctx, 10, 10, 492, 260, 20)
  ctx.fill()

  ctx.strokeStyle = '#FFD700'
  ctx.lineWidth = 4
  roundRect(ctx, 10, 10, 492, 260, 20)
  ctx.stroke()

  ctx.fillStyle = '#FFD700'
  ctx.font = 'bold 42px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(name + levelText, 256, 55)

  // Show effect description
  const effectText = t(`${building.name}Effect`)
  ctx.font = '26px Arial'
  ctx.fillStyle = '#88DD88'
  ctx.fillText(effectText, 256, 85)

  ctx.strokeStyle = '#FFD70088'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(60, 100)
  ctx.lineTo(452, 100)
  ctx.stroke()

  ctx.font = '34px Arial'
  ctx.fillStyle = '#FFFFFF'
  costLines.forEach((line, i) => {
    ctx.fillText(line, 256, 140 + i * 42)
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true

  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  })
  const sprite = new THREE.Sprite(spriteMat)
  sprite.scale.set(8, 4.4, 1)
  group.add(sprite)

  const arrowGeo = new THREE.ConeGeometry(0.4, 1.2, 4)
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 })
  const arrow = new THREE.Mesh(arrowGeo, arrowMat)
  arrow.rotation.x = Math.PI
  arrow.position.y = -2.8
  group.add(arrow)

  const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 4.5, 4)
  const poleMat = new THREE.MeshBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 0.5 })
  const pole = new THREE.Mesh(poleGeo, poleMat)
  pole.position.y = -5.5
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
    case 'entrepot':
      createEntrepotModel(group, building.level)
      break
    case 'stationService':
      createStationServiceModel(group, building.level)
      break
    case 'marche':
      createMarcheModel(group, building.level)
      break
    case 'magasinEquipement':
      createMagasinEquipementModel(group, building.level)
      break
    case 'concession':
      createConcessionModel(group)
      break
  }

  // Add level indicator for upgradeable buildings
  if (!building.wip && building.level < building.maxLevel) {
    const marker = createBuildingMarker(building)
    marker.position.y = 10
    group.add(marker)
  } else if (!building.wip && building.level >= building.maxLevel) {
    // Show max level badge
    const badge = createMaxBadge(building)
    badge.position.y = 8
    group.add(badge)
  }

  const terrainY = getTerrainHeight(building.position.x, building.position.z)
  group.position.set(building.position.x, terrainY, building.position.z)
  group.userData = { type: 'building', buildingId: building.id }
  scene.add(group)
  return group
}

function createMaxBadge(building) {
  const group = new THREE.Group()

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 256
  canvas.height = 100

  ctx.fillStyle = 'rgba(0, 80, 0, 0.7)'
  roundRect(ctx, 5, 5, 246, 90, 15)
  ctx.fill()

  ctx.strokeStyle = '#44FF44'
  ctx.lineWidth = 3
  roundRect(ctx, 5, 5, 246, 90, 15)
  ctx.stroke()

  ctx.fillStyle = '#44FF44'
  ctx.font = 'bold 36px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(`${t(building.name)} MAX`, 128, 60)

  const texture = new THREE.CanvasTexture(canvas)
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(spriteMat)
  sprite.scale.set(5, 2, 1)
  group.add(sprite)
  return group
}

// ─── Building Models ────────────────────────────────

function createEntrepotModel(group, level) {
  // Large warehouse - grows with level
  const scl = 1 + level * 0.15
  const wallGeo = new THREE.BoxGeometry(9 * scl, 5 * scl, 7 * scl)
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x8B8B8B })
  const walls = new THREE.Mesh(wallGeo, wallMat)
  walls.position.y = 2.5 * scl
  walls.castShadow = true
  group.add(walls)

  // Corrugated roof
  const roofGeo = new THREE.BoxGeometry(9.5 * scl, 0.4, 7.5 * scl)
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x555555 })
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.y = 5.2 * scl
  roof.castShadow = true
  group.add(roof)

  // Big rolling door
  const doorGeo = new THREE.BoxGeometry(4, 4 * scl, 0.1)
  const doorMat = new THREE.MeshLambertMaterial({ color: 0xDDA520 })
  const door = new THREE.Mesh(doorGeo, doorMat)
  door.position.set(0, 2 * scl, 3.55 * scl)
  group.add(door)

  // Side door
  const sideDoorGeo = new THREE.BoxGeometry(0.1, 2.5, 1.5)
  const sideDoor = new THREE.Mesh(sideDoorGeo, doorMat)
  sideDoor.position.set(4.55 * scl, 1.25, 0)
  group.add(sideDoor)

  // Crates inside (visible through door)
  const crateMat = new THREE.MeshLambertMaterial({ color: 0xC49A6C })
  for (let i = 0; i < Math.min(level, 4); i++) {
    const crateGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2)
    const crate = new THREE.Mesh(crateGeo, crateMat)
    crate.position.set(-2 + i * 1.5, 0.6, 2)
    group.add(crate)
  }

  // Level sign
  addLevelSign(group, level, 0xDDA520, 5 * scl + 0.5)
}

function createStationServiceModel(group, level) {
  // Gas station with multiple pumps - grows with level
  const numPumps = 2 + Math.min(level, 3)

  // Main canopy (wider for more pumps)
  const canopyW = 4 + numPumps * 2.5
  const canopyGeo = new THREE.BoxGeometry(canopyW, 0.4, 8)
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0xDD2222 })
  const canopy = new THREE.Mesh(canopyGeo, canopyMat)
  canopy.position.y = 5
  canopy.castShadow = true
  group.add(canopy)

  // White stripe on canopy
  const stripeGeo = new THREE.BoxGeometry(canopyW + 0.1, 0.42, 1)
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF })
  const stripe = new THREE.Mesh(stripeGeo, stripeMat)
  stripe.position.set(0, 5.01, 0)
  group.add(stripe)

  // Support pillars
  const pillarGeo = new THREE.CylinderGeometry(0.25, 0.25, 5, 8)
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0xCCCCCC })
  const halfW = canopyW / 2 - 1
  const pillarPositions = [[-halfW, -3], [halfW, -3], [-halfW, 3], [halfW, 3]]
  pillarPositions.forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat)
    pillar.position.set(px, 2.5, pz)
    pillar.castShadow = true
    group.add(pillar)
  })

  // Fuel pumps
  const pumpBodyGeo = new THREE.BoxGeometry(0.7, 2.2, 0.5)
  const pumpMat = new THREE.MeshLambertMaterial({ color: 0xEEEEEE })
  const pumpColors = [0xDD2222, 0x22AA22, 0x2222DD, 0xDDDD22, 0xDD22DD]
  const startX = -(numPumps - 1) * 1.5 / 2

  for (let i = 0; i < numPumps; i++) {
    const pumpGroup = new THREE.Group()
    const pump = new THREE.Mesh(pumpBodyGeo, pumpMat)
    pump.position.y = 1.1
    pump.castShadow = true
    pumpGroup.add(pump)

    // Color strip on pump
    const stripGeo = new THREE.BoxGeometry(0.72, 0.4, 0.52)
    const stripMat = new THREE.MeshLambertMaterial({ color: pumpColors[i % pumpColors.length] })
    const pStrip = new THREE.Mesh(stripGeo, stripMat)
    pStrip.position.y = 1.8
    pumpGroup.add(pStrip)

    // Nozzle holder
    const nozzleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6)
    const nozzleMat = new THREE.MeshLambertMaterial({ color: 0x333333 })
    const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat)
    nozzle.rotation.z = Math.PI / 4
    nozzle.position.set(0.4, 1.5, 0)
    pumpGroup.add(nozzle)

    // Base
    const baseGeo = new THREE.BoxGeometry(1, 0.2, 0.8)
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x999999 })
    const base = new THREE.Mesh(baseGeo, baseMat)
    base.position.y = 0.1
    pumpGroup.add(base)

    pumpGroup.position.set(startX + i * 2.5, 0, 0)
    group.add(pumpGroup)
  }

  // Back office building
  const officeGeo = new THREE.BoxGeometry(5, 3.5, 3)
  const officeMat = new THREE.MeshLambertMaterial({ color: 0xCCBBAA })
  const office = new THREE.Mesh(officeGeo, officeMat)
  office.position.set(0, 1.75, -5.5)
  office.castShadow = true
  group.add(office)

  // Office window
  const winGeo = new THREE.BoxGeometry(2, 1.5, 0.1)
  const winMat = new THREE.MeshLambertMaterial({ color: 0x88CCFF })
  const win = new THREE.Mesh(winGeo, winMat)
  win.position.set(0, 2, -4)
  group.add(win)

  // Office door
  const doorGeo = new THREE.BoxGeometry(1.2, 2.2, 0.1)
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x6B3A1F })
  const door = new THREE.Mesh(doorGeo, doorMat)
  door.position.set(2, 1.1, -4)
  group.add(door)

  // Concrete pad under pumps
  const padGeo = new THREE.BoxGeometry(canopyW + 2, 0.15, 10)
  const padMat = new THREE.MeshLambertMaterial({ color: 0xBBBBBB })
  const pad = new THREE.Mesh(padGeo, padMat)
  pad.position.y = 0.075
  group.add(pad)

  addLevelSign(group, level, 0xDD2222, 5.5)
}

function createMarcheModel(group, level) {
  // Open market with stalls - grows with level
  const numStalls = 1 + Math.min(level, 4)

  // Main platform
  const platformW = 4 + numStalls * 2
  const platformGeo = new THREE.BoxGeometry(platformW, 0.3, 6)
  const platformMat = new THREE.MeshLambertMaterial({ color: 0xC4A265 })
  const platform = new THREE.Mesh(platformGeo, platformMat)
  platform.position.y = 0.15
  platform.castShadow = true
  group.add(platform)

  // Stalls/counters
  const stallColors = [0xE07050, 0x50A0E0, 0x50E070, 0xE0D050, 0xA050E0]
  const startX = -(numStalls - 1) * 2.5 / 2

  for (let i = 0; i < numStalls; i++) {
    // Counter
    const counterGeo = new THREE.BoxGeometry(2, 1.2, 1)
    const counterMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 })
    const counter = new THREE.Mesh(counterGeo, counterMat)
    counter.position.set(startX + i * 2.5, 0.9, 0)
    counter.castShadow = true
    group.add(counter)

    // Awning poles
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x6B4914 })
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.5, 6)
    const pl = new THREE.Mesh(poleGeo, poleMat)
    pl.position.set(startX + i * 2.5 - 1, 1.75, -1)
    group.add(pl)
    const pr = new THREE.Mesh(poleGeo, poleMat)
    pr.position.set(startX + i * 2.5 + 1, 1.75, -1)
    group.add(pr)

    // Colored awning
    const awningGeo = new THREE.BoxGeometry(2.2, 0.1, 2)
    const awningMat = new THREE.MeshLambertMaterial({ color: stallColors[i % stallColors.length] })
    const awning = new THREE.Mesh(awningGeo, awningMat)
    awning.position.set(startX + i * 2.5, 3.5, 0)
    awning.castShadow = true
    group.add(awning)

    // Little goods on counter
    const goodGeo = new THREE.SphereGeometry(0.2, 6, 4)
    const goodMat = new THREE.MeshLambertMaterial({ color: stallColors[(i + 2) % stallColors.length] })
    for (let g = 0; g < 3; g++) {
      const good = new THREE.Mesh(goodGeo, goodMat)
      good.position.set(startX + i * 2.5 - 0.5 + g * 0.5, 1.7, 0)
      group.add(good)
    }
  }

  addLevelSign(group, level, 0xE07050, 4)
}

function createMagasinEquipementModel(group, level) {
  // Equipment shop - tools and gear store
  const scl = 1 + level * 0.1

  // Main building
  const wallGeo = new THREE.BoxGeometry(7 * scl, 3.5, 6 * scl)
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x4477AA })
  const walls = new THREE.Mesh(wallGeo, wallMat)
  walls.position.y = 1.75
  walls.castShadow = true
  group.add(walls)

  // Roof
  const roofGeo = new THREE.BoxGeometry(7.5 * scl, 0.3, 6.5 * scl)
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x335588 })
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.y = 3.65
  roof.castShadow = true
  group.add(roof)

  // Shop window
  const winGeo = new THREE.BoxGeometry(4, 2, 0.1)
  const winMat = new THREE.MeshLambertMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.6 })
  const win = new THREE.Mesh(winGeo, winMat)
  win.position.set(0, 2, 3.05 * scl)
  group.add(win)

  // Door
  const doorGeo = new THREE.BoxGeometry(1.5, 2.5, 0.1)
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x6B3A1F })
  const door = new THREE.Mesh(doorGeo, doorMat)
  door.position.set(-2.2, 1.25, 3.05 * scl)
  group.add(door)

  // Tool display outside (grows with level)
  const toolMat = new THREE.MeshLambertMaterial({ color: 0xDDA520 })
  for (let i = 0; i < Math.min(level, 3); i++) {
    // Shovel/tool racks
    const rackGeo = new THREE.BoxGeometry(0.8, 2, 0.3)
    const rack = new THREE.Mesh(rackGeo, toolMat)
    rack.position.set(3.7 * scl, 1, -1.5 + i * 1.5)
    group.add(rack)
  }

  // Sign
  const signGeo = new THREE.BoxGeometry(3, 0.8, 0.15)
  const signMat = new THREE.MeshLambertMaterial({ color: 0xFFDD44 })
  const sign = new THREE.Mesh(signGeo, signMat)
  sign.position.set(0, 4.2, 3 * scl)
  group.add(sign)

  addLevelSign(group, level, 0x4477AA, 5)
}

function createConcessionModel(group) {
  // Very large dealership with parking lot and showroom

  // Main showroom building (large with glass front)
  const wallGeo = new THREE.BoxGeometry(14, 4.5, 10)
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xD0D0D0 })
  const walls = new THREE.Mesh(wallGeo, wallMat)
  walls.position.y = 2.25
  walls.castShadow = true
  group.add(walls)

  // Glass facade
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.5 })
  const glassGeo = new THREE.BoxGeometry(12, 3.5, 0.1)
  const glass = new THREE.Mesh(glassGeo, glassMat)
  glass.position.set(0, 2.5, 5.05)
  group.add(glass)

  // Flat roof
  const roofGeo = new THREE.BoxGeometry(14.5, 0.4, 10.5)
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x444444 })
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.y = 4.7
  roof.castShadow = true
  group.add(roof)

  // Vehicles in showroom
  const vehicleColors = [0xCC3333, 0x3333CC, 0x33CC33, 0xCCCC33]
  for (let i = 0; i < 3; i++) {
    const vehicleGeo = new THREE.BoxGeometry(2, 1.2, 3.5)
    const vehicleMat = new THREE.MeshLambertMaterial({ color: vehicleColors[i] })
    const vehicle = new THREE.Mesh(vehicleGeo, vehicleMat)
    vehicle.position.set(-4 + i * 4, 0.8, 1)
    group.add(vehicle)

    // Windshield
    const windGeo = new THREE.BoxGeometry(1.6, 0.6, 0.1)
    const windMat = new THREE.MeshLambertMaterial({ color: 0x88CCFF })
    const wind = new THREE.Mesh(windGeo, windMat)
    wind.position.set(-4 + i * 4, 1.6, 2.3)
    group.add(wind)
  }

  // Parking lot (concrete pad with lines)
  const parkingGeo = new THREE.BoxGeometry(16, 0.1, 8)
  const parkingMat = new THREE.MeshLambertMaterial({ color: 0x888888 })
  const parking = new THREE.Mesh(parkingGeo, parkingMat)
  parking.position.set(0, 0.05, 10)
  group.add(parking)

  // Parking lines
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
  for (let i = 0; i < 6; i++) {
    const lineGeo = new THREE.BoxGeometry(0.1, 0.02, 3)
    const line = new THREE.Mesh(lineGeo, lineMat)
    line.position.set(-6 + i * 2.5, 0.12, 10)
    group.add(line)
  }

  // Outdoor display vehicles
  for (let i = 0; i < 2; i++) {
    const vGeo = new THREE.BoxGeometry(2, 1.2, 3.5)
    const vMat = new THREE.MeshLambertMaterial({ color: vehicleColors[i + 2] })
    const v = new THREE.Mesh(vGeo, vMat)
    v.position.set(-3 + i * 6, 0.6, 10)
    group.add(v)
  }

  // Big sign on roof
  const signGeo = new THREE.BoxGeometry(8, 1.5, 0.3)
  const signMat = new THREE.MeshLambertMaterial({ color: 0x2244AA })
  const sign = new THREE.Mesh(signGeo, signMat)
  sign.position.set(0, 5.8, 4)
  sign.castShadow = true
  group.add(sign)
}

function addLevelSign(group, level, color, y) {
  if (level <= 0) return
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 128
  canvas.height = 64

  ctx.fillStyle = `rgba(0,0,0,0.5)`
  roundRect(ctx, 2, 2, 124, 60, 10)
  ctx.fill()

  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 32px Arial'
  ctx.textAlign = 'center'
  const stars = '\u2605'.repeat(Math.min(level, 5))
  ctx.fillText(stars, 64, 44)

  const texture = new THREE.CanvasTexture(canvas)
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(spriteMat)
  sprite.scale.set(2.5, 1.2, 1)
  sprite.position.y = y
  group.add(sprite)
}

// ─── Nearby Building Detection ──────────────────────

export function getNearbyBuildingPlot(bx, bz, radius) {
  if (!buildingsState) return null

  for (const building of buildingsState) {
    if (building.wip) continue
    // Allow delivery if not at max level
    if (building.level >= building.maxLevel) continue

    const dx = building.position.x - bx
    const dz = building.position.z - bz
    if (Math.sqrt(dx * dx + dz * dz) < radius) {
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
        level: building.level,
        maxLevel: building.maxLevel,
      }
    }
  }

  return null
}
