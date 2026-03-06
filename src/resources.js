import * as THREE from 'three';

const RESOURCE_COUNT = 500;
const BASE_COLLECT_RADIUS = 4;

// Resource-rich mountain zones, placed far from sell points
const RESOURCE_MOUNTAINS = [
  { x: 0, z: 150, name: 'Montagne Nord' },
  { x: 150, z: 0, name: 'Montagne Est' },
  { x: -150, z: 0, name: 'Montagne Ouest' },
  { x: 0, z: -150, name: 'Montagne Sud' },
  { x: 130, z: 130, name: 'Montagne Nord-Est' },
  { x: -130, z: -130, name: 'Montagne Sud-Ouest' },
];
const MOUNTAIN_RESOURCE_COUNT = 40; // resources per mountain
const MOUNTAIN_RADIUS = 18; // spread radius

export function getResourceMountains() {
  return RESOURCE_MOUNTAINS;
}

export function spawnResources(scene, collectedIds = []) {
  const resources = [];
  const seed = 12345;

  // Spawn scattered resources (original)
  for (let i = 0; i < RESOURCE_COUNT; i++) {
    if (collectedIds.includes(i)) continue;

    const x = seededRandom(seed + i * 37) * 360 - 180;
    const z = seededRandom(seed + i * 37 + 17) * 360 - 180;

    // Don't spawn at center (spawn point)
    if (Math.abs(x) < 8 && Math.abs(z) < 8) continue;

    const isSand = seededRandom(seed + i * 37 + 99) > 0.4;
    const color = isSand ? 0xD2B48C : 0x8B6914;

    const size = 0.4 + seededRandom(seed + i * 37 + 55) * 0.4;
    const geo = isSand
      ? new THREE.SphereGeometry(size, 5, 4)
      : new THREE.BoxGeometry(size * 1.5, size, size * 1.2);
    const mat = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, size * 0.5, z);
    mesh.castShadow = true;

    // Slight random rotation
    mesh.rotation.y = seededRandom(seed + i * 37 + 33) * Math.PI * 2;

    scene.add(mesh);
    resources.push({ id: i, mesh, collected: false });
  }

  // Spawn dense mountain clusters
  let mountainId = RESOURCE_COUNT;
  RESOURCE_MOUNTAINS.forEach((mt, mi) => {
    for (let j = 0; j < MOUNTAIN_RESOURCE_COUNT; j++) {
      const id = mountainId++;
      if (collectedIds.includes(id)) continue;

      const angle = seededRandom(seed + mi * 1000 + j * 53) * Math.PI * 2;
      const dist = seededRandom(seed + mi * 1000 + j * 53 + 7) * MOUNTAIN_RADIUS;
      const x = mt.x + Math.cos(angle) * dist;
      const z = mt.z + Math.sin(angle) * dist;

      // Mountains have richer resources (more dirt/gold colored)
      const typeRoll = seededRandom(seed + mi * 1000 + j * 53 + 99);
      const isSand = typeRoll > 0.3;
      const color = isSand ? 0xD2B48C : 0x8B6914;

      // Slightly bigger resources in mountains
      const size = 0.5 + seededRandom(seed + mi * 1000 + j * 53 + 55) * 0.5;
      const geo = isSand
        ? new THREE.SphereGeometry(size, 5, 4)
        : new THREE.BoxGeometry(size * 1.5, size, size * 1.2);
      const mat = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, size * 0.5, z);
      mesh.castShadow = true;
      mesh.rotation.y = seededRandom(seed + mi * 1000 + j * 53 + 33) * Math.PI * 2;

      scene.add(mesh);
      resources.push({ id, mesh, collected: false });
    }
  });

  return resources;
}

export function checkCollection(resources, bulldozerPos, upgrades, scene) {
  const collectRadius = BASE_COLLECT_RADIUS + upgrades.collectRadius * 1.5;
  const collected = [];

  for (let i = resources.length - 1; i >= 0; i--) {
    const res = resources[i];
    if (res.collected) continue;

    const dx = res.mesh.position.x - bulldozerPos.x;
    const dz = res.mesh.position.z - bulldozerPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < collectRadius) {
      res.collected = true;
      scene.remove(res.mesh);
      if (res.mesh.geometry) res.mesh.geometry.dispose();
      if (res.mesh.material) res.mesh.material.dispose();
      collected.push(res.id);
    }
  }

  return collected;
}

export function getBaseCollectRadius() {
  return BASE_COLLECT_RADIUS;
}

function seededRandom(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}
