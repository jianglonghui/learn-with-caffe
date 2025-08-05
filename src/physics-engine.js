// --- START OF REPLACEMENT FILE: physics-engine.js ---

import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// This class now acts as a bridge between Three.js and the Cannon-es physics world.
class PhysicsEngine {
  constructor() {
    // 1. Setup the Cannon-es World
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0); // Set gravity

    // Use a more robust solver for better stacking stability
    this.world.solver.iterations = 10;
    
    // Performance setting: allow bodies to "sleep" when they are not moving
    this.world.allowSleep = true;

    // 2. Create a static ground plane
    // This is much more stable than checking a Y coordinate.
    const groundMaterial = new CANNON.Material('ground');
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC, // Static bodies don't move
      shape: new CANNON.Plane(),
      material: groundMaterial
    });
    // Rotate the plane to be horizontal
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);

    // 3. Map to link Three.js meshes to Cannon-es bodies
    // This allows us to easily find the physics body for a given mesh.
    this.objectMap = new Map();
  }

  /**
   * Adds a Three.js object to the physics simulation.
   * @param {THREE.Object3D} object - The Three.js mesh/group to add.
   */
  addObject(object) {
    // Get properties from the Three.js object's userData
    const mass = object.userData.mass || 1;
    const restitution = object.userData.restitution || 0.3;
    const friction = 0.5; // A reasonable default friction

    // Create a Cannon.js Material for the object
    const material = new CANNON.Material();

    // --- Shape Calculation ---
    // We create a single bounding box shape that covers the entire voxel object.
    // This is a massive improvement over the old AABB check because this box
    // rotates with the object, leading to much more accurate collisions.
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    // Cannon.js Box shape takes half-extents (half the width, height, depth)
    const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);

    const shape = new CANNON.Box(halfExtents);
    
    // Create the Cannon.js Body
    const body = new CANNON.Body({
      mass: mass,
      shape: shape,
      position: new CANNON.Vec3().copy(object.position),
      quaternion: new CANNON.Quaternion().copy(object.quaternion),
      material: material,
      // Let objects sleep to save performance when they are at rest
      allowSleep: true,
      sleepTimeLimit: 0.5, // Time in seconds until it can sleep
    });

    this.world.addBody(body);
    this.objectMap.set(object, body);
  }

  /**
   * Removes an object from the physics simulation.
   * @param {THREE.Object3D} object - The Three.js mesh/group to remove.
   */
  removeObject(object) {
    const body = this.objectMap.get(object);
    if (body) {
      this.world.removeBody(body);
      this.objectMap.delete(object);
    }
  }

  /**
   * Sets the dragging state for an object.
   * When dragged, an object becomes "kinematic", meaning it's not affected
   * by physics but can still push other objects around.
   * @param {THREE.Object3D} object - The object being dragged.
   * @param {boolean} isDragging - The new dragging state.
   */
  setDragging(object, isDragging) {
    const body = this.objectMap.get(object);
    if (body) {
      if (isDragging) {
        // Set to Kinematic: Not affected by forces, moved manually
        body.type = CANNON.Body.KINEMATIC;
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
      } else {
        // Set back to Dynamic: Affected by gravity and collisions
        body.type = CANNON.Body.DYNAMIC;
        // The object's velocity will be determined by its movement before release,
        // but for a simple drag-and-drop, resetting is fine.
        body.wakeUp(); // Ensure the body is active in the simulation
      }
    }
  }

  /**
   * The main update loop. This should be called every frame.
   * It steps the physics world and synchronizes the Three.js meshes.
   * @param {number} deltaTime - The time elapsed since the last frame.
   */
  update(deltaTime) {
    // We use a fixed timestep for stability. 1/60 is a good standard (60 FPS).
    const fixedTimeStep = 1 / 60;
    
    // Step the physics world
    this.world.step(fixedTimeStep, deltaTime, 3);

    // --- Synchronization ---
    // Copy the positions and rotations from Cannon-es bodies to Three.js meshes.
    for (const [mesh, body] of this.objectMap.entries()) {
      
      // If the body is kinematic, it means we are dragging it.
      // We must update the physics body's position FROM the mesh's position.
      if (body.type === CANNON.Body.KINEMATIC) {
        body.position.copy(mesh.position);
        body.quaternion.copy(mesh.quaternion);
      }
      
      // If the body is sleeping, it hasn't moved, so we can skip updating it.
      // This is a great performance optimization.
      if (body.sleepState === CANNON.Body.SLEEPING) {
          continue;
      }
      
      // For all other (dynamic) bodies, update the mesh's position
      // FROM the physics body's position.
      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);
    }
  }

  /**
   * Removes all objects from the physics world.
   */
  clear() {
    // A more robust way to clear the world than just iterating
    while (this.world.bodies.length > 0) {
      this.world.removeBody(this.world.bodies[0]);
    }
    this.objectMap.clear();
  }
}

export default PhysicsEngine;

// --- END OF REPLACEMENT FILE ---```