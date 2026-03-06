import * as THREE from 'three';

export function createBulldozer(scene) {
  const group = new THREE.Group();

  // Main body
  const bodyGeo = new THREE.BoxGeometry(2.5, 1.2, 4);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xE8A317 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.2;
  body.castShadow = true;
  group.add(body);

  // Cabin
  const cabinGeo = new THREE.BoxGeometry(2, 1.4, 2);
  const cabinMat = new THREE.MeshLambertMaterial({ color: 0xF5C518 });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.set(0, 2.5, -0.3);
  cabin.castShadow = true;
  group.add(cabin);

  // Cabin windows
  const windowMat = new THREE.MeshLambertMaterial({ color: 0x88CCFF });
  const windowFront = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), windowMat);
  windowFront.position.set(0, 2.6, 0.72);
  group.add(windowFront);

  // Blade (front)
  const bladeGeo = new THREE.BoxGeometry(3.5, 1.5, 0.3);
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  blade.position.set(0, 0.75, 2.3);
  blade.castShadow = true;
  group.add(blade);

  // Blade side plates
  const sidePlateGeo = new THREE.BoxGeometry(0.3, 1.5, 0.8);
  const leftPlate = new THREE.Mesh(sidePlateGeo, bladeMat);
  leftPlate.position.set(-1.6, 0.75, 1.95);
  group.add(leftPlate);
  const rightPlate = new THREE.Mesh(sidePlateGeo, bladeMat);
  rightPlate.position.set(1.6, 0.75, 1.95);
  group.add(rightPlate);

  // Tracks (left and right)
  const trackGeo = new THREE.BoxGeometry(0.6, 0.8, 4.5);
  const trackMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const leftTrack = new THREE.Mesh(trackGeo, trackMat);
  leftTrack.position.set(-1.5, 0.4, 0);
  leftTrack.castShadow = true;
  group.add(leftTrack);
  const rightTrack = new THREE.Mesh(trackGeo, trackMat);
  rightTrack.position.set(1.5, 0.4, 0);
  rightTrack.castShadow = true;
  group.add(rightTrack);

  // Track wheels
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.65, 8);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  [-1.5, 1.5].forEach(xOff => {
    [-1.5, 0, 1.5].forEach(zOff => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(xOff, 0.4, zOff);
      group.add(wheel);
    });
  });

  // Exhaust pipe
  const exhaustGeo = new THREE.CylinderGeometry(0.12, 0.15, 1.5, 6);
  const exhaustMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
  const exhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
  exhaust.position.set(-0.8, 3.0, -1.0);
  group.add(exhaust);

  scene.add(group);

  return {
    mesh: group,
    velocity: 0,
    angularVelocity: 0,
    rotation: 0,
  };
}

export function updateBulldozer(bulldozer, input, delta, upgrades, mapSize) {
  const speedMultiplier = 1 + upgrades.speed * 0.3;
  const maxSpeed = 15 * speedMultiplier;
  const acceleration = 20 * speedMultiplier;
  const deceleration = 15;
  const turnSpeed = 2.0;

  // Forward/backward
  if (input.forward) {
    bulldozer.velocity = Math.min(bulldozer.velocity + acceleration * delta, maxSpeed);
  } else if (input.backward) {
    bulldozer.velocity = Math.max(bulldozer.velocity - acceleration * delta, -maxSpeed * 0.5);
  } else {
    // Decelerate
    if (bulldozer.velocity > 0) {
      bulldozer.velocity = Math.max(0, bulldozer.velocity - deceleration * delta);
    } else if (bulldozer.velocity < 0) {
      bulldozer.velocity = Math.min(0, bulldozer.velocity + deceleration * delta);
    }
  }

  // Turning (only when moving)
  if (Math.abs(bulldozer.velocity) > 0.5) {
    const turnFactor = Math.sign(bulldozer.velocity);
    if (input.left) {
      bulldozer.rotation += turnSpeed * delta * turnFactor;
    }
    if (input.right) {
      bulldozer.rotation -= turnSpeed * delta * turnFactor;
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
  bulldozer.mesh.rotation.y = bulldozer.rotation;
}

export function updateCamera(camera, bulldozer) {
  const offset = new THREE.Vector3(0, 14, -22);
  offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), bulldozer.rotation);

  const targetPos = new THREE.Vector3(
    bulldozer.mesh.position.x + offset.x,
    bulldozer.mesh.position.y + offset.y,
    bulldozer.mesh.position.z + offset.z
  );

  camera.position.lerp(targetPos, 0.05);
  camera.lookAt(
    bulldozer.mesh.position.x,
    bulldozer.mesh.position.y + 1,
    bulldozer.mesh.position.z
  );
}
