import * as THREE from 'three'
import { getTerrainHeight } from './world.js'
import { t } from './i18n.js'
import { getResourceTypes } from './resources.js'

// ─── Zone Definitions ───────────────────────────────
// Zone 1: south/center (z < 80), Zone 2: hills (90 < z < 250), Zone 3: forest (z > 260)

const ZONE_DEFS = [
  {
    id: 1,
    name: 'plains',
    zMin: -400,
    zMax: 80,
    resourceType: 'terre',
    unlocked: true,
  },
  {
    id: 2,
    name: 'hills',
    zMin: 90,
    zMax: 250,
    resourceType: 'pierre',
    unlocked: false,
    obstacle: {
      type: 'rockslide',
      zLine: 85,
      requiredResource: 'terre',
      requiredAmount: 50,
      delivered: 0,
      chantierPos: { x: 0, z: 78 },
    },
  },
  {
    id: 3,
    name: 'forest',
    zMin: 260,
    zMax: 400,
    resourceType: 'bois',
    unlocked: false,
    obstacle: {
      type: 'river',
      zLine: 255,
      requiredResource: 'pierre',
      requiredAmount: 40,
      delivered: 0,
      chantierPos: { x: 0, z: 248 },
    },
  },
]

let zonesState = null

export function createZonesState(saved = null) {
  zonesState = ZONE_DEFS.map(def => {
    const savedZone = saved?.zones?.find(z => z.id === def.id)
    return {
      id: def.id,
      name: def.name,
      zMin: def.zMin,
      zMax: def.zMax,
      resourceType: def.resourceType,
      unlocked: savedZone ? savedZone.unlocked : def.unlocked,
      obstacle: def.obstacle ? {
        ...def.obstacle,
        delivered: savedZone?.obstacle?.delivered || 0,
      } : null,
    }
  })
  return zonesState
}

export function getZonesState() {
  return zonesState
}

export function getZoneAt(x, z) {
  if (!zonesState) return zonesState?.[0] || null
  for (const zone of zonesState) {
    if (z >= zone.zMin && z <= zone.zMax) {
      return zone
    }
  }
  return zonesState[0]
}

export function getZoneById(id) {
  return zonesState?.find(z => z.id === id) || null
}

export function isPositionAccessible(x, z) {
  const zone = getZoneAt(x, z)
  if (!zone) return true
  return zone.unlocked
}

export function deliverToObstacle(zoneId, resourceType, amount) {
  const zone = getZoneById(zoneId)
  if (!zone?.obstacle) return 0
  if (zone.unlocked) return 0
  if (zone.obstacle.requiredResource !== resourceType) return 0

  const remaining = zone.obstacle.requiredAmount - zone.obstacle.delivered
  const toDeliver = Math.min(amount, remaining)
  zone.obstacle.delivered += toDeliver

  if (zone.obstacle.delivered >= zone.obstacle.requiredAmount) {
    zone.unlocked = true
  }

  return toDeliver
}

export function getObstacleProgress(zoneId) {
  const zone = getZoneById(zoneId)
  if (!zone?.obstacle) return { delivered: 0, required: 0, done: true }
  return {
    delivered: zone.obstacle.delivered,
    required: zone.obstacle.requiredAmount,
    resource: zone.obstacle.requiredResource,
    done: zone.unlocked,
  }
}

export function getZoneSaveData() {
  if (!zonesState) return []
  return zonesState.map(z => ({
    id: z.id,
    unlocked: z.unlocked,
    obstacle: z.obstacle ? {
      delivered: z.obstacle.delivered,
    } : null,
  }))
}

// ─── Zone Obstacle 3D Models ────────────────────────

const OBSTACLE_RADIUS = 8
let obstacleGroups = {}

export function getObstacleRadius() {
  return OBSTACLE_RADIUS
}

export function createZoneObstacles(scene) {
  obstacleGroups = {}

  for (const zone of zonesState) {
    if (!zone.obstacle) continue

    if (zone.obstacle.type === 'rockslide' && !zone.unlocked) {
      obstacleGroups[zone.id] = createRockslide(scene, zone.obstacle.zLine)
    } else if (zone.obstacle.type === 'river') {
      obstacleGroups[zone.id] = createRiver(scene, zone.obstacle.zLine, zone.unlocked)
    }

    createChantierMarker(scene, zone.obstacle.chantierPos, zone.id)
  }

  return obstacleGroups
}

