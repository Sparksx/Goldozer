import * as THREE from 'three'
import { getTerrainHeight } from './world.js'
import { t } from './i18n.js'
import { getResourceTypes } from './resources.js'

// ─── Building Definitions ───────────────────────────
// Buildings organized in city center around origin

const BUILDING_DEFS = [
  // Functional buildings
  {
    id: 'maison',
    name: 'maison',
    zone: 1,
    position: { x: 25, z: -20 },
    cost: { terre: 10 },
    effect: { type: 'sellBonus', resource: 'terre', bonus: 0.05 },
  },
  {
    id: 'entrepot',
    name: 'entrepot',
    zone: 1,
    position: { x: -25, z: -20 },
    cost: { terre: 15, pierre: 10 },
    effect: { type: 'capacityBonus', bonus: 10 },
  },
  {
    id: 'marche',
    name: 'marche',
    zone: 1,
    position: { x: 25, z: 18 },
    cost: { pierre: 20 },
    effect: { type: 'dynamicPrices' },
  },
  {
    id: 'scierie',
    name: 'scierie',
    zone: 1,
    position: { x: -25, z: 18 },
    cost: { bois: 10, pierre: 10 },
    effect: { type: 'transformBonus', resource: 'bois', multiplier: 1.5 },
  },
  // WIP buildings
  {
    id: 'concession',
    name: 'concession',
    zone: 1,
    position: { x: 40, z: 0 },
    cost: { terre: 30, pierre: 20, bois: 15 },
    effect: { type: 'wip' },
    wip: true,
  },
  {
    id: 'fonderie',
    name: 'fonderie',
    zone: 1,
    position: { x: -40, z: 0 },
    cost: { pierre: 30, terre: 20 },
    effect: { type: 'wip' },
    wip: true,
  },
  {
    id: 'stationService',
    name: 'stationService',
    zone: 1,
    position: { x: 0, z: 38 },
    cost: { terre: 20, bois: 15 },
    effect: { type: 'wip' },
    wip: true,
  },
  {
    id: 'laboratoire',
    name: 'laboratoire',
    zone: 1,
    position: { x: 0, z: -42 },
    cost: { pierre: 25, bois: 20 },
    effect: { type: 'wip' },
    wip: true,
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
      wip: def.wip || false,
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
  if (building.wip) return 0

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

  const oldMesh = buildingMeshes[buildingId]
  if (oldMesh) {
    scene.remove(oldMesh)
    oldMesh.traverse(child => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) child.material.dispose()
    })
  }

  buildingMeshes[buildingId] = createBuiltBuilding(scene, building)
}

function createEmptyPlot(scene, building) {
  const group = new THREE.Group()
  const isWip = building.wip

  const outlineColor = isWip ? 0x888888 : 0xFFD700
  const outlineGeo = new THREE.RingGeometry(4, 4.3, 4)
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
  const offsets = [[-3, -3], [3, -3], [3, 3], [-3, 3]]
  offsets.forEach(([ox, oz]) => {
    const post = new THREE.Mesh(postGeo, postMat)
    post.position.set(ox, 0.75, oz)
    post.castShadow = true
    group.add(post)
  })

  const signGeo = new THREE.BoxGeometry(2, 1, 0.15)
  const signMat = new THREE.MeshLambertMaterial({ color: isWip ? 0x666666 : 0xCC8800 })
  const sign = new THREE.Mesh(signGeo, signMat)
  sign.position.set(0, 2, -3)
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
  const costLines = []
  for (const [res, amount] of Object.entries(building.cost)) {
    const delivered = building.delivered[res] || 0
    const emoji = resTypes[res]?.emoji || ''
    costLines.push(`${emoji} ${t(res)} ${delivered}/${amount}`)
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 512
  canvas.height = 256

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  roundRect(ctx, 10, 10, 492, 236, 20)
  ctx.fill()

  ctx.strokeStyle = '#FFD700'
  ctx.lineWidth = 4
  roundRect(ctx, 10, 10, 492, 236, 20)
  ctx.stroke()

  ctx.fillStyle = '#FFD700'
  ctx.font = 'bold 48px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(name, 256, 70)

  ctx.strokeStyle = '#FFD70088'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(60, 90)
  ctx.lineTo(452, 90)
  ctx.stroke()

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

  const arrowGeo = new THREE.ConeGeometry(0.4, 1.2, 4)
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 })
  const arrow = new THREE.Mesh(arrowGeo, arrowMat)
  arrow.rotation.x = Math.PI
  arrow.position.y = -2.5
  group.add(arrow)

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
    case 'concession':
      createConcessionModel(group)
      break
    case 'fonderie':
      createFonderieModel(group)
      break
    case 'stationService':
      createStationServiceModel(group)
      break
    case 'laboratoire':
      createLaboratoireModel(group)
      break
  }

  const terrainY = getTerrainHeight(building.position.x, building.position.z)
  group.position.set(building.position.x, terrainY, building.position.z)
  group.userData = { type: 'building', buildingId: building.id }
  scene.add(group)
  return group
}

