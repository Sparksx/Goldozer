import * as THREE from 'three';
import { getTerrainHeight, isOnMainRoad } from './world.js';
import { loadModelWithMaterials } from './modelLoader.js';

export function createBulldozer(scene) {
  const group = new THREE.Group();

  // Placeholder box visible until model loads
  const placeholderGeo = new THREE.BoxGeometry(3.5, 2, 5.5);
  const placeholderMat = new THREE.MeshLambertMaterial({ color: 0xf5b731, transparent: true, opacity: 0.5 });
  const placeholder = new THREE.Mesh(placeholderGeo, placeholderMat);
  placeholder.position.y = 1.5;
  group.add(placeholder);

  scene.add(group);

  // Load the real model asynchronously
  loadModelWithMaterials('vehicles/bulldozer.obj', 'vehicles/bulldozer.mtl')
    .then(model => {
      group.remove(placeholder);
      placeholderGeo.dispose();
      placeholderMat.dispose();

      // Scale to match gameplay dimensions (~4.5 wide, ~6.5 long)
      // OBJ is 2.25 wide x 1.58 tall x 3.62 deep, scale ~2.2
      model.scale.set(2.2, 2.2, 2.2);

      // Center horizontally, lift so bottom sits at y=0
      // OBJ bottom is at y=-0.39, so after scale: -0.39*2.2 = -0.858
      model.position.set(0, 0.858, 0.45);

      // OBJ faces -Z by default, our game uses +Z as forward
      model.rotation.y = Math.PI;

      model.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      group.add(model);
    })
    .catch(err => {
      console.warn('Could not load bulldozer model, keeping placeholder:', err);
    });

  return {
    mesh: group,
    velocity: 0,
    angularVelocity: 0,
    rotation: 0,
  };
}

export function updateBulldozer(bulldozer, input, delta, speedBonus, mapSize) {
  const roadBonus = isOnMainRoad(bulldozer.mesh.position.x, bulldozer.mesh.position.z) ? 1.5 : 1;
  const speedMultiplier = (1 + speedBonus * 0.3) * roadBonus;
  const maxSpeed = 15 * speedMultiplier;
  const acceleration = 20 * speedMultiplier;
  const deceleration = 15;
  const turnSpeed = 2.0;

  // Forward/backward (analog-aware for mobile)
  const accelFactor = input.isAnalog ? (input.forward ? input.analogForward : input.analogBackward) : 1;
  if (input.forward) {
    const targetSpeed = maxSpeed * (input.isAnalog ? input.analogForward : 1);
    bulldozer.velocity = Math.min(bulldozer.velocity + acceleration * accelFactor * delta, targetSpeed);
  } else if (input.backward) {
    const targetSpeed = maxSpeed * 0.5 * (input.isAnalog ? input.analogBackward : 1);
    bulldozer.velocity = Math.max(bulldozer.velocity - acceleration * accelFactor * delta, -targetSpeed);
  } else {
    // Decelerate
    if (bulldozer.velocity > 0) {
      bulldozer.velocity = Math.max(0, bulldozer.velocity - deceleration * delta);
    } else if (bulldozer.velocity < 0) {
      bulldozer.velocity = Math.min(0, bulldozer.velocity + deceleration * delta);
    }
  }

  // Turning (only when moving), with analog smoothing for mobile
  if (Math.abs(bulldozer.velocity) > 0.5) {
    const turnFactor = Math.sign(bulldozer.velocity);
    if (input.left) {
      const turnIntensity = input.isAnalog ? input.analogLeft : 1;
      bulldozer.rotation += turnSpeed * delta * turnFactor * turnIntensity;
    }
    if (input.right) {
      const turnIntensity = input.isAnalog ? input.analogRight : 1;
      bulldozer.rotation -= turnSpeed * delta * turnFactor * turnIntensity;
    }
  }

  // Apply movement
  const moveX = Math.sin(bulldozer.rotation) * bulldozer.velocity * delta;
  const moveZ = Math.cos(bulldozer.rotation) * bulldozer.velocity * delta;

  let newX = bulldozer.mesh.position.x + moveX;
  let newZ = bulldozer.mesh.position.z + moveZ;

  // Clamp to map bounds
  const bound = mapSize - 3;
  newX = Math.max(-bound, Math.min(bound, newX));
  newZ = Math.max(-bound, Math.min(bound, newZ));

  bulldozer.mesh.position.x = newX;
  bulldozer.mesh.position.z = newZ;

  // Keep bulldozer on top of terrain
  const terrainY = getTerrainHeight(newX, newZ);
  bulldozer.mesh.position.y = terrainY;

  bulldozer.mesh.rotation.y = bulldozer.rotation;
}

// Pre-allocated vectors to avoid GC pressure in the game loop
const _camOffset = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _camLookAhead = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);

export function updateCamera(camera, bulldozer) {
  // Camera behind and above (like a balloon on a string)
  _camOffset.set(0, 12, -18);
  _camOffset.applyAxisAngle(_yAxis, bulldozer.rotation);

  _camTarget.set(
    bulldozer.mesh.position.x + _camOffset.x,
    bulldozer.mesh.position.y + _camOffset.y,
    bulldozer.mesh.position.z + _camOffset.z
  );

  // Smooth follow with slight lag (balloon on string feel)
  camera.position.lerp(_camTarget, 0.04);

  // Look ahead of the bulldozer so player can see what's coming
  _camLookAhead.set(0, 0, 8);
  _camLookAhead.applyAxisAngle(_yAxis, bulldozer.rotation);

  camera.lookAt(
    bulldozer.mesh.position.x + _camLookAhead.x,
    bulldozer.mesh.position.y + 2,
    bulldozer.mesh.position.z + _camLookAhead.z
  );
}
