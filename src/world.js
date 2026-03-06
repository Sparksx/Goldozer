import * as THREE from 'three';
import { getResourceMountains } from './resources.js';

const MAP_SIZE = 200;
const SELL_POINTS = [
  { x: 60, z: 60, name: 'Depot Nord-Est' },
  { x: -60, z: 60, name: 'Depot Nord-Ouest' },
  { x: 60, z: -60, name: 'Depot Sud-Est' },
  { x: -60, z: -60, name: 'Depot Sud-Ouest' },
  { x: 0, z: -80, name: 'Depot Sud' },
];

export function getMapSize() {
  return MAP_SIZE;
}

export function getSellPoints() {
  return SELL_POINTS;
}

let groundMesh = null;
let groundRaycaster = null;

export function getTerrainHeight(x, z) {
  if (!groundMesh || !groundRaycaster) return 0;
  groundRaycaster.set(
    new THREE.Vector3(x, 50, z),
    new THREE.Vector3(0, -1, 0)
  );
  const hits = groundRaycaster.intersectObject(groundMesh);
  if (hits.length > 0) {
    return hits[0].point.y;
  }
  return 0;
}

export function createWorld(scene) {
  // Ground plane (higher subdivision for smoother terrain)
  const groundGeo = new THREE.PlaneGeometry(MAP_SIZE * 2, MAP_SIZE * 2, 64, 64);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x5a8f3c });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  groundMesh = ground;
  groundRaycaster = new THREE.Raycaster();

  // Add some terrain variation (low poly hills)
  const vertices = groundGeo.attributes.position;
  const seed = 42;
  const mountains = getResourceMountains();
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i);
    const y = vertices.getY(i);
    let noise = seededNoise(x * 0.05, y * 0.05, seed) * 1.5;
    // Add gentle mounds at resource mountain locations
    // Ground plane is rotated -PI/2, so plane X,Y = world X,Z
    for (const mt of mountains) {
      const dx = x - mt.x;
      const dy = y - mt.z;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 30) {
        const falloff = 1 - dist / 30;
        noise += falloff * falloff * 3;
      }
    }
    vertices.setZ(i, noise);
  }
  groundGeo.computeVertexNormals();

  // Dirt paths (darker ground patches)
  for (let i = 0; i < 8; i++) {
    const px = seededRandom(seed + i * 100) * MAP_SIZE * 1.4 - MAP_SIZE * 0.7;
    const pz = seededRandom(seed + i * 100 + 50) * MAP_SIZE * 1.4 - MAP_SIZE * 0.7;
    const size = 10 + seededRandom(seed + i * 100 + 25) * 15;
    const patchGeo = new THREE.CircleGeometry(size, 6);
    const patchMat = new THREE.MeshLambertMaterial({ color: 0x8B7355 });
    const patch = new THREE.Mesh(patchGeo, patchMat);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(px, 0.02, pz);
    scene.add(patch);
  }

  // Trees (low poly)
  for (let i = 0; i < 40; i++) {
    const tx = seededRandom(seed + i * 200) * MAP_SIZE * 1.6 - MAP_SIZE * 0.8;
    const tz = seededRandom(seed + i * 200 + 100) * MAP_SIZE * 1.6 - MAP_SIZE * 0.8;
    // Don't place trees near center (spawn) or near sell points
    if (Math.abs(tx) < 15 && Math.abs(tz) < 15) continue;
    if (SELL_POINTS.some(sp => Math.hypot(sp.x - tx, sp.z - tz) < 12)) continue;
    createTree(scene, tx, tz, seed + i);
  }

  // Rocks
  for (let i = 0; i < 20; i++) {
    const rx = seededRandom(seed + i * 300) * MAP_SIZE * 1.6 - MAP_SIZE * 0.8;
    const rz = seededRandom(seed + i * 300 + 150) * MAP_SIZE * 1.6 - MAP_SIZE * 0.8;
    if (Math.abs(rx) < 10 && Math.abs(rz) < 10) continue;
    createRock(scene, rx, rz, seed + i);
  }

  // Sell points
  const sellPointMeshes = [];
  SELL_POINTS.forEach((sp) => {
    const mesh = createSellPoint(scene, sp.x, sp.z);
    sellPointMeshes.push({ ...sp, mesh });
  });

  // Map border fences
  createBorders(scene);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(50, 80, 30);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 200;
  dirLight.shadow.camera.left = -100;
  dirLight.shadow.camera.right = 100;
  dirLight.shadow.camera.top = 100;
  dirLight.shadow.camera.bottom = -100;
  scene.add(dirLight);

  // Sky color
  scene.background = new THREE.Color(0x87CEEB);
  scene.fog = new THREE.Fog(0x87CEEB, 120, 250);

  return { sellPointMeshes };
}

