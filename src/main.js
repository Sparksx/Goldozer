import * as THREE from 'three'
import { createWorld, getMapSize, getSellPoints, getObstacles } from './world.js'
import { createBulldozer, updateBulldozer, updateCamera } from './bulldozer.js'
import { spawnResources, checkCollection, spawnVeinResources, updateVeinRespawn } from './resources.js'
import {
  createGameState, sellResources, addToBucket,
  getMaxCapacity, persistState, getTotalInBucket
} from './economy.js'
import { createControls } from './controls.js'
import { loadGame } from './save.js'
import {
  initUI, showMainMenu, showPauseMenu, showUpgradeMenu,
  updateHUD, showSellPrompt, showMobileSellButton,
  showDeliveryPrompt, showMobileDeliverButton, showNotification,
  hideAllOverlays, isOverlayOpen, isMobileDevice
} from './ui.js'
import { createZonesState, clampToAccessibleZone, removeObstacle } from './zones.js'
import { resolveObstacleCollisions, pushResources } from './collision.js'
import { createBuildingsState, upgradePlotToBuilding, getBuildingById } from './buildings.js'
import { checkDeliveryProximity, canDeliverTo, performDelivery } from './delivery.js'
import { t } from './i18n.js'

// ─── Three.js Setup ──────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.getElementById('game-container').appendChild(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300)
camera.position.set(0, 10, -15)

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// ─── Game State ──────────────────────────────────
const savedData = loadGame()
let state = createGameState(savedData)
const controls = createControls()
let gameRunning = false
let bulldozer = null
let resources = []
let worldData = null

// Initialize zones and buildings from save
createZonesState(savedData)
createBuildingsState(savedData)

// ─── Init UI ─────────────────────────────────────
initUI({
  onStartGame: (isNew) => {
    if (isNew) {
      state = createGameState()
      createZonesState()
      createBuildingsState()
    }
    startGame()
  },
  onResumeGame: () => {
    gameRunning = true
  },
  gameState: state,
  getGameState: () => state,
  controls,
})

// ─── Show Main Menu ──────────────────────────────
showMainMenu()

// ─── Start Game ──────────────────────────────────
function startGame() {
  // Clear previous scene objects
  while (scene.children.length > 0) {
    scene.remove(scene.children[0])
  }

  // Create world (includes zone obstacles and building plots)
  worldData = createWorld(scene)

  // Create bulldozer
  bulldozer = createBulldozer(scene)
  bulldozer.mesh.position.set(state.playerPos.x, 0, state.playerPos.z)
  bulldozer.rotation = state.playerRot

  // Spawn resources (persistent + vein)
  resources = spawnResources(scene, state.collectedIds)
  const veinResources = spawnVeinResources(scene)
  resources.push(...veinResources)

  // Update HUD
  updateHUD(state)

  gameRunning = true
}

// If we have a save, still need the world loaded for continue
if (savedData) {
  startGame()
  gameRunning = false // Wait for menu
  showMainMenu()
}

// ─── Sell Point Proximity ────────────────────────
const SELL_RADIUS = 10

function checkSellPointProximity() {
  if (!bulldozer) return false
  const bx = bulldozer.mesh.position.x
  const bz = bulldozer.mesh.position.z
  const sellPoints = getSellPoints()

  for (const sp of sellPoints) {
    const dx = sp.x - bx
    const dz = sp.z - bz
    if (Math.sqrt(dx * dx + dz * dz) < SELL_RADIUS) {
      return true
    }
  }
  return false
}

// ─── Game Loop ───────────────────────────────────
const clock = new THREE.Clock()
let prevBulldozerX = 0
let prevBulldozerZ = 0