// ─── Building Models ────────────────────────────────

function createMaisonModel(group) {
  const wallGeo = new THREE.BoxGeometry(5, 3, 5)
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xE8C89A })
  const walls = new THREE.Mesh(wallGeo, wallMat)
  walls.position.y = 1.5
  walls.castShadow = true
  group.add(walls)

  const roofGeo = new THREE.ConeGeometry(4.2, 2.5, 4)
  const roofMat = new THREE.MeshLambertMaterial({ color: 0xCC4444 })
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.y = 4.25
  roof.rotation.y = Math.PI / 4
  roof.castShadow = true
  group.add(roof)

  const doorGeo = new THREE.BoxGeometry(1, 2, 0.1)
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x6B3A1F })
  const door = new THREE.Mesh(doorGeo, doorMat)
  door.position.set(0, 1, 2.55)
  group.add(door)

  const winGeo = new THREE.BoxGeometry(1, 0.8, 0.1)
  const winMat = new THREE.MeshLambertMaterial({ color: 0x88CCFF })
  const win = new THREE.Mesh(winGeo, winMat)
  win.position.set(1.8, 2, 2.55)
  group.add(win)
}

function createEntrepotModel(group) {
  const wallGeo = new THREE.BoxGeometry(7, 4, 6)
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x8B8B8B })
  const walls = new THREE.Mesh(wallGeo, wallMat)
  walls.position.y = 2
  walls.castShadow = true
  group.add(walls)

  const roofGeo = new THREE.BoxGeometry(7.5, 0.4, 6.5)
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x555555 })
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.y = 4.2
  roof.castShadow = true
  group.add(roof)

  const doorGeo = new THREE.BoxGeometry(3, 3.5, 0.1)
  const doorMat = new THREE.MeshLambertMaterial({ color: 0xDDA520 })
  const door = new THREE.Mesh(doorGeo, doorMat)
  door.position.set(0, 1.75, 3.05)
  group.add(door)
}

function createMarcheModel(group) {
  const platformGeo = new THREE.BoxGeometry(6, 0.3, 5)
  const platformMat = new THREE.MeshLambertMaterial({ color: 0xC4A265 })
  const platform = new THREE.Mesh(platformGeo, platformMat)
  platform.position.y = 0.15
  platform.castShadow = true
  group.add(platform)

  const counterGeo = new THREE.BoxGeometry(5, 1.2, 1)
  const counterMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 })
  const counter = new THREE.Mesh(counterGeo, counterMat)
  counter.position.set(0, 0.9, 0)
  counter.castShadow = true
  group.add(counter)

  const poleMat = new THREE.MeshLambertMaterial({ color: 0x6B4914 })
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.5, 6)
  const positions = [[-2.5, -2], [2.5, -2], [-2.5, 2], [2.5, 2]]
  positions.forEach(([px, pz]) => {
    const pole = new THREE.Mesh(poleGeo, poleMat)
    pole.position.set(px, 1.75, pz)
    pole.castShadow = true
    group.add(pole)
  })

  const canopyGeo = new THREE.BoxGeometry(6, 0.2, 5)
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0xE07050 })
  const canopy = new THREE.Mesh(canopyGeo, canopyMat)
  canopy.position.y = 3.5
  canopy.castShadow = true
  group.add(canopy)
}

function createScierieModel(group) {
  const wallGeo = new THREE.BoxGeometry(6, 3.5, 5)
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x7B4F2E })
  const walls = new THREE.Mesh(wallGeo, wallMat)
  walls.position.y = 1.75
  walls.castShadow = true
  group.add(walls)

  const roofGeo = new THREE.BoxGeometry(6.5, 0.3, 5.5)
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x4A3520 })
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.y = 3.65
  roof.rotation.z = 0.1
  roof.castShadow = true
  group.add(roof)

  const stackGeo = new THREE.CylinderGeometry(0.3, 0.4, 2, 6)
  const stackMat = new THREE.MeshLambertMaterial({ color: 0x555555 })
  const stack = new THREE.Mesh(stackGeo, stackMat)
  stack.position.set(2, 4.5, 0)
  stack.castShadow = true
  group.add(stack)

  const logMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 })
  for (let i = 0; i < 4; i++) {
    const logGeo = new THREE.CylinderGeometry(0.25, 0.25, 2.5, 6)
    const log = new THREE.Mesh(logGeo, logMat)
    log.rotation.z = Math.PI / 2
    log.position.set(-4, 0.3 + i * 0.5, -1 + i * 0.3)
    group.add(log)
  }
}

// ─── WIP Building Models ────────────────────────────

