import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// DRACOLoader is a dependency for compressed GLB files, which are common.
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * Loads a GLB file and extracts the first available mesh.
 * @param {File} file - The GLB file object from a file input.
 * @returns {Promise<THREE.Mesh>} - A promise that resolves with the first mesh found.
 */
async function loadMeshFromGlb(file) {
  const loader = new GLTFLoader();
  
  // Setup DracoLoader
  const dracoLoader = new DRACOLoader();
  // You must host these decoder files on your server
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
  loader.setDRACOLoader(dracoLoader);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      loader.parse(event.target.result, '', (gltf) => {
        let mesh = null;
        gltf.scene.traverse((child) => {
          if (child.isMesh && !mesh) {
            // Found the first mesh, let's use it.
            mesh = child;
          }
        });
        if (mesh) {
          resolve(mesh);
        } else {
          reject(new Error('No mesh found in the GLB file.'));
        }
      }, (error) => {
        reject(new Error(`Failed to parse GLB file: ${error.message}`));
      });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Voxelizes a THREE.Mesh object.
 * This function samples points within the mesh's bounding box and uses raycasting
 * to determine if a point is "inside" the mesh.
 * @param {THREE.Mesh} mesh - The mesh to voxelize.
 * @param {number} resolution - The number of voxels along the longest axis. Higher is more detailed.
 * @returns {Array<Object>} - An array of voxel data [{ x, y, z, color }].
 */
function voxelizeMesh(mesh, resolution = 20) {
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox;
  const size = box.getSize(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const voxelSize = maxDim / resolution;
  
  const voxels = [];
  const raycaster = new THREE.Raycaster();
  const direction = new THREE.Vector3(1, 0, 0); // Cast rays along the positive X-axis

  console.log(`Starting voxelization with resolution ${resolution} (voxel size: ${voxelSize})...`);

  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      for (let k = 0; k < resolution; k++) {
        
        // Calculate the center of the potential voxel
        const point = new THREE.Vector3(
          box.min.x + (i + 0.5) * voxelSize,
          box.min.y + (j + 0.5) * voxelSize,
          box.min.z + (k + 0.5) * voxelSize
        );

        // Check if the point is inside the mesh by casting a ray
        raycaster.set(point, direction);
        const intersects = raycaster.intersectObject(mesh, false);

        // If the number of intersections is odd, the point is inside
        if (intersects.length % 2 === 1) {
          
          // For color, we'll just use the material's base color for simplicity.
          // A more advanced version could sample a texture.
          const color = mesh.material.isMeshStandardMaterial ? mesh.material.color : new THREE.Color(0xffffff);

          voxels.push({
            x: Math.round(point.x / voxelSize),
            y: Math.round(point.y / voxelSize),
            z: Math.round(point.z / voxelSize),
            color: color
          });
        }
      }
    }
  }

  // Center the resulting voxels around the origin
  if (voxels.length > 0) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    voxels.forEach(v => {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      minZ = Math.min(minZ, v.z);
    });
    const centerX = Math.round(minX + (Math.max(...voxels.map(v=>v.x)) - minX) / 2);
    const centerY = Math.round(minY + (Math.max(...voxels.map(v=>v.y)) - minY) / 2);
    const centerZ = Math.round(minZ + (Math.max(...voxels.map(v=>v.z)) - minZ) / 2);
    
    voxels.forEach(v => {
      v.x -= centerX;
      v.y -= centerY;
      v.z -= centerZ;
    });
  }

  console.log(`Voxelization complete. Generated ${voxels.length} voxels.`);
  return voxels;
}

/**
 * Main function: Loads a GLB file and processes it into voxel data.
 * @param {File} file - The GLB file from an input.
 * @param {Object} options - Containing options like 'resolution'.
 * @returns {Promise<Array<Object>>} A promise that resolves with the voxel array.
 */
export async function processGlbToVoxels(file, options = {}) {
  const resolution = options.resolution || 25; // Default resolution

  if (!file || !file.name.toLowerCase().endsWith('.glb')) {
    throw new Error('Please select a valid .glb file.');
  }

  try {
    const mesh = await loadMeshFromGlb(file);
    const voxels = voxelizeMesh(mesh, resolution);
    return voxels;
  } catch (error) {
    console.error('[GLB Processor] Error:', error);
    throw error; // Re-throw to be caught by the UI layer
  }
} 