function createTree(scene, x, z, seed) {
  const group = new THREE.Group();

  // Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 3, 5);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 1.5;
  trunk.castShadow = true;
  group.add(trunk);

  // Foliage (stacked cones)
  const scale = 0.8 + seededRandom(seed + 999) * 0.6;
  const colors = [0x2d8a4e, 0x3da55d, 0x228B22, 0x1a7a3a];
  const color = colors[Math.floor(seededRandom(seed + 888) * colors.length)];

  const foliageGeo1 = new THREE.ConeGeometry(2.5 * scale, 3, 6);
  const foliageMat = new THREE.MeshLambertMaterial({ color });
  const foliage1 = new THREE.Mesh(foliageGeo1, foliageMat);
  foliage1.position.y = 4;
  foliage1.castShadow = true;
  group.add(foliage1);

  const foliageGeo2 = new THREE.ConeGeometry(2 * scale, 2.5, 6);
  const foliage2 = new THREE.Mesh(foliageGeo2, foliageMat);
  foliage2.position.y = 5.5;
  foliage2.castShadow = true;
  group.add(foliage2);

  group.position.set(x, 0, z);
  scene.add(group);
}

function createRock(scene, x, z, seed) {
  const size = 0.5 + seededRandom(seed + 777) * 1.5;
  const geo = new THREE.DodecahedronGeometry(size, 0);
  const colors = [0x888888, 0x999999, 0x777777, 0xaaaaaa];
  const color = colors[Math.floor(seededRandom(seed + 666) * colors.length)];
  const mat = new THREE.MeshLambertMaterial({ color });
  const rock = new THREE.Mesh(geo, mat);
  rock.position.set(x, size * 0.4, z);
  rock.rotation.set(
    seededRandom(seed + 555) * Math.PI,
    seededRandom(seed + 444) * Math.PI,
    0
  );
  rock.castShadow = true;
  scene.add(rock);
}

function createSellPoint(scene, x, z) {
  const group = new THREE.Group();

  // Building base
  const baseGeo = new THREE.BoxGeometry(6, 4, 6);
  const baseMat = new THREE.MeshLambertMaterial({ color: 0xD2691E });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 2;
  base.castShadow = true;
  group.add(base);

  // Roof
  const roofGeo = new THREE.ConeGeometry(5, 2.5, 4);
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x8B0000 });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 5.25;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  // Sign pole
  const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 3, 6);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(4, 1.5, 0);
  group.add(pole);

  // Dollar sign (golden sphere on top)
  const signGeo = new THREE.SphereGeometry(0.6, 6, 4);
  const signMat = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(4, 3.5, 0);
  group.add(sign);

  // Glow ring around sell point
  const ringGeo = new THREE.RingGeometry(7, 7.5, 16);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xFFD700,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);

  group.position.set(x, 0, z);
  scene.add(group);
  return group;
}

function createBorders(scene) {
  const borderMat = new THREE.MeshLambertMaterial({ color: 0x654321 });
  const half = MAP_SIZE;
  const height = 3;
  const thickness = 1;

  const sides = [
    { x: 0, z: -half, sx: half * 2 + thickness, sz: thickness },
    { x: 0, z: half, sx: half * 2 + thickness, sz: thickness },
    { x: -half, z: 0, sx: thickness, sz: half * 2 + thickness },
    { x: half, z: 0, sx: thickness, sz: half * 2 + thickness },
  ];

  sides.forEach(({ x, z, sx, sz }) => {
    const geo = new THREE.BoxGeometry(sx, height, sz);
    const mesh = new THREE.Mesh(geo, borderMat);
    mesh.position.set(x, height / 2, z);
    mesh.castShadow = true;
    scene.add(mesh);
  });
}

// Seeded random number generator
function seededRandom(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function seededNoise(x, y, seed) {
  return seededRandom(x * 12.9898 + y * 78.233 + seed);
}