export function removeObstacle(scene, zoneId) {
  const group = obstacleGroups[zoneId]
  if (!group) return

  scene.remove(group)
  group.traverse(child => {
    if (child.geometry) child.geometry.dispose()
    if (child.material) child.material.dispose()
  })
  delete obstacleGroups[zoneId]
}

function createRockslide(scene, zLine) {
  const group = new THREE.Group()

  const rockMat = new THREE.MeshLambertMaterial({ color: 0x7a7a7a })
  const rockMat2 = new THREE.MeshLambertMaterial({ color: 0x666666 })

  // Dense central boulders
  for (let i = -12; i <= 12; i += 3) {
    const size = 1.5 + Math.abs(Math.sin(i * 1.3)) * 2
    const geo = new THREE.DodecahedronGeometry(size, 0)
    const rock = new THREE.Mesh(geo, i % 2 === 0 ? rockMat : rockMat2)
    const rx = i * 3.5
    const rz = zLine + Math.sin(i) * 2
    const ty = getTerrainHeight(rx, rz)
    rock.position.set(rx, ty + size * 0.6, rz)
    rock.rotation.set(i * 0.3, i * 0.7, 0)
    rock.castShadow = true
    group.add(rock)
  }

  // Extend to cover full map width
  for (let i = -400; i <= 400; i += 8) {
    const size = 1 + Math.abs(Math.sin(i * 0.7)) * 1.5
    const geo = new THREE.DodecahedronGeometry(size, 0)
    const rock = new THREE.Mesh(geo, i % 3 === 0 ? rockMat2 : rockMat)
    const rx = i
    const rz = zLine + Math.sin(i * 0.3) * 3
    const ty = getTerrainHeight(rx, rz)
    rock.position.set(rx, ty + size * 0.5, rz)
    rock.rotation.set(i * 0.2, i * 0.5, 0)
    rock.castShadow = true
    group.add(rock)
  }

  scene.add(group)
  return group
}

function createRiver(scene, zLine, bridgeBuilt) {
  const group = new THREE.Group()

  // River follows terrain height
  const terrainAtRiver = getTerrainHeight(0, zLine)
  const riverY = terrainAtRiver + 0.1

  const riverGeo = new THREE.PlaneGeometry(820, 14, 1, 1)
  const riverMat = new THREE.MeshLambertMaterial({
    color: 0x4a90d9,
    transparent: true,
    opacity: 0.7,
  })
  const river = new THREE.Mesh(riverGeo, riverMat)
  river.rotation.x = -Math.PI / 2
  river.position.set(0, riverY, zLine)
  group.add(river)

  // River banks
  const bankMat = new THREE.MeshLambertMaterial({ color: 0x8B7355 })
  const bankGeo = new THREE.BoxGeometry(820, 0.5, 2)
  const bankNorth = new THREE.Mesh(bankGeo, bankMat)
  bankNorth.position.set(0, riverY + 0.15, zLine + 8)
  group.add(bankNorth)
  const bankSouth = new THREE.Mesh(bankGeo, bankMat)
  bankSouth.position.set(0, riverY + 0.15, zLine - 8)
  group.add(bankSouth)

  // Bridge (only if unlocked)
  if (bridgeBuilt) {
    const bridgeGeo = new THREE.BoxGeometry(8, 0.5, 18)
    const bridgeMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 })
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat)
    bridge.position.set(0, riverY + 0.3, zLine)
    bridge.castShadow = true
    group.add(bridge)

    const railMat = new THREE.MeshLambertMaterial({ color: 0x6B4914 })
    const railGeo = new THREE.BoxGeometry(0.3, 1.5, 18)
    const railL = new THREE.Mesh(railGeo, railMat)
    railL.position.set(-3.8, riverY + 1.1, zLine)
    group.add(railL)
    const railR = new THREE.Mesh(railGeo, railMat)
    railR.position.set(3.8, riverY + 1.1, zLine)
    group.add(railR)
  }

  scene.add(group)
  return group
}