function createConcessionModel(group) {
  const wallGeo = new THREE.BoxGeometry(8, 3.5, 7)
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xD0D0D0 })
  const walls = new THREE.Mesh(wallGeo, wallMat)
  walls.position.y = 1.75
  walls.castShadow = true
  group.add(walls)

  const glassMat = new THREE.MeshLambertMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.5 })
  const glassGeo = new THREE.BoxGeometry(7, 2.5, 0.1)
  const glass = new THREE.Mesh(glassGeo, glassMat)
  glass.position.set(0, 2, 3.55)
  group.add(glass)

  const roofGeo = new THREE.BoxGeometry(8.5, 0.3, 7.5)
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x444444 })
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.y = 3.65
  roof.castShadow = true
  group.add(roof)

  const vehicleGeo = new THREE.BoxGeometry(2, 1, 3)
  const vehicleMat = new THREE.MeshLambertMaterial({ color: 0xCC3333 })
  const vehicle = new THREE.Mesh(vehicleGeo, vehicleMat)
  vehicle.position.set(0, 0.8, 0)
  group.add(vehicle)
}

function createFonderieModel(group) {
  const wallGeo = new THREE.BoxGeometry(7, 4.5, 6)
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 })
  const walls = new THREE.Mesh(wallGeo, wallMat)
  walls.position.y = 2.25
  walls.castShadow = true
  group.add(walls)

  const roofGeo = new THREE.BoxGeometry(7.5, 0.4, 6.5)
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x333333 })
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.y = 4.7
  roof.castShadow = true
  group.add(roof)

  const chimneyGeo = new THREE.CylinderGeometry(0.5, 0.7, 5, 8)
  const chimneyMat = new THREE.MeshLambertMaterial({ color: 0x555555 })
  const chimney = new THREE.Mesh(chimneyGeo, chimneyMat)
  chimney.position.set(2.5, 6, -1.5)
  chimney.castShadow = true
  group.add(chimney)

  const glowGeo = new THREE.BoxGeometry(2, 1.5, 0.1)
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xFF4400 })
  const glow = new THREE.Mesh(glowGeo, glowMat)
  glow.position.set(0, 1.5, 3.05)
  group.add(glow)
}

function createStationServiceModel(group) {
  const canopyGeo = new THREE.BoxGeometry(8, 0.3, 5)
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0xDD2222 })
  const canopy = new THREE.Mesh(canopyGeo, canopyMat)
  canopy.position.y = 4
  canopy.castShadow = true
  group.add(canopy)

  const pillarGeo = new THREE.CylinderGeometry(0.2, 0.2, 4, 6)
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0xCCCCCC })
  const pillarPositions = [[-3, -2], [3, -2], [-3, 2], [3, 2]]
  pillarPositions.forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat)
    pillar.position.set(px, 2, pz)
    pillar.castShadow = true
    group.add(pillar)
  })

  const pumpGeo = new THREE.BoxGeometry(0.6, 2, 0.4)
  const pumpMat = new THREE.MeshLambertMaterial({ color: 0xEEEEEE })
  const pump1 = new THREE.Mesh(pumpGeo, pumpMat)
  pump1.position.set(-1, 1, 0)
  pump1.castShadow = true
  group.add(pump1)
  const pump2 = new THREE.Mesh(pumpGeo, pumpMat)
  pump2.position.set(1, 1, 0)
  pump2.castShadow = true
  group.add(pump2)

  const officeGeo = new THREE.BoxGeometry(4, 3, 3)
  const officeMat = new THREE.MeshLambertMaterial({ color: 0xCCBBAA })
  const office = new THREE.Mesh(officeGeo, officeMat)
  office.position.set(0, 1.5, -4)
  office.castShadow = true
  group.add(office)
}

function createLaboratoireModel(group) {
  const wallGeo = new THREE.BoxGeometry(6, 3, 6)
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xEEEEEE })
  const walls = new THREE.Mesh(wallGeo, wallMat)
  walls.position.y = 1.5
  walls.castShadow = true
  group.add(walls)

  const stripGeo = new THREE.BoxGeometry(6.1, 0.3, 6.1)
  const stripMat = new THREE.MeshLambertMaterial({ color: 0x2266CC })
  const strip = new THREE.Mesh(stripGeo, stripMat)
  strip.position.y = 2.5
  group.add(strip)

  const domeGeo = new THREE.SphereGeometry(2, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2)
  const domeMat = new THREE.MeshLambertMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.6 })
  const dome = new THREE.Mesh(domeGeo, domeMat)
  dome.position.y = 3
  dome.castShadow = true
  group.add(dome)

  const antennaGeo = new THREE.CylinderGeometry(0.08, 0.08, 3, 4)
  const antennaMat = new THREE.MeshLambertMaterial({ color: 0x666666 })
  const antenna = new THREE.Mesh(antennaGeo, antennaMat)
  antenna.position.set(0, 5.5, 0)
  group.add(antenna)

  const lightGeo = new THREE.SphereGeometry(0.15, 6, 4)
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 })
  const light = new THREE.Mesh(lightGeo, lightMat)
  light.position.set(0, 7, 0)
  group.add(light)
}

// ─── Nearby Building Detection ──────────────────────

export function getNearbyBuildingPlot(bx, bz, radius) {
  if (!buildingsState) return null

  for (const building of buildingsState) {
    if (building.built) continue
    if (building.wip) continue

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
      }
    }
  }

  return null
}
