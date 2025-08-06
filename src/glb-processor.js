import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// loadMeshFromGlb 函数保持不变...
async function loadMeshFromGlb(file) {
  // ... (此部分代码与之前完全相同)
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
  loader.setDRACOLoader(dracoLoader);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      loader.parse(event.target.result, '', (gltf) => {
        let mesh = null;
        gltf.scene.traverse((child) => {
          if (child.isMesh && !mesh) {
            mesh = child;
          }
        });
        if (mesh) {
          resolve(mesh);
        } else {
          reject(new Error('No mesh found in the GLB file.'));
        }
      }, (error) => reject(new Error(`Failed to parse GLB file: ${error.message}`)));
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * [高效版] 使用表面采样和扫描线填充算法来体素化网格。
 * @param {THREE.Mesh} mesh - 要体素化的网格。
 * @param {number} resolution - 沿最长轴的体素数量。
 * @returns {Array<Object>} - 体素数据数组 [{ x, y, z, color }]。
 */
function voxelizeMesh(mesh, resolution = 30) {
  // 确保应用了世界变换，并将几何体居中
  mesh.updateWorldMatrix(true, true);
  const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
  geometry.center();
  geometry.computeBoundingBox();

  const box = geometry.boundingBox;
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const voxelSize = maxDim / resolution;

  const surfaceVoxels = new Set();
  const positionAttribute = geometry.getAttribute('position');
  
  console.log(`[Fast Voxelizer] Step 1: Generating surface voxels...`);
  // 步骤1: 体素化网格表面 (只在顶点处放置体素)
  // 这是一个快速获得物体外壳的方法
  for (let i = 0; i < positionAttribute.count; i++) {
    const pt = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
    const x = Math.round(pt.x / voxelSize);
    const y = Math.round(pt.y / voxelSize);
    const z = Math.round(pt.z / voxelSize);
    surfaceVoxels.add(`${x},${y},${z}`);
  }

  const allVoxels = new Set(surfaceVoxels);
  const color = mesh.material.isMeshStandardMaterial ? mesh.material.color : new THREE.Color(0xcccccc);
  
  // 创建一个按Y和Z分组的映射，以便于扫描
  const yzMap = {};
  surfaceVoxels.forEach(key => {
    const [x, y, z] = key.split(',').map(Number);
    const yzKey = `${y},${z}`;
    if (!yzMap[yzKey]) {
      yzMap[yzKey] = [];
    }
    yzMap[yzKey].push(x);
  });

  console.log(`[Fast Voxelizer] Step 2: Filling interior using scanline algorithm...`);
  // 步骤2: 使用扫描线算法填充内部
  for (const yzKey in yzMap) {
    const xCoords = yzMap[yzKey];
    if (xCoords.length < 2) continue;

    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);

    for (let x = minX + 1; x < maxX; x++) {
      allVoxels.add(`${x},${yzKey}`);
    }
  }

  // 将Set转换为最终的数组格式
  const finalVoxels = Array.from(allVoxels).map(key => {
    const [x, y, z] = key.split(',').map(Number);
    return { x, y, z, color };
  });

  console.log(`[Fast Voxelizer] Voxelization complete. Generated ${finalVoxels.length} voxels.`);
  return finalVoxels;
}

// 主函数 processGlbToVoxels 保持不变，它会调用新的 voxelizeMesh
export async function processGlbToVoxels(file, options = {}) {
  const resolution = options.resolution || 30; // 可以适当提高默认分辨率了
  if (!file || !file.name.toLowerCase().endsWith('.glb')) {
    throw new Error('Please select a valid .glb file.');
  }

  try {
    const mesh = await loadMeshFromGlb(file);
    const voxels = voxelizeMesh(mesh, resolution);
    return voxels;
  } catch (error) {
    console.error('[GLB Processor] Error:', error);
    throw error;
  }
}