function animate() {
  requestAnimationFrame(animate)

  const delta = Math.min(clock.getDelta(), 0.05)

  // Handle menu toggle
  if (controls.consumeMenu()) {
    if (isOverlayOpen()) {
      hideAllOverlays()
      gameRunning = true
    } else {
      gameRunning = false
      showPauseMenu()
    }
  }

  // Handle upgrade toggle
  if (controls.consumeUpgrade()) {
    if (isOverlayOpen()) {
      hideAllOverlays()
      gameRunning = true
    } else {
      gameRunning = false
      showUpgradeMenu()
    }
  }

  if (!gameRunning || !bulldozer) {
    renderer.render(scene, camera)
    return
  }

  // Save previous position for zone clamping
  prevBulldozerX = bulldozer.mesh.position.x
  prevBulldozerZ = bulldozer.mesh.position.z

  // Update bulldozer
  updateBulldozer(bulldozer, controls.state, delta, state.upgrades, getMapSize())

  // Clamp to accessible zones (prevent crossing barriers)
  const clamped = clampToAccessibleZone(
    bulldozer.mesh.position.x,
    bulldozer.mesh.position.z,
    prevBulldozerX,
    prevBulldozerZ
  )
  if (clamped.x !== bulldozer.mesh.position.x || clamped.z !== bulldozer.mesh.position.z) {
    bulldozer.mesh.position.x = clamped.x
    bulldozer.mesh.position.z = clamped.z
    bulldozer.velocity = 0
  }

  // Check obstacle collisions (trees, rocks, buildings)
  resolveObstacleCollisions(bulldozer, getObstacles())

  // Update camera
  updateCamera(camera, bulldozer)

  // Check resource collection (only collect up to available bucket space)
  const maxCap = getMaxCapacity(state.upgrades)
  const total = getTotalInBucket(state.bucket)
  const canAdd = maxCap - total

  // Push resources when bucket is full
  if (canAdd <= 0) {
    pushResources(resources, bulldozer.mesh.position, bulldozer.rotation, bulldozer.velocity, delta)
  }

  const collected = checkCollection(resources, bulldozer.mesh.position, state.upgrades, scene, canAdd)
  if (collected.length > 0) {
    for (const item of collected) {
      addToBucket(state, item.type, 1)
      if (!item.isVein) {
        state.collectedIds.push(item.id)
      }
    }
    updateHUD(state)
    persistState(state)
  }

  // Respawn vein resources
  const newVeinResources = updateVeinRespawn(delta, scene)
  if (newVeinResources.length > 0) {
    resources.push(...newVeinResources)
  }

  // Check sell point proximity
  const nearSell = checkSellPointProximity()
  const bucketTotal = getTotalInBucket(state.bucket)

  // Check delivery point proximity
  const bx = bulldozer.mesh.position.x
  const bz = bulldozer.mesh.position.z
  const deliveryTarget = checkDeliveryProximity(bx, bz)
  const hasDeliverableResource = deliveryTarget && canDeliverTo(deliveryTarget, state.bucket)

  // Show appropriate prompts (delivery takes priority over sell when can deliver)
  if (hasDeliverableResource) {
    showSellPrompt(false)
    showDeliveryPrompt(true, deliveryTarget)
    if (isMobileDevice()) {
      showMobileSellButton(false)
      showMobileDeliverButton(true)
    }
  } else if (nearSell && bucketTotal > 0) {
    showSellPrompt(true)
    showDeliveryPrompt(false)
    if (isMobileDevice()) {
      showMobileSellButton(true)
      showMobileDeliverButton(false)
    }
  } else {
    showSellPrompt(false)
    // Show delivery prompt even if can't deliver (to show progress)
    showDeliveryPrompt(deliveryTarget != null, deliveryTarget)
    if (isMobileDevice()) {
      showMobileSellButton(false)
      showMobileDeliverButton(false)
    }
  }

  // Handle action (E key or mobile button)
  if (controls.consumeAction()) {
    if (hasDeliverableResource) {
      const result = performDelivery(deliveryTarget, state.bucket)
      if (result) {
        updateHUD(state)
        persistState(state)

        if (result.justCompleted) {
          if (deliveryTarget.type === 'obstacle') {
            removeObstacle(scene, deliveryTarget.zoneId)
            showNotification(t('zoneUnlocked'), 4000)
          } else if (deliveryTarget.type === 'building') {
            upgradePlotToBuilding(scene, deliveryTarget.buildingId)
            const effectKey = `${deliveryTarget.name}Effect`
            showNotification(`${t(deliveryTarget.name)} — ${t(effectKey)}`, 4000)
          }
        }
      }
    } else if (nearSell && bucketTotal > 0) {
      const earnings = sellResources(state)
      if (earnings > 0) {
        updateHUD(state)
        showNotification(`+${earnings} 💰`, 2000)
      }
    }
  }

  // Save position periodically
  state.playerPos.x = bulldozer.mesh.position.x
  state.playerPos.z = bulldozer.mesh.position.z
  state.playerRot = bulldozer.rotation

  renderer.render(scene, camera)
}

// Save position on visibility change
document.addEventListener('visibilitychange', () => {
  if (document.hidden && bulldozer) {
    persistState(state)
  }
})

animate()
