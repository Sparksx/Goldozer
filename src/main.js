import * as THREE from 'three';
import { createWorld, getMapSize, getSellPoints } from './world.js';
import { createBulldozer, updateBulldozer, updateCamera } from './bulldozer.js';
import { spawnResources, checkCollection } from './resources.js';
import {
  createGameState, sellResources, addToBucket,
  getMaxCapacity, persistState
} from './economy.js';
import { createControls } from './controls.js';
import { loadGame } from './save.js';
import {
  initUI, showMainMenu, showPauseMenu, showUpgradeMenu,
  updateHUD, showSellPrompt, showMobileSellButton,
  hideAllOverlays, isOverlayOpen, isMobileDevice
} from './ui.js';

// ─── Three.js Setup ──────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game-container').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 10, -15);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Game State ──────────────────────────────────
const savedData = loadGame();
let state = createGameState(savedData);
const controls = createControls();
let gameRunning = false;
let bulldozer = null;
let resources = [];
let worldData = null;

// ─── Init UI ─────────────────────────────────────
initUI({
  onStartGame: (isNew) => {
    if (isNew) {
      state = createGameState();
    }
    startGame();
  },
  onResumeGame: () => {
    gameRunning = true;
  },
  gameState: state,
  controls,
});

// ─── Show Main Menu ──────────────────────────────
showMainMenu();

// ─── Start Game ──────────────────────────────────
function startGame() {
  // Clear previous scene objects (keep lights/ground if restarting)
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }

  // Create world
  worldData = createWorld(scene);

  // Create bulldozer
  bulldozer = createBulldozer(scene);
  bulldozer.mesh.position.set(state.playerPos.x, 0, state.playerPos.z);
  bulldozer.rotation = state.playerRot;

  // Spawn resources
  resources = spawnResources(scene, state.collectedIds);

  // Update HUD
  updateHUD(state);

  gameRunning = true;
}

// If we have a save, still need the world loaded for continue
if (savedData) {
  startGame();
  gameRunning = false; // Wait for menu
  showMainMenu();
}

// ─── Sell Point Proximity ────────────────────────
const SELL_RADIUS = 10;

function checkSellPointProximity() {
  if (!bulldozer) return false;
  const bx = bulldozer.mesh.position.x;
  const bz = bulldozer.mesh.position.z;
  const sellPoints = getSellPoints();

  for (const sp of sellPoints) {
    const dx = sp.x - bx;
    const dz = sp.z - bz;
    if (Math.sqrt(dx * dx + dz * dz) < SELL_RADIUS) {
      return true;
    }
  }
  return false;
}

// ─── Game Loop ───────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  // Handle menu toggle
  if (controls.consumeMenu()) {
    if (isOverlayOpen()) {
      hideAllOverlays();
      gameRunning = true;
    } else {
      gameRunning = false;
      showPauseMenu();
    }
  }

  // Handle upgrade toggle
  if (controls.consumeUpgrade()) {
    if (isOverlayOpen()) {
      hideAllOverlays();
      gameRunning = true;
    } else {
      gameRunning = false;
      showUpgradeMenu();
    }
  }

  if (!gameRunning || !bulldozer) {
    renderer.render(scene, camera);
    return;
  }

  // Update bulldozer
  updateBulldozer(bulldozer, controls.state, delta, state.upgrades, getMapSize());

  // Update camera
  updateCamera(camera, bulldozer);

  // Check resource collection
  const collected = checkCollection(resources, bulldozer.mesh.position, state.upgrades, scene);
  if (collected.length > 0) {
    const maxCap = getMaxCapacity(state.upgrades);
    const canAdd = maxCap - state.bucket;
    const toAdd = Math.min(collected.length, canAdd);
    addToBucket(state, toAdd);
    state.collectedIds.push(...collected);
    updateHUD(state);
    persistState(state);
  }

  // Check sell point proximity
  const nearSell = checkSellPointProximity();
  showSellPrompt(nearSell && state.bucket > 0);
  if (isMobileDevice()) {
    showMobileSellButton(nearSell && state.bucket > 0);
  }

  // Handle sell action
  if (controls.consumeAction() && nearSell && state.bucket > 0) {
    const sold = sellResources(state);
    if (sold > 0) {
      updateHUD(state);
    }
  }

  // Save position periodically
  state.playerPos.x = bulldozer.mesh.position.x;
  state.playerPos.z = bulldozer.mesh.position.z;
  state.playerRot = bulldozer.rotation;

  renderer.render(scene, camera);
}

// Save position on visibility change
document.addEventListener('visibilitychange', () => {
  if (document.hidden && bulldozer) {
    persistState(state);
  }
});

animate();