function createChantierMarker(scene, pos, zoneId) {
  const group = new THREE.Group()
  const zone = zonesState.find(z => z.id === zoneId)

  // Sign post
  const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 5, 6)
  const poleMat = new THREE.MeshLambertMaterial({ color: 0xDDA520 })
  const pole = new THREE.Mesh(poleGeo, poleMat)
  pole.position.y = 2.5
  pole.castShadow = true
  group.add(pole)

  // Sign board
  const signGeo = new THREE.BoxGeometry(3, 1.5, 0.2)
  const signMat = new THREE.MeshLambertMaterial({ color: 0xFF8C00 })
  const sign = new THREE.Mesh(signGeo, signMat)
  sign.position.y = 4.5
  sign.castShadow = true
  group.add(sign)

  // Warning stripes
  const stripeGeo = new THREE.BoxGeometry(0.3, 1.5, 0.22)
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0x222222 })
  for (let i = -1; i <= 1; i++) {
    const stripe = new THREE.Mesh(stripeGeo, stripeMat)
    stripe.position.set(i * 0.8, 4.5, 0)
    group.add(stripe)
  }

  // Glow ring
  const ringGeo = new THREE.RingGeometry(5, 5.5, 20)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xFF8C00,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.4,
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.05
  group.add(ring)

  if (zone?.obstacle && !zone.unlocked) {
    const marker = createChantierLabel(zone)
    marker.position.y = 8
    group.add(marker)
  }

  const terrainY = getTerrainHeight(pos.x, pos.z)
  group.position.set(pos.x, terrainY, pos.z)
  group.userData = { type: 'chantier', zoneId }
  scene.add(group)
}

function createChantierLabel(zone) {
  const group = new THREE.Group()
  const resTypes = getResourceTypes()
  const obs = zone.obstacle

  const nameKey = obs.type === 'rockslide' ? 'rockslideChantier' : 'riverChantier'
  const name = t(nameKey)
  const emoji = resTypes[obs.requiredResource]?.emoji || ''
  const costLine = `${emoji} ${t(obs.requiredResource)} ${obs.delivered}/${obs.requiredAmount}`

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 512
  canvas.height = 200

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  roundRect(ctx, 10, 10, 492, 180, 20)
  ctx.fill()

  ctx.strokeStyle = '#FF8C00'
  ctx.lineWidth = 4
  roundRect(ctx, 10, 10, 492, 180, 20)
  ctx.stroke()

  ctx.fillStyle = '#FF8C00'
  ctx.font = 'bold 42px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(name, 256, 70)

  ctx.strokeStyle = '#FF8C0088'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(60, 85)
  ctx.lineTo(452, 85)
  ctx.stroke()

  ctx.font = '36px Arial'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(costLine, 256, 130)

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
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xFF8C00 })
  const arrow = new THREE.Mesh(arrowGeo, arrowMat)
  arrow.rotation.x = Math.PI
  arrow.position.y = -2
  group.add(arrow)

  const poleGeo2 = new THREE.CylinderGeometry(0.06, 0.06, 4, 4)
  const poleMat2 = new THREE.MeshBasicMaterial({ color: 0xFF8C00, transparent: true, opacity: 0.5 })
  const poleMesh = new THREE.Mesh(poleGeo2, poleMat2)
  poleMesh.position.y = -4.5
  group.add(poleMesh)

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

// ─── Collision with zone barriers ───────────────────

export function clampToAccessibleZone(x, z, prevX, prevZ) {
  if (!zonesState) return { x, z }

  for (const zone of zonesState) {
    if (zone.unlocked || !zone.obstacle) continue

    const zLine = zone.obstacle.zLine

    if (zone.obstacle.type === 'rockslide') {
      if (z > zLine - 3 && prevZ <= zLine - 3) {
        return { x, z: zLine - 3 }
      }
      if (z > zLine - 3) {
        return { x, z: Math.min(z, zLine - 3) }
      }
    }

    if (zone.obstacle.type === 'river') {
      if (z > zLine - 8 && prevZ <= zLine - 8) {
        return { x, z: zLine - 8 }
      }
      if (z > zLine - 8) {
        return { x, z: Math.min(z, zLine - 8) }
      }
    }
  }

  return { x, z }
}

export function getNearbyChantier(bx, bz, radius) {
  if (!zonesState) return null

  for (const zone of zonesState) {
    if (!zone.obstacle) continue
    if (zone.unlocked) continue

    const pos = zone.obstacle.chantierPos
    const dx = pos.x - bx
    const dz = pos.z - bz
    if (Math.sqrt(dx * dx + dz * dz) < radius) {
      return {
        zoneId: zone.id,
        resource: zone.obstacle.requiredResource,
        delivered: zone.obstacle.delivered,
        required: zone.obstacle.requiredAmount,
        type: 'obstacle',
      }
    }
  }

  return null
}
